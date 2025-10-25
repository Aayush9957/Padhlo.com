

import React, { useState } from 'react';
import { View, ToastType } from '../types';

// Define a type for feedback entries
interface FeedbackEntry {
  feedback: string;
  timestamp: string;
}

const FEEDBACK_STORAGE_KEY = 'padhlo-feedback';

interface FeedbackViewProps {
  setView: (view: View) => void;
  addToast: (message: string, type: ToastType) => void;
}

const FeedbackView: React.FC<FeedbackViewProps> = ({ setView, addToast }) => {
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedback.trim() === '') {
            addToast('Please enter your feedback before submitting.', 'error');
            return;
        }

        try {
            const feedbackHistoryRaw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
            const feedbackHistory: FeedbackEntry[] = feedbackHistoryRaw ? JSON.parse(feedbackHistoryRaw) : [];
            
            const newEntry: FeedbackEntry = {
                feedback,
                timestamp: new Date().toISOString(),
            };

            feedbackHistory.push(newEntry);
            localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbackHistory));

            setSubmitted(true);
            setFeedback('');
        } catch (error) {
            console.error("Failed to save feedback", error);
            addToast("Sorry, there was an error submitting your feedback.", 'error');
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 sm:p-8">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">Feedback & Suggestions</h2>
                
                {submitted ? (
                    <div className="text-center p-8 bg-green-50 dark:bg-green-900/50 rounded-lg">
                        <h3 className="text-2xl font-semibold text-green-700 dark:text-green-300">Thank you!</h3>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">Your feedback has been received. We appreciate you taking the time to help us improve.</p>
                        <button onClick={() => setSubmitted(false)} className="mt-6 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                            Submit More Feedback
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <p className="text-slate-600 dark:text-slate-400">
                            We value your opinion! Whether you have a suggestion, found a bug, or just want to share your thoughts, please let us know.
                        </p>
                        <div>
                            <label htmlFor="feedback" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Your Feedback
                            </label>
                            <textarea
                                id="feedback"
                                name="feedback"
                                rows={8}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Tell us what you think..."
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Submit Feedback
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FeedbackView;