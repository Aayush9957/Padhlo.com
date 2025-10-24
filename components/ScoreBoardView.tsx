





import React from 'react';
import { ScoreRecord, View } from '../types';

interface ScoreBoardViewProps {
    setView: (view: View) => void;
    scores: ScoreRecord[];
    onClearScores: () => void;
}

const ScoreBoardView: React.FC<ScoreBoardViewProps> = ({ setView, scores, onClearScores }) => {

    const handleClearHistory = () => {
        if (window.confirm("Are you sure you want to clear your entire test history? This action cannot be undone.")) {
            onClearScores();
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-end items-center mb-4">
                {scores.length > 0 && (
                    <button
                        onClick={handleClearHistory}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 transition-colors"
                    >
                        Clear History
                    </button>
                )}
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">Score Board</h2>
            
            {scores.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow">
                    <p className="text-slate-500 dark:text-slate-400">You haven't completed any tests yet.</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Your scores will appear here once you finish a practice session.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {scores.map(score => (
                            <li key={score.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex-grow">
                                        <p className="font-semibold text-lg text-blue-600 dark:text-blue-400">{score.testCategory}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {new Date(score.date).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <p className="text-xl font-bold text-slate-800 dark:text-slate-200 text-right">
                                            Score: {score.score} / {score.totalMarks}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ScoreBoardView;