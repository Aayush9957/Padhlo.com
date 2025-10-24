import React, { useState, useEffect } from 'react';
import { View, DownloadedItem } from '../types';

// Storage logic
const STORAGE_KEY = 'padhlo-downloads';

const getItems = (): DownloadedItem[] => {
    try {
        const itemsRaw = localStorage.getItem(STORAGE_KEY);
        return itemsRaw ? JSON.parse(itemsRaw) : [];
    } catch (e) {
        console.error("Failed to parse downloaded items", e);
        return [];
    }
};

const removeItem = (itemId: string): DownloadedItem[] => {
    const items = getItems();
    const updatedItems = items.filter(item => item.id !== itemId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
    return updatedItems;
};

interface DownloadsViewProps {
    setView: (view: View) => void;
}

const DownloadsView: React.FC<DownloadsViewProps> = ({ setView }) => {
    const [items, setItems] = useState<DownloadedItem[]>([]);
    const [playingVideo, setPlayingVideo] = useState<DownloadedItem | null>(null);

    useEffect(() => {
        setItems(getItems());
    }, []);

    const handleItemClick = (item: DownloadedItem) => {
        if (item.type === 'note') {
            setView({
                name: 'chapter',
                sectionName: item.sectionName,
                subjectName: item.subjectName,
                chapterName: item.chapterName,
                offlineContent: item.content
            });
        } else if (item.type === 'video') {
            setPlayingVideo(item);
        }
    };

    const handleDelete = (e: React.MouseEvent | React.KeyboardEvent, itemId: string) => {
        e.stopPropagation(); // Prevent navigation when deleting
        if (window.confirm("Are you sure you want to delete this downloaded item?")) {
            const updatedItems = removeItem(itemId);
            setItems(updatedItems);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          action();
        }
    };

    const groupedItems = items.reduce((acc: Record<string, DownloadedItem[]>, item) => {
        const key = `${item.sectionName} - ${item.subjectName}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {} as Record<string, DownloadedItem[]>);

    const renderIcon = (itemType: 'note' | 'video') => {
        if (itemType === 'video') {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
            );
        }
        // Default to note icon
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">Downloads</h2>

            {items.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow">
                    <p className="text-slate-500 dark:text-slate-400">You haven't downloaded any items yet.</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Notes and videos you save will appear here for offline access.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Fix: Explicitly typed the destructured array from Object.entries to ensure `itemsInGroup` is correctly typed as DownloadedItem[]. */}
                    {Object.entries(groupedItems).map(([groupName, itemsInGroup]: [string, DownloadedItem[]]) => (
                        <div key={groupName}>
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">{groupName}</h3>
                            <ul className="space-y-3">
                                {itemsInGroup.map(item => (
                                    <li 
                                        key={item.id} 
                                        className="bg-white dark:bg-slate-800 rounded-lg shadow flex justify-between items-center focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 dark:focus-within:ring-offset-slate-900"
                                    >
                                        <div 
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleItemClick(item)} 
                                            onKeyDown={(e) => handleKeyDown(e, () => handleItemClick(item))}
                                            className="cursor-pointer flex-grow p-4 rounded-lg flex items-center"
                                        >
                                            {renderIcon(item.type)}
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{item.chapterName}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Downloaded on: {new Date(item.downloadedAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(e, item.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(e, item.id); }}
                                            className="ml-4 mr-2 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors z-10"
                                            aria-label={`Delete item for ${item.chapterName}`}
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
            
            {/* Video Player Modal */}
            {playingVideo && playingVideo.type === 'video' && (
                 <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
                    onClick={() => setPlayingVideo(null)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-xl max-w-3xl w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">{playingVideo.chapterName}</h3>
                        <video controls autoPlay src={`data:${playingVideo.videoMimeType};base64,${playingVideo.content}`} className="w-full rounded-lg">
                            Your browser does not support the video tag.
                        </video>
                        <button onClick={() => setPlayingVideo(null)} className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DownloadsView;