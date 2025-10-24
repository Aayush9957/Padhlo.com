

import React from 'react';

interface BackButtonProps {
  onClick: () => void;
  text?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick, text = 'Back' }) => {
  return (
    // Add a wrapper with a fixed height to prevent the content below from jumping when the button becomes sticky.
    // h-16 (4rem or 64px) approximates the original button height plus its bottom margin.
    <div className="h-16">
      <button
        onClick={onClick}
        // Make the button sticky to keep it visible on scroll.
        // top-24 (6rem or 96px) positions it below the sticky header.
        // z-30 ensures it's below the header (z-40) and other modals.
        className="sticky top-24 z-30 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        {text}
      </button>
    </div>
  );
};

export default React.memo(BackButton);