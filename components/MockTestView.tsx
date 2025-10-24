
import React, { useState, useEffect } from 'react';
import { generateMockTest, analyzeFullMockTestStream, getApiErrorMessage } from '../services/geminiService';
import { View, MockTestFormat, MockTestQuestion, SubjectiveAnswer, ScoreRecord } from '../types';
import Spinner from './Spinner';
import SkeletonLoader from './SkeletonLoader';
import ErrorMessage from './ErrorMessage';
import { extractFinalJson } from '../testUtils';

declare global {
  interface Window {
    marked: {
      parse(markdown: string): string;
    };
  }
}

// Component for a single Text/Image Question
const TextQuestionComponent: React.FC<{
    question: MockTestQuestion;
    questionNumber: number;
    answer: SubjectiveAnswer;
    onAnswerChange: (answer: SubjectiveAnswer) => void;
    isSubmitted: boolean;
}> = ({ question, questionNumber, answer, onAnswerChange, isSubmitted }) => {

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onAnswerChange({ ...answer, text: e.target.value });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            if (answer.imagePreview) {
                URL.revokeObjectURL(answer.imagePreview);
            }
            onAnswerChange({
                ...answer,
                image: file,
                imagePreview: URL.createObjectURL(file)
            });
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg mt-4">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
                Q{questionNumber}: {question.question} <span className="font-normal text-sm text-slate-500">({question.marks} Marks)</span>
            </p>
            <div className="no-print">
                <div className="mt-4 space-y-4">
                <textarea
                    className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows={5}
                    placeholder="Type your answer here..."
                    value={answer.text || ''}
                    onChange={handleTextChange}
                    disabled={isSubmitted}
                />
                <div className="text-center text-slate-500 dark:text-slate-400 font-semibold">OR</div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Upload handwritten answer:</label>
                    <input
                        type="file" accept="image/*"
                        onChange={handleImageChange}
                        className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={isSubmitted}
                    />
                    {answer.imagePreview && <img src={answer.imagePreview} alt="Answer preview" className="mt-2 rounded-md max-h-48" />}
                </div>
                </div>
            </div>
        </div>
    );
};


const MockTestView: React.FC<{ 
  sectionName: string; 
  subjectName: string; 
  setView: (view: View) => void;
  onSaveScore: (scoreData: Omit<ScoreRecord, 'id' | 'date'>) => void;
  setIsViewDirty: (isDirty: boolean) => void;
}> = ({ sectionName, subjectName, setView, onSaveScore, setIsViewDirty }) => {
  const [testData, setTestData] = useState<MockTestFormat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: SubjectiveAnswer }>({});
  
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState('');
  const [finalScore, setFinalScore] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsViewDirty(false);
        const generatedTest = await generateMockTest(sectionName, subjectName);
        
        const parsedTest = JSON.parse(generatedTest);
        setTestData(parsedTest);
        setIsViewDirty(true);

      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to generate mock test. The format might be invalid or incomplete.'));
        setIsViewDirty(false);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
    
    return () => {
        setIsViewDirty(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionName, subjectName]);

  const handleAnswerChange = (key: string, value: SubjectiveAnswer) => {
    setAnswers(prev => ({...prev, [key]: value}));
  };

  const handleFinishTest = () => {
    if (!testData) return;
    if (!window.confirm("Are you sure you want to submit your test for grading? You won't be able to change your answers.")) return;
    
    setIsViewDirty(false);
    setIsTestFinished(true);
    setIsAnalyzing(true);
    setAnalysisReport('');
    let fullReport = '';

    analyzeFullMockTestStream(
        testData,
        answers,
        (chunk) => {
            fullReport += chunk;
            setAnalysisReport(prev => prev + chunk);
        },
        () => { // onComplete
            setIsAnalyzing(false);
            const reportJson = extractFinalJson(fullReport);
            if (reportJson && reportJson.final_score_report) {
                const score = reportJson.final_score_report.score;
                setFinalScore(score);
                onSaveScore({
                    testCategory: `Mock Test: ${subjectName}`,
                    score: score,
                    totalMarks: 80
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

  let questionCounter = 0;
  const totalQuestions = testData ? testData.sections.reduce((acc, s) => acc + s.questions.length, 0) : 0;
  // Fix: Explicitly type parameter in `filter` to avoid potential TypeScript inference issues.
  const answeredQuestions = Object.values(answers).filter((a: SubjectiveAnswer) => a.text?.trim() || a.image).length;
  const allAnswered = totalQuestions > 0 && answeredQuestions === totalQuestions;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2 print:mt-0">Mock Test: {subjectName}</h2>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 no-print">{sectionName}</p>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 min-h-[300px] printable-content">
        {loading && <SkeletonLoader type="text" />}
        {error && <ErrorMessage title="Failed to Generate Mock Test" message={error} />}
        
        {testData && !isTestFinished && (
          <div>
            <div className="text-center border-b pb-4 mb-6 border-slate-200 dark:border-slate-700">
                <h1 className="text-2xl font-bold">{testData.title}</h1>
                <p className="text-slate-600 dark:text-slate-400">{testData.subject}</p>
                <div className="flex justify-center gap-6 mt-2">
                    <span>Total Marks: {testData.totalMarks}</span>
                    <span>Duration: {testData.duration}</span>
                </div>
            </div>
            {testData.sections?.map((section, secIndex) => {
                return (
                    <div key={secIndex} className="mb-8">
                        <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 border-b border-blue-200 dark:border-blue-700 pb-2">{section.title}</h3>
                        <p className="text-sm italic text-slate-500 dark:text-slate-400 mt-2 mb-4">{section.instructions}</p>
                        <div className="space-y-6">
                            {section.questions?.map((q, qIndex) => {
                                questionCounter++;
                                const questionKey = `${secIndex}-${qIndex}`;
                                return <TextQuestionComponent 
                                            key={questionKey} 
                                            question={q} 
                                            questionNumber={questionCounter} 
                                            answer={answers[questionKey] || {}}
                                            onAnswerChange={(newAnswer) => handleAnswerChange(questionKey, newAnswer)}
                                            isSubmitted={isTestFinished}
                                        />
                            })}
                        </div>
                    </div>
                )
            })}
             <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                <button
                    onClick={handleFinishTest}
                    disabled={!allAnswered || isTestFinished}
                    className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg transition-colors"
                >
                    Submit for AI Correction
                </button>
                {!allAnswered && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Please answer all {totalQuestions} questions to submit the test.</p>}
            </div>
          </div>
        )}
        
        {isTestFinished && (
             <div>
                {finalScore !== null && (
                    <div className="mb-6 p-6 bg-blue-100 dark:bg-blue-900/50 rounded-lg shadow-inner text-center">
                        <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200">Test Graded!</h3>
                        <p className="mt-2 text-lg text-slate-700 dark:text-slate-300">
                            Your Final Score: <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{finalScore}</span> / 80
                        </p>
                    </div>
                )}
                 <div className="p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-2xl mb-4">Detailed Performance Analysis</h4>
                    {isAnalyzing && !analysisReport && <Spinner />}
                    <article 
                        className="mt-2 text-slate-700 dark:text-slate-300 prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: window.marked.parse(analysisReport) }}
                    />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MockTestView;