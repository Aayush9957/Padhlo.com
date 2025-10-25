import React, { useState, useEffect, useRef } from 'react';
import { View, UserProfile, User, ToastType } from '../types';

// Helper function for robust validation of imported profile data
const validateProfileData = (data: any): string | null => {
    if (typeof data !== 'object' || data === null) {
        return "Invalid file format. Expected a JSON object.";
    }

    const hasDisplayName = 'displayName' in data;
    const hasName = 'name' in data;

    if (!hasDisplayName && !hasName) return "Missing required field: 'displayName'.";
    if (!('exams' in data)) return "Missing required field: 'exams'.";

    const nameValue = hasDisplayName ? data.displayName : data.name;
    if (typeof nameValue !== 'string') {
        return "Invalid 'displayName' field. It must be a string.";
    }

    if (!Array.isArray(data.exams)) {
        return "'exams' field must be an array.";
    }
    const validExams = ['NEET', 'JEE'];
    if (!data.exams.every((exam: any) => typeof exam === 'string' && validExams.includes(exam))) {
        return `All items in the 'exams' array must be either 'NEET' or 'JEE'.`;
    }
    
    if (data.profilePicture && typeof data.profilePicture !== 'string') {
        return "If 'profilePicture' exists, it must be a string.";
    }

    return null; // All checks passed
};


interface ProfileViewProps {
    setView: (view: View) => void;
    user: User;
    profile: UserProfile;
    onSaveProfile: (profile: UserProfile) => void;
    setIsViewDirty: (isDirty: boolean) => void;
    addToast: (message: string, type: ToastType) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ setView, user, profile: initialProfile, onSaveProfile, setIsViewDirty, addToast }) => {
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [modalTrigger, setModalTrigger] = useState<HTMLButtonElement | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const captureButtonRef = useRef<HTMLButtonElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setProfile(initialProfile);
    }, [initialProfile]);
    
    useEffect(() => {
        // Set dirty state if profile has changed from initial
        const isDirty = JSON.stringify(profile) !== JSON.stringify(initialProfile);
        setIsViewDirty(isDirty);

        // Cleanup on unmount
        return () => {
            setIsViewDirty(false);
        };
    }, [profile, initialProfile, setIsViewDirty]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeCamera();
            }
        };

        if (isCameraOpen) {
            document.addEventListener('keydown', handleKeyDown);
            captureButtonRef.current?.focus();
        } else {
            modalTrigger?.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isCameraOpen, modalTrigger]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleExamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const exam = value as 'NEET' | 'JEE';
        setProfile(prev => {
            const currentExams = prev.exams;
            if (checked && !currentExams.includes(exam)) {
                return { ...prev, exams: [...currentExams, exam] };
            } else if (!checked) {
                return { ...prev, exams: currentExams.filter(ex => ex !== exam) };
            }
            return prev;
        });
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveProfile(profile);
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, profilePicture: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const openCamera = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setModalTrigger(event.currentTarget);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraOpen(true);
        } catch (error) {
            console.error("Error accessing camera:", error);
            addToast("Could not access camera. Please ensure you have given permission.", 'error');
        }
    };

    const closeCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
                const dataUrl = canvasRef.current.toDataURL('image/png');
                setProfile(prev => ({ ...prev, profilePicture: dataUrl }));
                closeCamera();
            }
        }
    };

    const handleExport = () => {
        try {
            const profileData = JSON.stringify(profile);
            const blob = new Blob([profileData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'padhlo_profile.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting profile:", error);
            addToast("Failed to export profile.", 'error');
        }
    };

    const handleImportClick = () => {
        importFileRef.current?.click();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) throw new Error("File is empty.");
                const importedProfile = JSON.parse(text);
                
                const validationError = validateProfileData(importedProfile);
                if (validationError) {
                    throw new Error(validationError);
                }

                const sanitizedProfile: UserProfile = {
                    displayName: importedProfile.displayName || importedProfile.name,
                    exams: importedProfile.exams,
                    profilePicture: importedProfile.profilePicture || undefined,
                };

                setProfile(sanitizedProfile);
                onSaveProfile(sanitizedProfile);
                addToast("Profile imported successfully!", 'success');
            } catch (error) {
                console.error("Error importing profile:", error);
                addToast(`Failed to import profile. Error: ${(error as Error).message}`, 'error');
            } finally {
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 sm:p-8">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">Account Details</h2>
                
                 {user.type === 'local' && (
                    <div className="mb-8 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Account Information</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            <strong>Name:</strong> {user.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            <strong>Email:</strong> {user.email}
                        </p>
                    </div>
                )}
                
                <div className="flex flex-col items-center mb-8">
                    <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 mb-4 overflow-hidden flex items-center justify-center">
                        {profile.profilePicture ? (
                            <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        )}
                    </div>
                     <div className="flex space-x-2">
                        <label className="cursor-pointer px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            Upload Picture
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        <button type="button" onClick={openCamera} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            Take Photo
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Display Name
                        </label>
                        <input
                            type="text"
                            id="displayName"
                            name="displayName"
                            value={profile.displayName}
                            onChange={handleInputChange}
                            placeholder="Enter your display name"
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Exam Preferences
                        </label>
                        <div className="mt-2 flex space-x-4">
                            {['NEET', 'JEE'].map(exam => (
                                <label key={exam} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        value={exam}
                                        checked={profile.exams.includes(exam as 'NEET' | 'JEE')}
                                        onChange={handleExamChange}
                                        className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-slate-700 dark:text-slate-300">{exam}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                         <div className="flex items-center flex-wrap gap-4">
                            <button
                                type="submit"
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Save Profile
                            </button>
                             <button
                                type="button"
                                onClick={handleExport}
                                className="inline-flex justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Export Profile
                            </button>
                             <button
                                type="button"
                                onClick={handleImportClick}
                                className="inline-flex justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Import Profile
                            </button>
                             <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={handleImport} />
                        </div>
                    </div>
                </form>
            </div>

            {isCameraOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="camera-modal-title"
                >
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-xl max-w-lg w-full">
                        <h3 id="camera-modal-title" className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0" style={{ clip: 'rect(0, 0, 0, 0)' }}>Camera Preview</h3>
                        <video ref={videoRef} autoPlay playsInline className="w-full rounded-md"></video>
                        <canvas ref={canvasRef} className="hidden"></canvas>
                        <div className="mt-4 flex justify-center space-x-4">
                            <button ref={captureButtonRef} onClick={capturePhoto} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Capture</button>
                            <button onClick={closeCamera} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileView;
