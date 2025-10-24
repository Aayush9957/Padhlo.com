
import React, { useState } from 'react';
import { Subject, View } from '../types';

interface TestChapterSelectionViewProps {
  sectionName: string;
  subject: Subject;
  testType: 'longAnswer' | 'caseBased' | 'mcqs';
  setView: (view: View) => void;
}

const TestChapterSelectionView: React.FC<TestChapterSelectionViewProps> = ({ sectionName, subject, testType, setView }) => {
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

  const handleChapterToggle = (chapterName: string) => {
    setSelectedChapters(prev =>
      prev.includes(chapterName)
        ? prev.filter(c => c !== chapterName)
        : [...prev, chapterName]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedChapters(subject.chapters.map(c => c.name));
    } else {
      setSelectedChapters([]);
    }
  };

  const startPractice = () => {
    if (selectedChapters.length === 0) {
      alert('Please select at least one chapter.');
      return;
    }
    setView({
      name: testType,
      sectionName,
      subjectName: subject.name,
      chapters: selectedChapters,
    } as any);
  };

  const allSelected = selectedChapters.length === subject.chapters.length && subject.chapters.length > 0;
  const testTypeName = {
      longAnswer: 'Long Answer Questions',
      caseBased: 'Case-Based Questions',
      mcqs: 'MCQs Practice',
  }[testType];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">{testTypeName}</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Select chapters for your practice session.</p>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
          <input
            type="checkbox"
            id="select-all"
            checked={allSelected}
            onChange={handleSelectAll}
            className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900"
          />
          <label htmlFor="select-all" className="ml-3 font-semibold text-slate-800 dark:text-slate-200">
            Select All Chapters
          </label>
        </div>
        <ul className="space-y-3 max-h-96 overflow-y-auto">
          {subject.chapters.map((chapter) => (
            <li
              key={chapter.name}
              className="flex items-center p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <input
                type="checkbox"
                id={`chapter-${chapter.name}`}
                checked={selectedChapters.includes(chapter.name)}
                onChange={() => handleChapterToggle(chapter.name)}
                className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900"
              />
              <label htmlFor={`chapter-${chapter.name}`} className="ml-3 text-slate-800 dark:text-slate-200 cursor-pointer flex-grow">
                {chapter.name}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={startPractice}
          disabled={selectedChapters.length === 0}
          className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          Start Practice ({selectedChapters.length} {selectedChapters.length === 1 ? 'chapter' : 'chapters'})
        </button>
      </div>
    </div>
  );
};

export default TestChapterSelectionView;
