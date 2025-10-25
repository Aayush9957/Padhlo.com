import React, { useEffect, useRef } from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect runs whenever the content changes. It finds the rendered HTML element
    // and tells KaTeX to scan it for math delimiters and render them.
    if (contentRef.current && window.renderMathInElement) {
      window.renderMathInElement(contentRef.current, {
        // Customize the delimiters KaTeX looks for
        delimiters: [
          {left: '$$', right: '$$', display: true},  // For display mode math
          {left: '$', right: '$', display: false},   // For inline mode math
          {left: '\\(', right: '\\)', display: false},
          {left: '\\[', right: '\\]', display: true}
        ],
        // Don't throw an error if KaTeX can't parse something, just show the original text.
        throwOnError: false
      });
    }
  }, [content]);

  // Convert the raw Markdown string to an HTML string.
  const htmlContent = window.marked.parse(content);

  return (
    <div
      ref={contentRef}
      className={className}
      // Render the HTML string. The useEffect hook will then process this rendered content.
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownContent;
