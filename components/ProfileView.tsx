

import React, { useState, useEffect, useRef } from 'react';
import { View, UserProfile } from '../types';
import BackButton from './BackButton';

const PROFILE_STORAGE_KEY = 'padhlo-user-profile';

// Helper function for robust validation of imported profile data
const validateProfileData = (data: any): string | null => {
    if (typeof data !== 'object' || data === null) {
        return "Invalid file format. Expected a JSON object.";
    }

    // Check for required fields
    const requiredFields: (keyof UserProfile)[] = ['name', 'standard', 'exams'];
    for (const field of requiredFields) {
        if (!(field in data)) {
            return `Missing required field: '${field}'.`;
        }
    }

    // Validate 'name' type
    if (typeof data.name !== 'string') {
        return "Invalid 'name' field. It must be a string.";
    }

    // Validate 'standard' type and value
    const validStandards = ['Class 11', 'Class 12', ''];
    if (typeof data.standard !== 'string' || !validStandards.includes(data.standard)) {
        return `'standard' field must be one of 'Class 11', 'Class 12', or empty.`;
    }

    // Validate 'exams' type and content
    if (!Array.isArray(data.exams)) {
        return "'exams' field must be an array.";
    }
    const validExams = ['NEET', 'JEE'];
    if (!data.exams.every((exam: any) => typeof exam === 'string' && validExams.includes(exam))) {
        return `All items in the 'exams' array must be either 'NEET' or 'JEE'.`;
    }
    
    // Validate optional 'profilePicture'
    if (data.profilePicture && typeof data.profilePicture !== 'string') {
        return "If 'profilePicture' exists, it must be a string.";
    }

    return null; // All checks passed
};


const ProfileView: React.FC<{ setView: (view: View) => void; goBack: () => void; }> = ({ setView, goBack }) => {
    const [profile, setProfile] = useState<UserProfile>({
        name: '',
        standard: '',
        exams: [],
        profilePicture: '',
    });
    const [savedMessageVisible, setSavedMessageVisible] = useState(false);
    
    // State and refs for camera modal
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [modalTrigger, setModalTrigger] = useState<HTMLButtonElement | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const captureButtonRef = useRef<HTMLButtonElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        try {
            const savedProfileRaw = localStorage.getItem(PROFILE_STORAGE_KEY);
            if (savedProfileRaw) {
                const savedProfile = JSON.parse(savedProfileRaw);
                setProfile(savedProfile);
            }
        } catch (error) {
            console.error("Failed to load user profile from storage", error);
        }
    }, []);
    
    // Accessibility: Handle keyboard events and focus for modal
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

    const handleStandardChange = (standard: 'Class 11' | 'Class 12') => {
        setProfile(prev => ({ ...prev, standard }));
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
        try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
            setSavedMessageVisible(true);
            setTimeout(() => setSavedMessageVisible(false), 3000); // Hide message after 3 seconds
        } catch (error) {
            console.error("Failed to save user profile to storage", error);
            alert("Could not save profile. Please try again.");
        }
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
            alert("Could not access camera. Please ensure you have given permission.");
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
            const profileData = localStorage.getItem(PROFILE_STORAGE_KEY);
            if (!profileData) {
                alert("No profile data to export. Please save a profile first.");
                return;
            }
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
            alert("Failed to export profile.");
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
                
                // Use the new validation function
                const validationError = validateProfileData(importedProfile);
                if (validationError) {
                    throw new Error(validationError);
                }

                // Ensure only known properties are set to avoid extra data
                const sanitizedProfile: UserProfile = {
                    name: importedProfile.name,
                    standard: importedProfile.standard,
                    exams: importedProfile.exams,
                    profilePicture: importedProfile.profilePicture || undefined,
                };

                setProfile(sanitizedProfile);
                localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(sanitizedProfile));
                alert("Profile imported successfully!");
            } catch (error) {
                console.error("Error importing profile:", error);
                alert(`Failed to import profile. Error: ${(error as Error).message}`);
            } finally {
                // Reset the file input so the same file can be selected again
                if (e.target) {
                    e.target.value = '';
                }
            }
        };
        reader.readAsText(file);
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <BackButton onClick={goBack} />
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 sm:p-8 mt-4">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">User Profile</h2>
                
                {/* Profile Picture Section */}
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
                    {/* Name Input */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Your Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={profile.name}
                            onChange={handleInputChange}
                            placeholder="Enter your name"
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>

                    {/* Class Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Your Class
                        </label>
                        <div className="mt-2 flex space-x-4">
                            {['Class 11', 'Class 12'].map(std => (
                                <label key={std} className="flex items-center">
                                    <input
                                        type="radio"
                                        name="standard"
                                        value={std}
                                        checked={profile.standard === std}
                                        onChange={() => handleStandardChange(std as 'Class 11' | 'Class 12')}
                                        className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-slate-700 dark:text-slate-300">{std}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Exam Preferences */}
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

                    {/* Action Buttons */}
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

                            {savedMessageVisible && (
                                <span className="text-sm font-medium text-green-600 dark:text-green-400 transition-opacity duration-300">
                                    Profile saved successfully!
                                </span>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Camera Modal */}
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
