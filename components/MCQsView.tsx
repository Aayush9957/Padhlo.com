
import React, { useState, useEffect } from 'react';
// Fix: Updated imports to use exported modules from geminiService.
import { TestGenerator, AnswerAnalyzer, getApiErrorMessage } from '../services/geminiService';
import { View, MCQ, ScoreRecord } from '../types';
import Spinner from './Spinner';
import SkeletonLoader from './SkeletonLoader';
import ErrorMessage from './ErrorMessage';
import MarkdownContent from './MarkdownContent';

interface MCQsViewProps {
  sectionName: string;
  subjectName: string;
  chapters: string[];
  setView: (view: View) => void;
  onSaveScore: (scoreData: Omit<ScoreRecord, 'id' | 'date'>) => void;
  setIsViewDirty: (isDirty: boolean) => void;
}

const MCQsView: React.FC<MCQsViewProps> = ({ sectionName, subjectName, chapters, setView, onSaveScore, setIsViewDirty }) => {
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState<{ [key: number]: boolean }>({});
  const [score, setScore] = useState<number | null>(null);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState('');
  const [completionTime, setCompletionTime] = useState<string | null>(null);
  
  const fetchMCQs = async () => {
    setIsViewDirty(false);
    setLoading(true);
    setError(null);
    try {
      // Fix: Prefixed with the exported TestGenerator module.
      const generated = await TestGenerator.generateMCQs(sectionName, subjectName, chapters, 10);
      setMcqs(JSON.parse(generated));
      setSelectedAnswers({});
      setSubmitted({});
      setIsTestFinished(false);
      setAnalysisReport('');
      setScore(null);
      setCompletionTime(null);
      setIsViewDirty(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to generate MCQs. Please try again.'));
      setIsViewDirty(false);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMCQs();

    return () => {
        setIsViewDirty(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionName, subjectName, JSON.stringify(chapters)]);


  const handleSelectAnswer = (mcqIndex: number, answer: string) => {
    if (submitted[mcqIndex]) return;
    setSelectedAnswers(prev => ({...prev, [mcqIndex]: answer }));
  }
  
  const checkAnswer = (mcqIndex: number) => {
    if (!selectedAnswers[mcqIndex]) {
        alert("Please select an answer first.");
        return;
    }
    setSubmitted(prev => ({...prev, [mcqIndex]: true }));
  }

    const handleFinishTest = () => {
        setIsViewDirty(false);
        let correctCount = 0;
        mcqs.forEach((mcq, index) => {
            if (selectedAnswers[index] === mcq.correctAnswer) {
                correctCount++;
            }
        });
        setScore(correctCount);
        setCompletionTime(new Date().toLocaleString());
        setIsTestFinished(true);

        onSaveScore({
            testCategory: `MCQs Practice: ${subjectName}`,
            score: correctCount,
            totalMarks: 10,
        });

        setIsAnalyzing(true);
        setAnalysisReport('');
        // Fix: Prefixed with the exported AnswerAnalyzer module.
        AnswerAnalyzer.analyzeMCQPerformanceStream(
            mcqs,
            selectedAnswers,
            (chunk) => setAnalysisReport(prev => prev + chunk),
            () => setIsAnalyzing(false),
            (errorMsg) => {
                setAnalysisReport(`Analysis Error: ${errorMsg}`);
                setIsAnalyzing(false);
            }
        );
    };

  const getLabelClass = (mcqIndex: number, option: string) => {
    if (!submitted[mcqIndex]) {
      return 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600';
    }
    const isCorrect = mcqs[mcqIndex]?.correctAnswer === option;
    const isSelected = selectedAnswers[mcqIndex] === option;

    if (isCorrect) return 'bg-green-200 dark:bg-green-800 border-green-500';
    if (isSelected && !isCorrect) return 'bg-red-200 dark:bg-red-800 border-red-500';
    return 'bg-white dark:bg-slate-700 opacity-70';
  };
  
  const allSubmitted = !loading && mcqs.length > 0 && Object.keys(submitted).length === mcqs.length;

  if (loading && mcqs.length === 0 && !error) {
      return (
          <div className="p-4 sm:p-6 lg:p-8">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">MCQs Practice: {subjectName}</h2>
              <SkeletonLoader type="card" count={10} />
          </div>
      )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-end items-center mb-4">
            <button
                onClick={fetchMCQs}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 transition-colors"
            >
                Start New Test
            </button>
        </div>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">MCQs Practice: {subjectName}</h2>
      
      {error && <ErrorMessage title="Failed to Load MCQs" message={error} />}
      
      <div className="space-y-8 mt-6">
        {mcqs?.map((mcq, index) => (
          <div key={index} className={`bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md ${isTestFinished ? 'opacity-80' : ''}`}>
            <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{index + 1}. {mcq.question}</p>
            <div className="mt-4 space-y-3">
              {mcq.options?.map((option, optIndex) => (
                <label key={optIndex} className={`w-full text-left p-3 rounded-md border-2 transition-colors flex items-center cursor-pointer ${getLabelClass(index, option)}`}>
                  <input
                    type="radio"
                    name={`mcq-${index}`}
                    value={option}
                    checked={selectedAnswers[index] === option}
                    onChange={() => handleSelectAnswer(index, option)}
                    disabled={submitted[index] || isTestFinished}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-slate-800 dark:text-slate-200">{option}</span>
                </label>
              ))}
            </div>
            <div className="mt-4">
              {!submitted[index] && (
                <button 
                  onClick={() => checkAnswer(index)} 
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-slate-400"
                  disabled={!selectedAnswers[index] || isTestFinished}
                >
                  Check Answer
                </button>
              )}
              {submitted[index] && (
                <div className="mt-3">
                    {selectedAnswers[index] === mcqs[index].correctAnswer ? (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Correct!</p>
                    ) : (
                        <p className="text-sm text-red-500 dark:text-red-400 font-medium">
                            Incorrect. The correct answer is: <span className="font-bold">{mcqs[index].correctAnswer}</span>
                        </p>
                    )}
                    {mcqs[index].explanation && (
                        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md border-l-4 border-blue-500">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Explanation</h4>
                            <p className="mt-2 text-slate-700 dark:text-slate-300">{mcqs[index].explanation}</p>
                        </div>
                    )}
                </div>
              )}
            </div>
          </div>
        ))}

        {!isTestFinished && allSubmitted && (
            <div className="text-center mt-8">
                <button 
                    onClick={handleFinishTest}
                    className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg animate-pulse"
                >
                    Finish Test & See Report
                </button>
            </div>
        )}

        {isTestFinished && score !== null && (
            <div className="mt-8 p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg shadow-inner">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200">Test Complete!</h3>
                        {completionTime && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {completionTime}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Your Score</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {score}
                            <span className="text-lg font-medium text-slate-600 dark:text-slate-400"> / {mcqs.length}</span>
                        </p>
                    </div>
                </div>
            </div>
        )}

        {(isAnalyzing || analysisReport) && (
             <div className="mt-6 p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Performance Analysis</h4>
                {isAnalyzing && !analysisReport && <Spinner />}
                <MarkdownContent content={analysisReport} className="mt-2 text-slate-700 dark:text-slate-300 prose dark:prose-invert max-w-none" />
            </div>
        )}
        
        {loading && <Spinner />}
      </div>
    </div>
  );
};

export default MCQsView;