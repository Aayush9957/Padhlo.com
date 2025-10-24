

import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-8" role="status">
      <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
      {/* Visually hidden text for screen readers */}
      <span 
        className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0" 
        style={{ clip: 'rect(0, 0, 0, 0)' }}
      >
        Loading...
      </span>
    </div>
  );
};

export default React.memo(Spinner);
