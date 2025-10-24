

import React from 'react';
import { View } from '../types';

interface AboutViewProps {
  setView: (view: View) => void;
}

const AboutView: React.FC<AboutViewProps> = ({ setView }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">About Padhlo.com</h2>
        
        <article className="prose dark:prose-invert max-w-none">
            <p>
                <strong>Padhlo.com</strong> is your personal AI-powered study partner, designed to make learning more accessible, efficient, and engaging for students. Whether you're preparing for board exams or competitive entrance tests like NEET and JEE, our platform provides you with the tools you need to succeed.
            </p>
            
            <h3 className="text-xl font-semibold mt-6">Our Mission</h3>
            <p>
                Our mission is to democratize education by leveraging the power of artificial intelligence. We aim to provide high-quality, personalized learning materials to every student, helping them to understand complex topics, practice effectively, and achieve their academic goals.
            </p>

            <h3 className="text-xl font-semibold mt-6">Key Features</h3>
            <ul>
                <li>
                    <strong>AI-Generated Study Notes:</strong> Get comprehensive, well-structured notes for any chapter, generated in real-time. Our notes include core concepts, diagrams, and key takeaways to solidify your understanding.
                </li>
                <li>
                    <strong>Interactive Test Series:</strong> Sharpen your skills with a variety of practice tests, including long-answer questions, case-based scenarios, and full-length mock tests designed to simulate exam conditions.
                </li>
                <li>
                    <strong>Personalized AI Tutor:</strong> Have a question? Our AI Tutor is available 24/7 to provide instant, clear explanations on any topic from your syllabus.
                </li>
                <li>
                    <strong>Handwritten Answer Analysis:</strong> Upload a photo of your handwritten work and receive instant feedback, corrections, and suggestions for improvement from our advanced AI.
                </li>
                 <li>
                    <strong>Performance Tracking:</strong> Keep track of your progress with our Score Board, which saves your scores from every test you take.
                </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6">Powered by Google Gemini</h3>
            <p>
                This application is proudly powered by Google's state-of-the-art Gemini family of models. The advanced reasoning and multimodal capabilities of Gemini enable us to provide you with high-quality content generation, intelligent tutoring, and insightful analysis.
            </p>
        </article>
      </div>
    </div>
  );
};

export default AboutView;
