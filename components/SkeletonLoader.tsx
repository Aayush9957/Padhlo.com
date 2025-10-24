import React from 'react';

interface SkeletonLoaderProps {
  type: 'text' | 'card';
  count?: number;
}

// This component injects the shimmer animation styles into the document.
// It's rendered once by SkeletonLoader, and the .animate-shimmer class can be used by any skeleton element.
const ShimmerStyles: React.FC = () => (
    <style>{`
        .animate-shimmer {
            position: relative;
            overflow: hidden;
        }
        .animate-shimmer::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            transform: translateX(-100%);
            background-image: linear-gradient(
                90deg,
                rgba(255, 255, 255, 0) 0,
                rgba(255, 255, 255, 0.2) 20%,
                rgba(255, 255, 255, 0.5) 60%,
                rgba(255, 255, 255, 0)
            );
            animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
            100% {
                transform: translateX(100%);
            }
        }
    `}</style>
);


const TextSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-shimmer"></div>
    <div className="space-y-3 mt-8">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-shimmer"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 animate-shimmer"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-shimmer"></div>
    </div>
    <div className="space-y-3 mt-6">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-shimmer"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-shimmer"></div>
    </div>
  </div>
);

const CardSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="space-y-8 mt-6">
    {Array.from({ length: count }).map((_, i) => (
      // The parent card doesn't shimmer, only its internal placeholder elements.
      <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-6 animate-shimmer"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-shimmer"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-shimmer"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 animate-shimmer"></div>
        </div>
      </div>
    ))}
  </div>
);

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type, count = 3 }) => {
  return (
    <>
      <ShimmerStyles />
      {type === 'text' ? <TextSkeleton /> : <CardSkeleton count={count} />}
    </>
  );
};

export default SkeletonLoader;
