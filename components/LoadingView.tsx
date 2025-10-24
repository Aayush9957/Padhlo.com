

import React from 'react';
import Spinner from './Spinner';

interface LoadingViewProps {
  loadingText?: string;
}

const LoadingView: React.FC<LoadingViewProps> = ({ loadingText = "Generating content..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Spinner />
      <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">{loadingText}</p>
    </div>
  );
};

export default LoadingView;