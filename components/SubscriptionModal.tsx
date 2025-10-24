
import React from 'react';
import { SubscriptionType, User } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (plan: SubscriptionType) => void;
  currentPlan: SubscriptionType;
  user: User;
  onSignInClick: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSubscribe, currentPlan, user, onSignInClick }) => {
  if (!isOpen) return null;

  const handleChoosePlan = (plan: SubscriptionType) => {
    if (user.type === 'guest') {
      onSignInClick();
    } else {
      onSubscribe(plan);
    }
  };

  const isTestOnlyActive = user.type === 'local' && currentPlan === 'test_only';
  const isFullActive = user.type === 'local' && currentPlan === 'full';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      aria-labelledby="subscription-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full m-4 transform transition-all" role="document">
        <div className="p-8">
           <div className="text-center">
             <h2 id="subscription-modal-title" className="text-3xl font-bold text-slate-900 dark:text-white">
                Choose Your Plan
             </h2>
             <p className="mt-2 text-slate-600 dark:text-slate-400">
                {user.type === 'guest' 
                  ? "Sign in or create an account to subscribe." 
                  : "Select the plan that best fits your study needs."
                }
             </p>
           </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`border rounded-lg p-6 flex flex-col ${isTestOnlyActive ? 'border-green-500' : 'border-slate-200 dark:border-slate-700'}`}>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Member</h3>
              <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
                ₹99 <span className="text-lg font-normal text-slate-500 dark:text-slate-400">/ one-time</span>
              </p>
              <ul className="mt-6 space-y-3 text-slate-600 dark:text-slate-400 flex-grow">
                <li className="flex items-start"><span className="text-green-500 mr-3 mt-1">✓</span> MCQs, Long Answer, Case-Based Tests</li>
                <li className="flex items-start"><span className="text-green-500 mr-3 mt-1">✓</span> Full-Length Mock Tests</li>
                <li className="flex items-start"><span className="text-green-500 mr-3 mt-1">✓</span> Performance Analysis & Scoring</li>
              </ul>
              {isTestOnlyActive ? (
                <button
                  disabled
                  className="mt-8 w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg cursor-not-allowed"
                >
                  Active
                </button>
              ) : (
                <button
                  onClick={() => handleChoosePlan('test_only')}
                  disabled={isFullActive}
                  className="mt-8 w-full px-6 py-3 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 font-bold rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {user.type === 'guest' ? 'Sign In to Subscribe' : (isFullActive ? 'Included in Premium' : 'Choose Plan')}
                </button>
              )}
            </div>

            <div className={`relative border-2 rounded-lg p-6 flex flex-col ${isFullActive ? 'border-blue-600' : 'border-slate-200 dark:border-slate-700'}`}>
              {!isFullActive && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full shadow-md">
                        Most Popular
                    </span>
                </div>
              )}
              <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">Premium Member</h3>
               <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
                ₹149 <span className="text-lg font-normal text-slate-500 dark:text-slate-400">/ one-time</span>
              </p>
              <ul className="mt-6 space-y-3 text-slate-600 dark:text-slate-400 flex-grow">
                <li className="flex items-start font-semibold text-blue-800 dark:text-blue-300"><span className="text-blue-500 mr-3 mt-1">✓</span> Everything in Member Plan</li>
                <li className="flex items-start font-bold text-blue-800 dark:text-blue-300"><span className="text-blue-500 mr-3 mt-1">✓</span> Interactive Flashcards</li>
                <li className="flex items-start font-bold text-blue-800 dark:text-blue-300"><span className="text-blue-500 mr-3 mt-1">✓</span> 24/7 AI Tutor Access</li>
                <li className="flex items-start font-bold text-blue-800 dark:text-blue-300"><span className="text-blue-500 mr-3 mt-1">✓</span> Instant Doubt Solving</li>
              </ul>
              {isFullActive ? (
                 <button
                    disabled
                    className="mt-8 w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg cursor-not-allowed"
                  >
                    Active
                  </button>
              ) : (
                <button
                  onClick={() => handleChoosePlan('full')}
                  className="mt-8 w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg transition-colors"
                >
                  {user.type === 'guest' ? 'Sign In to Subscribe' : 'Choose Plan'}
                </button>
              )}
            </div>
          </div>
          <div className="text-center mt-6">
             <button
              onClick={onClose}
              className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;