

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { View } from '../types';
import Spinner from './Spinner';
import BackButton from './BackButton';
import LoadingView from './LoadingView';
import ErrorMessage from './ErrorMessage';

interface Message {
    role: 'user' | 'model';
    text: string;
    error?: boolean;
}

interface TutorViewProps {
  sectionName: string;
  subjectName: string;
  setView: (view: View) => void;
  goBack: () => void;
}

const TutorView: React.FC<TutorViewProps> = ({ sectionName, subjectName, setView, goBack }) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeChat = async () => {
        try {
            // Safely access the API key to prevent ReferenceError on load
            const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
            if (!apiKey) {
                throw new Error("API_KEY environment variable not set");
            }
            const ai = new GoogleGenAI({ apiKey });
            const newChat = ai.chats.create({
                model: 'gemini-flash-lite-latest',
                config: {
                    systemInstruction: `You are an expert tutor for the subject '${subjectName}' for a '${sectionName}' student. Your goal is to help the student understand concepts, answer their questions, and explain topics from the syllabus in a clear and encouraging way. Keep your responses concise and easy to understand.`,
                },
            });
            setChat(newChat);
            
            const initialMessage = `Hello! I'm your AI tutor for ${subjectName}. How can I help you study today? Feel free to ask me any question about the syllabus.`;
            setMessages([{ role: 'model', text: initialMessage }]);
        } catch (err) {
            console.error("Chat initialization error:", err);
            if (err instanceof Error && err.message.includes("API_KEY environment variable not set")) {
                setError("The AI service is not configured. Please ensure the API key is set up correctly by the administrator.");
            } else {
                setError("Failed to start the tutor session. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };
    
    initializeChat();
  }, [sectionName, subjectName]);

  useEffect(() => {
    // Scroll to the bottom of the chat container when new messages are added
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !chat || isStreaming) return;

    const userMessage: Message = { role: 'user', text: userInput };
    setMessages(prev => [...prev, userMessage, { role: 'model', text: '' }]); // Add user message and model placeholder
    setUserInput('');
    setIsStreaming(true);

    try {
      const stream = await chat.sendMessageStream({ message: userInput });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text += text;
            return newMessages;
          });
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage: Message = { role: 'model', text: "Sorry, I couldn't process that. Please try asking in a different way.", error: true };
      setMessages(prev => {
         const newMessages = [...prev];
         newMessages[newMessages.length - 1] = errorMessage;
         return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
        <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex-shrink-0">
                <BackButton onClick={goBack} />
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">AI Tutor: {subjectName}</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">Your personal study assistant.</p>
            </div>
            <div className="flex-grow flex items-center justify-center">
                 {error ? <ErrorMessage title="Initialization Failed" message={error} /> : <LoadingView loadingText="Initializing AI Tutor..." />}
            </div>
        </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex-shrink-0">
        <BackButton onClick={goBack} />
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">AI Tutor: {subjectName}</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">Your personal study assistant.</p>
      </div>

      <div className="flex-grow bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 flex flex-col overflow-hidden">
        <div 
          ref={chatContainerRef} 
          className="flex-grow overflow-y-auto space-y-4 pr-2"
          aria-live="polite"
        >
            {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-lg lg:max-w-2xl px-4 py-2 rounded-xl shadow ${
                    msg.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : msg.error
                    ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}>
                {msg.text ? <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: window.marked.parse(msg.text) }} /> : <Spinner />}
                </div>
            </div>
            ))}
        </div>
        <div className="flex-shrink-0 pt-4">
            {error ? (
                <ErrorMessage title="Session Error" message={error} />
            ) : (
                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-grow p-3 border rounded-full bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                        disabled={isStreaming || !chat}
                    />
                    <button 
                        type="submit" 
                        disabled={isStreaming || !userInput.trim() || !chat}
                        className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default TutorView;