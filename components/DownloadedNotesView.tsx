

import React, { useState, useEffect } from 'react';
import { View, DownloadedNote } from '../types';
import BackButton from './BackButton';

// Storage logic
const STORAGE_KEY = 'padhlo-downloaded-notes';

const getNotes = (): DownloadedNote[] => {
    try {
        const notesRaw = localStorage.getItem(STORAGE_KEY);
        return notesRaw ? JSON.parse(notesRaw) : [];
    } catch (e) {
        console.error("Failed to parse downloaded notes", e);
        return [];
    }
};

const removeNote = (noteId: string): DownloadedNote[] => {
    const notes = getNotes();
    const updatedNotes = notes.filter(note => note.id !== noteId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
    return updatedNotes;
};

interface DownloadedNotesViewProps {
    setView: (view: View) => void;
    goBack: () => void;
}

const DownloadedNotesView: React.FC<DownloadedNotesViewProps> = ({ setView, goBack }) => {
    const [notes, setNotes] = useState<DownloadedNote[]>([]);

    useEffect(() => {
        setNotes(getNotes());
    }, []);

    const handleNoteClick = (note: DownloadedNote) => {
        setView({
            name: 'chapter',
            sectionName: note.sectionName,
            subjectName: note.subjectName,
            chapterName: note.chapterName,
            offlineContent: note.content
        });
    };

    const handleDelete = (e: React.MouseEvent | React.KeyboardEvent, noteId: string) => {
        e.stopPropagation(); // Prevent navigation when deleting
        if (window.confirm("Are you sure you want to delete this downloaded note?")) {
            const updatedNotes = removeNote(noteId);
            setNotes(updatedNotes);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          action();
        }
    };

    const groupedNotes = notes.reduce((acc: Record<string, DownloadedNote[]>, note) => {
        const key = `${note.sectionName} - ${note.subjectName}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(note);
        return acc;
    }, {} as Record<string, DownloadedNote[]>);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <BackButton onClick={goBack} />
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-4 mb-6">Downloaded Notes</h2>

            {notes.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow">
                    <p className="text-slate-500 dark:text-slate-400">You haven't downloaded any notes yet.</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Notes you download will appear here for offline access.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Fix: Explicitly type `[groupName, notesInGroup]` to resolve TypeScript error on `notesInGroup.map`. */}
                    {Object.entries(groupedNotes).map(([groupName, notesInGroup]: [string, DownloadedNote[]]) => (
                        <div key={groupName}>
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">{groupName}</h3>
                            <ul className="space-y-3">
                                {notesInGroup.map(note => (
                                    <li 
                                        key={note.id} 
                                        className="bg-white dark:bg-slate-800 rounded-lg shadow flex justify-between items-center focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 dark:focus-within:ring-offset-slate-900"
                                    >
                                        <div 
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleNoteClick(note)} 
                                            onKeyDown={(e) => handleKeyDown(e, () => handleNoteClick(note))}
                                            className="cursor-pointer flex-grow p-4 rounded-lg"
                                        >
                                            <p className="font-medium text-slate-800 dark:text-slate-200">{note.chapterName}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Downloaded on: {new Date(note.downloadedAt).toLocaleString()}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(e, note.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(e, note.id); }}
                                            className="ml-4 mr-2 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors z-10"
                                            aria-label={`Delete note for ${note.chapterName}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DownloadedNotesView;