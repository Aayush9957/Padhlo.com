
import React, { useState, useEffect } from 'react';
// Fix: Updated imports to use exported modules from geminiService.
import { TestGenerator, AnswerAnalyzer, getApiErrorMessage } from '../services/geminiService';
import { View, ScoreRecord, SubjectiveAnswer } from '../types';
import Spinner from './Spinner';
import SkeletonLoader from './SkeletonLoader';
import ErrorMessage from './ErrorMessage';
import { extractFinalJson } from '../testUtils';
import MarkdownContent from './MarkdownContent';

interface LongAnswerViewProps {
  sectionName: string;
  subjectName: string;
  chapters: string[];
  setView: (view: View) => void;
  onSaveScore: (scoreData: Omit<ScoreRecord, 'id' | 'date'>) => void;
  setIsViewDirty: (isDirty: boolean) => void;
}

const LongAnswerView: React.FC<LongAnswerViewProps> = ({ sectionName, subjectName, chapters, setView, onSaveScore, setIsViewDirty }) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ [key: number]: SubjectiveAnswer }>({});
  
  const [modelAnswers, setModelAnswers] = useState<{ [key: number]: { loading: boolean; answer: string | null; error: string | null; isComplete: boolean; visible: boolean } }>({});
  
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState('');
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const fetchQuestions = async () => {
    setIsViewDirty(false);
    setLoading(true);
    setError(null);
    try {
      // Fix: Prefixed with the exported TestGenerator module.
      const generated = await TestGenerator.generateLongAnswerQuestions(sectionName, subjectName, chapters, 6);
      setQuestions(JSON.parse(generated));
      setAnswers({});
      setIsTestFinished(false);
      setAnalysisReport('');
      setFinalScore(null);
      setIsViewDirty(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to generate questions. Please try again.'));
      setIsViewDirty(false);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();

    return () => {
        setIsViewDirty(false); // Cleanup on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionName, subjectName, JSON.stringify(chapters)]);

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
    setIsViewDirty(false);
    setIsTestFinished(true);
    setIsAnalyzing(true);
    setAnalysisReport('');
    let fullReport = '';

    // Fix: Prefixed with the exported AnswerAnalyzer module.
    AnswerAnalyzer.analyzeSubjectiveTestStream(
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
                onSaveScore({
                    testCategory: `Long Answer Practice: ${subjectName}`,
                    score: score,
                    totalMarks: 30
                });
            } else {
                console.error("Could not find or parse the final score report in the AI's response.");
            }
        },
        (errorMsg) => {
            setAnalysisReport(prev => `${prev}\n\n**Error during analysis:** ${errorMsg}`);
            setIsAnalyzing(false);
        }
    );
  };

  const handleGetModelAnswer = (index: number) => {
    setModelAnswers(prev => ({ ...prev, [index]: { loading: true, answer: '', error: null, isComplete: false, visible: true } }));

    // Fix: Prefixed with the exported AnswerAnalyzer module.
    AnswerAnalyzer.generateModelAnswerStream(
        questions[index], sectionName, subjectName,
        (chunk) => {
            setModelAnswers(prev => ({ ...prev, [index]: { ...prev[index], loading: false, answer: (prev[index]?.answer || '') + chunk }}));
        },
        () => { // onComplete
             setModelAnswers(prev => ({ ...prev, [index]: { ...prev[index], isComplete: true } }));
        },
        (errorMsg) => {
            setModelAnswers(prev => ({ ...prev, [index]: { ...prev[index], loading: false, error: errorMsg, isComplete: true } }));
        }
    );
  };
  
  // Fix: Explicitly type parameter in `every` to avoid potential TypeScript inference issues.
  const allAnswered = questions.length > 0 && Object.values(answers).every((a: SubjectiveAnswer) => a.text?.trim() || a.image);

  if (loading && questions.length === 0 && !error) {
      return (
          <div className="p-4 sm:p-6 lg:p-8">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Long Answer Practice: {subjectName}</h2>
              <SkeletonLoader type="card" count={6} />
          </div>
      )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-end items-center mb-4">
        <button
            onClick={fetchQuestions}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 transition-colors"
        >
            Start New Test
        </button>
      </div>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Long Answer Practice: {subjectName}</h2>
      
      {error && <ErrorMessage title="Failed to Load Questions" message={error} />}
      
      {!isTestFinished ? (
        <div className="space-y-8 mt-6">
            {questions.map((q, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{index + 1}. {q}</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            ))}
            {!error && !loading && (
                <div className="text-center">
                    <button onClick={handleFinishTest} disabled={!allAnswered} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg">
                        Finish & Submit for Analysis
                    </button>
                    {!allAnswered && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Please answer all questions to finish the test.</p>}
                </div>
            )}
            {loading && <Spinner />}
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
                <MarkdownContent content={analysisReport} className="mt-2 text-slate-700 dark:text-slate-300 prose dark:prose-invert max-w-none" />
            </div>
             <div className="mt-8">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Model Answers</h3>
                <div className="space-y-4">
                    {questions.map((q, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{index + 1}. {q}</p>
                            {!modelAnswers[index]?.visible ? (
                                <button onClick={() => handleGetModelAnswer(index)} className="mt-2 text-sm text-blue-600 hover:underline">
                                    Show Model Answer
                                </button>
                            ) : (
                                <div className="mt-2 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md border-l-4 border-blue-500">
                                    {modelAnswers[index].loading && <Spinner />}
                                    {modelAnswers[index].error && <ErrorMessage title="Error" message={modelAnswers[index].error!} />}
                                    {modelAnswers[index].answer && (
                                        <MarkdownContent content={modelAnswers[index].answer!} className="prose dark:prose-invert max-w-none" />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LongAnswerView;