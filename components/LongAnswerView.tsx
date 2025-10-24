

import React, { useState, useEffect } from 'react';
// Fix: Import `generateModelAnswerStream` which was missing.
import { generateLongAnswerQuestions, getApiErrorMessage, analyzeSubjectiveTestStream, generateModelAnswerStream } from '../services/geminiService';
import { View, ScoreRecord, SubjectiveAnswer } from '../types';
import Spinner from './Spinner';
import BackButton from './BackButton';
import SkeletonLoader from './SkeletonLoader';
import ErrorMessage from './ErrorMessage';
import { saveScore, extractFinalJson } from '../utils/testUtils';

// Add type definitions for window properties from CDNs to satisfy TypeScript
declare global {
  interface Window {
    marked: {
      parse(markdown: string): string;
    };
  }
}

const createStorageKey = (sectionName: string, subjectName: string, chapters: string[], testType: string): string => {
    const sortedChapters = [...chapters].sort().join(',');
    return `progress-${sectionName}-${subjectName}-${testType}-${sortedChapters}`;
};

const createCacheKey = (sectionName: string, subjectName: string, chapters: string[], testType: string): string => {
    const sortedChapters = [...chapters].sort().join(',');
    return `${testType}-${sectionName}-${subjectName}-${sortedChapters}`;
}

interface LongAnswerViewProps {
  sectionName: string;
  subjectName: string;
  chapters: string[];
  setView: (view: View) => void;
  goBack: () => void;
}

const LongAnswerView: React.FC<LongAnswerViewProps> = ({ sectionName, subjectName, chapters, setView, goBack }) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ [key: number]: SubjectiveAnswer }>({});
  
  // State for individual analysis (deprecated in test mode, but kept for model answers)
  const [modelAnswers, setModelAnswers] = useState<{ [key: number]: { loading: boolean; answer: string | null; error: string | null; isComplete: boolean; visible: boolean } }>({});
  
  // State for final test submission and report
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState('');
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const storageKey = createStorageKey(sectionName, subjectName, chapters, 'longAnswer');

  const fetchQuestions = async (replace: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const generated = await generateLongAnswerQuestions(sectionName, subjectName, chapters, 6);
      const newQuestions = JSON.parse(generated);
      if (replace) {
          setQuestions(newQuestions);
          setAnswers({});
          setIsTestFinished(false);
          setAnalysisReport('');
          setFinalScore(null);
      } else {
          setQuestions(prev => [...prev, ...newQuestions]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to generate questions. Please try again.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearProgress = () => {
    if (window.confirm("Are you sure you want to clear your progress and start a new test?")) {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(createCacheKey(sectionName, subjectName, chapters, 'longAnswer'));
        fetchQuestions(true);
    }
  };

  useEffect(() => {
    fetchQuestions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const handleTextChange = (index: number, text: string) => {
    setAnswers(prev => ({...prev, [index]: { ...prev[index], text }}));
  };
  
  const handleImageChange = (index: number, file: File | null) => {
    if (file) {
        if(answers[index]?.imagePreview) {
            URL.revokeObjectURL(answers[index]!.imagePreview!);
        }
        const imagePreview = URL.createObjectURL(file);
        setAnswers(prev => ({ ...prev, [index]: { ...prev[index], image: file, imagePreview }}));
    }
  };
  
  const handleFinishTest = () => {
    setIsTestFinished(true);
    setIsAnalyzing(true);
    setAnalysisReport('');
    let fullReport = '';

    analyzeSubjectiveTestStream(
        'Long Answer', 30, 5, questions, answers,
        (chunk) => {
            fullReport += chunk;
            setAnalysisReport(prev => prev + chunk);
        },
        () => {
            setIsAnalyzing(false);
            const reportJson = extractFinalJson(fullReport);
            if (reportJson && reportJson.final_score_report) {
                const score = reportJson.final_score_report.score;
                setFinalScore(score);
                saveScore({
                    testCategory: `Long Answer Practice: ${subjectName}`,
                    score: score,
                    totalMarks: 30
                });
            } else {
                console.error("Could not find or parse the final score report in the AI's response.");
            }
            localStorage.removeItem(storageKey);
        },
        (errorMsg) => {
            setAnalysisReport(prev => `${prev}\n\n**Error during analysis:** ${errorMsg}`);
            setIsAnalyzing(false);
        }
    );
  };
  
  const handleShowAnswer = (index: number) => {
    const current = modelAnswers[index];
    if (current?.isComplete) {
        setModelAnswers(prev => ({ ...prev, [index]: { ...current, visible: !current.visible } }));
        return;
    }
    if (!current?.loading) {
        setModelAnswers(prev => ({ ...prev, [index]: { loading: true, answer: '', error: null, isComplete: false, visible: true } }));
        generateModelAnswerStream(
          questions[index], sectionName, subjectName,
          (chunk) => setModelAnswers(prev => ({ ...prev, [index]: { ...prev[index]!, answer: (prev[index]?.answer || '') + chunk }})),
          (fullText) => setModelAnswers(prev => ({ ...prev, [index]: { ...prev[index]!, loading: false, isComplete: true, answer: fullText }})),
          (errorMsg) => setModelAnswers(prev => ({ ...prev, [index]: { ...prev[index]!, loading: false, error: errorMsg }}))
        );
    }
  };

  // Fix: Explicitly type `a` as `SubjectiveAnswer` to resolve TypeScript error.
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length && Object.values(answers).every((a: SubjectiveAnswer) => a.text?.trim() || a.image);

  if (loading && questions.length === 0 && !error) {
      return (
          <div className="p-4 sm:p-6 lg:p-8">
              <BackButton onClick={goBack} />
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Long Answer Practice: {subjectName}</h2>
              <SkeletonLoader type="card" count={6} />
          </div>
      )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center">
        <BackButton onClick={goBack} />
        <button
            onClick={handleClearProgress}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 transition-colors"
        >
            Start New Test
        </button>
      </div>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">Long Answer Practice: {subjectName}</h2>
      
      {error && <ErrorMessage title="Failed to Load Questions" message={error} />}
      
      {!isTestFinished ? (
        <div className="space-y-8 mt-6">
            {questions.map((q, index) => {
            const modelAnswer = modelAnswers[index];
            return (
            <div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{index + 1}. {q}</p>
                <div className="mt-4">
                <button 
                    onClick={() => handleShowAnswer(index)} 
                    disabled={modelAnswer?.loading}
                    className="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-semibold rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-900 transition-colors disabled:opacity-50"
                >
                    {modelAnswer?.loading ? 'Loading...' : (modelAnswer?.visible ? 'Hide Model Answer' : 'Show Model Answer')}
                </button>
                </div>
                {modelAnswer?.visible && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-slate-900/50 rounded-md border-l-4 border-blue-500">
                    <h4 className="font-bold text-blue-800 dark:text-blue-300">Model Answer</h4>
                    {modelAnswer.loading && !modelAnswer.answer && <Spinner />}
                    {modelAnswer.error && <p className="text-red-500">{modelAnswer.error}</p>}
                    {modelAnswer.answer && <div className="mt-2 text-slate-700 dark:text-slate-300 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: window.marked.parse(modelAnswer.answer) }} />}
                </div>
                )}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label htmlFor={`text-answer-${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type your answer:</label>
                      <textarea 
                          id={`text-answer-${index}`}
                          className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                          rows={5} 
                          placeholder="Type your answer here..." 
                          value={answers[index]?.text || ''} 
                          onChange={(e) => handleTextChange(index, e.target.value)} 
                      />
                  </div>
                  <div>
                      <label htmlFor={`image-answer-${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload handwritten work:</label>
                      <input 
                          id={`image-answer-${index}`}
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageChange(index, e.target.files ? e.target.files[0] : null)} 
                          className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                      />
                      {answers[index]?.imagePreview && (
                          <div className="mt-2">
                              <img src={answers[index]?.imagePreview} alt="Answer preview" className="rounded-md max-h-48 border border-slate-200 dark:border-slate-700" />
                              <p className="text-xs text-slate-500 mt-1">Image uploaded: {answers[index]?.image?.name}</p>
                          </div>
                      )}
                  </div>
                </div>
            </div>
            )})}
            {loading && <Spinner />}
            {!loading && questions.length > 0 && (
                <div className="text-center mt-8">
                    <button onClick={handleFinishTest} disabled={!allAnswered} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg">
                        Finish & Submit for Analysis
                    </button>
                    {!allAnswered && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Please answer all questions to finish the test.</p>}
                </div>
            )}
        </div>
      ) : (
        <div className="mt-6">
            {finalScore !== null && (
                <div className="mb-6 p-6 bg-blue-100 dark:bg-blue-900/50 rounded-lg shadow-inner text-center">
                    <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200">Test Complete!</h3>
                    <p className="mt-2 text-lg text-slate-700 dark:text-slate-300">
                        Your Score: <span className="font-bold text-blue-600 dark:text-blue-400">{finalScore}</span> out of <span className="font-bold">30</span>.
                    </p>
                </div>
            )}
             <div className="p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Performance Analysis</h4>
                {isAnalyzing && !analysisReport && <Spinner />}
                <article 
                    className="mt-2 text-slate-700 dark:text-slate-300 prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: window.marked.parse(analysisReport) }}
                />
            </div>
        </div>
      )}
    </div>
  );
};

export default LongAnswerView;