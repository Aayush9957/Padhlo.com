
import React from 'react';

const InlineSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center" role="status" aria-label="Loading...">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default React.memo(InlineSpinner);