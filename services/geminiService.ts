import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CaseStudy, MCQ, UserProfile, MockTestFormat, SubjectiveAnswer } from "../types";

const model = 'gemini-2.5-flash';
const fastModel = 'gemini-flash-lite-latest'; // For low-latency, streaming use cases

// --- CORE HELPERS (Internal to this service) ---

/**
 * Initializes the AI instance on demand, preventing a startup crash
 * if the API key is not immediately available.
 */
const getAiInstance = () => {
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
    
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set");
    }
    return new GoogleGenAI({ apiKey });
};

const getSessionCache = (key: string): any | null => {
    const cachedData = sessionStorage.getItem(key);
    if (cachedData) {
        try {
            return JSON.parse(cachedData);
        } catch (e) {
            console.error("Failed to parse session cache:", e);
            return null;
        }
    }
    return null;
};

const setSessionCache = (key: string, data: any) => {
    try {
        sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to set session cache:", e);
    }
};

const COOLDOWN_PERIOD_MS = 2000;
let lastApiCallTimestamp = 0;

const checkRateLimit = () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTimestamp;

    if (timeSinceLastCall < COOLDOWN_PERIOD_MS) {
        const timeLeft = Math.ceil((COOLDOWN_PERIOD_MS - timeSinceLastCall) / 1000);
        throw new Error(`You're making requests too quickly. Please wait ${timeLeft} more second(s).`);
    }
    lastApiCallTimestamp = now;
};

const rateLimitedApiCall = async <T extends GenerateContentResponse>(cacheKey: string, apiCall: () => Promise<T>): Promise<T> => {
    const cachedResponse = getSessionCache(cacheKey);
    if (cachedResponse) {
        return Promise.resolve({ text: cachedResponse } as T);
    }
    checkRateLimit();
    const response = await apiCall();
    const responseText = response.text;
    if (responseText && typeof responseText === 'string' && !responseText.toLowerCase().includes('error')) {
        setSessionCache(cacheKey, responseText);
    }
    return response;
};

export const getApiErrorMessage = (error: any, defaultMessage: string = "An unexpected error occurred."): string => {
    console.error("Gemini API Error:", error);
    if (error && typeof error.message === 'string') {
        if (error.message.startsWith("You're making requests too quickly")) {
            return error.message;
        }
        if (error.message.includes("API_KEY environment variable not set")) {
            return "The AI service is not configured. Please contact the administrator.";
        }
        if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota')) {
            return "The AI service is currently busy. Please wait a moment and try again.";
        }
        if (error.message.toLowerCase().includes('failed to fetch')) {
            return "Network error. Please check your internet connection and try again.";
        }
    }
     if (error instanceof SyntaxError) {
        return "The AI returned an invalid response format. Please try generating the content again.";
    }
    return defaultMessage;
};


const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            mimeType: file.type,
            data: await base64EncodedDataPromise,
        },
    };
};

/**
 * Extracts a JSON string from a text that might be wrapped in markdown code fences
 * or have extraneous text before/after it.
 * @param text The text from the AI response.
 * @returns A clean JSON string, or the original text if no JSON is found.
 */
const extractJson = (text: string): string => {
    // Attempt to find JSON within markdown code blocks
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }

    // Fallback: Find the first and last curly or square bracket
    const firstBracket = text.indexOf('{');
    const firstSquare = text.indexOf('[');
    let start = -1;

    if (firstBracket === -1) start = firstSquare;
    else if (firstSquare === -1) start = firstBracket;
    else start = Math.min(firstBracket, firstSquare);

    if (start === -1) {
        return text;
    }

    const lastCurly = text.lastIndexOf('}');
    const lastSquare = text.lastIndexOf(']');
    const end = Math.max(lastCurly, lastSquare);

    if (end === -1) {
        return text;
    }

    return text.substring(start, end + 1).trim();
};

const IMAGE_API_COOLDOWN_MS = 15000;
let lastImageApiCallTimestamp = 0;

const enforceImageRateLimit = async (): Promise<void> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastImageApiCallTimestamp;

    if (timeSinceLastCall < IMAGE_API_COOLDOWN_MS) {
        const timeToWait = IMAGE_API_COOLDOWN_MS - timeSinceLastCall;
        await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    lastImageApiCallTimestamp = Date.now();
};


// --- MODULE: DiagramGenerator ---
// Fix: Exported DiagramGenerator to make it accessible to other modules.
export const DiagramGenerator = {
     /**
     * Generates a diagram and returns the markdown string.
     */
     async generateDiagram(prompt: string): Promise<string> {
        try {
            await enforceImageRateLimit();
            const ai = getAiInstance();
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: `Generate a clear, accurate, and simple scientific diagram for educational purposes, suitable for a student. The diagram should be well-labeled. Topic: ${prompt}`,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: '16:9',
                },
            });
            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64Image = response.generatedImages[0].image.imageBytes;
                return `\n\n![Diagram for: ${prompt}](data:image/png;base64,${base64Image})\n\n`;
            }
            return `\n\n[Notice: An image was requested but not generated for "${prompt}"]\n\n`;
        } catch (e) {
            console.error("Diagram generation failed:", e);
            const errorMessage = getApiErrorMessage(e, `Could not generate diagram for "${prompt}"`);
            return `\n\n[Error: ${errorMessage}]\n\n`;
        }
    }
};


// --- MODULE: NoteGenerator ---
// Fix: Exported NoteGenerator to make it accessible to other modules.
export const NoteGenerator = {
    /**
     * Generates and streams comprehensive study notes for a specific chapter.
     * Diagrams are NOT generated here; placeholders are inserted instead.
     */
    async generateChapterNotesStream(
      sectionName: string,
      subjectName: string,
      chapterName: string,
      userProfile: UserProfile | null,
      onChunk: (chunk: string) => void,
      onComplete: (fullText: string) => void,
      onError: (error: string) => void
    ) {
      const profileKey = userProfile ? `${userProfile.exams.sort().join('-')}` : 'default';
      const cacheKey = `notes-text-only-${sectionName}-${subjectName}-${chapterName}-${profileKey}`;
      
      try {
        const cachedResponse = getSessionCache(cacheKey);
        if (cachedResponse) {
            onChunk(cachedResponse);
            onComplete(cachedResponse);
            return;
        }

        checkRateLimit();

        let tailoringInstruction = `for a "${sectionName}" student.`;
        if (userProfile && userProfile.exams.length > 0) {
            const exams = userProfile.exams.join(', ');
            tailoringInstruction = `for a "${sectionName}" student who is also preparing for the ${exams} examinations. Please prioritize concepts, examples, and problem-solving techniques that are highly relevant to these exams.`;
        }

        const prompt = `
        You are an expert teacher. Provide comprehensive, well-structured study notes for the chapter "${chapterName}" from the subject "${subjectName}", tailored ${tailoringInstruction}

        **Formatting Rules:**
        1.  The notes must be in valid Markdown.
        2.  **CRITICAL FOR MATH**: For all mathematical formulas, equations, and symbols, you MUST use LaTeX syntax. For inline mathematics (e.g., variables in a sentence), use single dollar signs (e.g., \`$x^2 + y^2 = r^2$\`). For display mathematics (equations on their own line), use double dollar signs (e.g., \`$$ \\int_a^b f(x) \\, dx $$ \`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook.
        3.  When a complex concept needs a visual diagram, insert a placeholder using this exact syntax on a new line: \`[LOAD_DIAGRAM_PROMPT:"A detailed scientific diagram of..."]\`. Do not generate the image yourself. Just insert the placeholder.
        
        **Content Structure:**
        1.  **Introduction**: An engaging overview.
        2.  **Core Concepts**: Detailed explanations with headings, subheadings, and bullet points. 
        3.  **Key Takeaways**: A concise summary.

        Ensure content is accurate and strictly relevant to the CBSE 2025-2026 syllabus.
        `;

        const ai = getAiInstance();
        const responseStream = await ai.models.generateContentStream({ model, contents: prompt });

        let fullText = '';
        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                fullText += text;
                onChunk(text);
            }
        }
        setSessionCache(cacheKey, fullText);
        onComplete(fullText);

      } catch (error) {
        onError(getApiErrorMessage(error, "Failed to generate notes. Please check the API configuration and try again."));
      }
    },
    
    /**
     * Generates chapter notes as a single text block, without diagrams.
     * Non-streaming for use cases that need the text first (e.g., downloads, video summaries).
     */
    async generateChapterNotesText(
      sectionName: string,
      subjectName: string,
      chapterName: string,
      userProfile: UserProfile | null
    ): Promise<string> {
        const profileKey = userProfile ? `${userProfile.exams.sort().join('-')}` : 'default';
        const cacheKey = `notes-text-only-${sectionName}-${subjectName}-${chapterName}-${profileKey}`;

        try {
            const cachedResponse = getSessionCache(cacheKey);
            if (cachedResponse) {
                return cachedResponse;
            }

            checkRateLimit();

            let tailoringInstruction = `for a "${sectionName}" student.`;
            if (userProfile && userProfile.exams.length > 0) {
                const exams = userProfile.exams.join(', ');
                tailoringInstruction = `for a "${sectionName}" student who is also preparing for the ${exams} examinations. Please prioritize concepts, examples, and problem-solving techniques that are highly relevant to these exams.`;
            }
            const prompt = `
            You are an expert teacher. Provide comprehensive, well-structured study notes for the chapter "${chapterName}" from the subject "${subjectName}", tailored ${tailoringInstruction}

            **Formatting Rules:**
            1.  The notes must be in valid Markdown.
            2.  **CRITICAL FOR MATH**: For all mathematical formulas, equations, and symbols, you MUST use LaTeX syntax. For inline mathematics (e.g., variables in a sentence), use single dollar signs (e.g., \`$x^2 + y^2 = r^2$\`). For display mathematics (equations on their own line), use double dollar signs (e.g., \`$$ \\int_a^b f(x) \\, dx $$ \`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook.
            3.  When a complex concept needs a visual diagram, insert a placeholder using this exact syntax on a new line: \`[LOAD_DIAGRAM_PROMPT:"A detailed scientific diagram of..."]\`. Do not generate the image yourself. Just insert the placeholder.
            
            **Content Structure:**
            1.  **Introduction**: An engaging overview.
            2.  **Core Concepts**: Detailed explanations with headings, subheadings, and bullet points. 
            3.  **Key Takeaways**: A concise summary.

            Ensure content is accurate and strictly relevant to the CBSE 2025-2026 syllabus.
            `;

            const ai = getAiInstance();
            const response = await ai.models.generateContent({ model, contents: prompt });
            
            const fullText = response.text;
            if (fullText) {
                setSessionCache(cacheKey, fullText);
                return fullText;
            }
            throw new Error("Received empty response from AI.");

        } catch (error) {
            throw new Error(getApiErrorMessage(error, "Failed to generate notes."));
        }
    }
};

// --- MODULE: TestGenerator ---
// Fix: Exported TestGenerator to make it accessible to other modules.
export const TestGenerator = {
    /**
     * Generates a specified number of long-answer questions.
     */
    async generateLongAnswerQuestions(sectionName: string, subjectName: string, chapters: string[], count: number): Promise<string> {
        const topics = chapters.length > 0 ? `from the specific chapters: ${chapters.join(', ')}` : 'based on the CBSE 2025-2026 syllabus';
        
        let sourceInstruction = `and reflect patterns from recent CBSE board exams and sample papers.`;
        if ((sectionName === 'Class 11' || sectionName === 'Class 12') && subjectName === 'Physics') {
            sourceInstruction = `and be of a high standard, reflecting patterns and difficulty levels from sources like the CBSE Question Bank, official sample papers, and renowned textbooks such as HC Verma and SL Arora.`;
        }
        
        const prompt = `You are an AI assistant optimized for speed and accuracy. Generate ${count} unique long-answer questions for the subject '${subjectName}' for a '${sectionName}' student. The questions should be challenging, ${topics}, ${sourceInstruction} Crucially, include a few questions that specifically require the student to draw a diagram, create a flowchart, or label a chart to fully answer the question. For example: "Explain the process of mitosis with a neat, labelled diagram." or "Draw a flowchart to illustrate the carbon cycle.". For any mathematical content, use LaTeX syntax (e.g., \`$x^2$\` or \`$$...$$\`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook. Provide the output as a JSON array of strings.`;
         try {
            const ai = getAiInstance();
            const sortedChapters = [...chapters].sort().join(',');
            const cacheKey = `longAnswer-${sectionName}-${subjectName}-${sortedChapters}-${count}`;
            const response = await rateLimitedApiCall<GenerateContentResponse>(cacheKey, () => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }));
            return extractJson(response.text);
        } catch (error) {
            throw new Error(getApiErrorMessage(error, "Failed to generate long answer questions."));
        }
    },

    /**
     * Generates a specified number of case-based study questions.
     */
    async generateCaseBasedQuestions(sectionName: string, subjectName: string, chapters: string[], count: number): Promise<string> {
        const topics = chapters.length > 0 ? `The scenarios should be based on concepts from the following chapters, following the CBSE 2025-2026 curriculum: ${chapters.join(', ')}.` : '';
        
        let sourceInstruction = '';
        if ((sectionName === 'Class 11' || sectionName === 'Class 12') && subjectName === 'Physics') {
            sourceInstruction = `The case studies should be of a high standard, inspired by conceptual problems and real-world applications found in renowned textbooks like HC Verma, SL Arora, and the official CBSE Question Bank.`;
        }

        const prompt = `You are an AI assistant optimized for speed and accuracy. Generate ${count} unique case-based study scenarios for the subject '${subjectName}' for a '${sectionName}' student. ${topics} ${sourceInstruction} Each case study should present a scenario, passage, or data set, followed by a few analytical questions related to it. Ensure that some of the case studies include data presented in tables, simple charts, or diagrams. The questions should then require analysis of this visual data or ask the student to create their own diagram or chart based on the scenario. For any mathematical content, use LaTeX syntax (e.g., \`$x^2$\` or \`$$...$$\`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook. Provide the output as a JSON array of objects. Each object must have two keys: "case" (a string containing the case study) and "questions" (an array of strings representing the questions for that case).`;
         try {
            const ai = getAiInstance();
            const sortedChapters = [...chapters].sort().join(',');
            const cacheKey = `caseBased-${sectionName}-${subjectName}-${sortedChapters}-${count}`;
            const response = await rateLimitedApiCall<GenerateContentResponse>(cacheKey, () => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                case: { type: Type.STRING },
                                questions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            }
                        }
                    }
                }
            }));
            return extractJson(response.text);
        } catch (error) {
            throw new Error(getApiErrorMessage(error, "Failed to generate case-based questions."));
        }
    },

    /**
     * Generates a specified number of multiple-choice questions.
     */
    async generateMCQs(sectionName: string, subjectName: string, chapters: string[], count: number): Promise<string> {
        const topics = chapters.length > 0 ? `from the specific chapters: ${chapters.join(', ')}` : 'based on the CBSE 2025-2026 syllabus';
        
        let sourceInstruction = `and reflect patterns from recent CBSE board exams and sample papers.`;
        if ((sectionName === 'Class 11' || sectionName === 'Class 12') && subjectName === 'Physics') {
            sourceInstruction = `and be of a high standard, reflecting patterns and difficulty levels from sources like the CBSE Question Bank, official sample papers, and renowned textbooks such as HC Verma and SL Arora.`;
        }

        const prompt = `You are an AI assistant optimized for speed and accuracy. Generate ${count} unique multiple-choice questions (MCQs) for the subject '${subjectName}' for a '${sectionName}' student. The questions should be challenging, ${topics}, ${sourceInstruction} For any mathematical content, use LaTeX syntax (e.g., \`$x^2$\` or \`$$...$$\`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook. Each question must have four options. Provide the output as a JSON array of objects. Each object must have four keys: "question" (string), "options" (an array of 4 strings), "correctAnswer" (a string that exactly matches one of the options), and "explanation" (a brief string explaining the correct answer).`;

        try {
            const ai = getAiInstance();
            const sortedChapters = [...chapters].sort().join(',');
            const cacheKey = `mcqs-${sectionName}-${subjectName}-${sortedChapters}-${count}`;
            const response = await rateLimitedApiCall<GenerateContentResponse>(cacheKey, () => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                correctAnswer: { type: Type.STRING },
                                explanation: { type: Type.STRING }
                            },
                            required: ["question", "options", "correctAnswer"]
                        }
                    }
                }
            }));
            return extractJson(response.text);
        } catch (error) {
            throw new Error(getApiErrorMessage(error, "Failed to generate MCQs."));
        }
    },

    /**
     * Generates a full-length mock test based on official exam formats.
     */
    async generateMockTest(sectionName: string, subjectName: string): Promise<string> {
        const formatDetails: { [key: string]: string } = {
            'Class 9': 'the official CBSE Class 9 final exam format for the 2025-2026 session',
            'Class 10': 'the official CBSE Class 10 board exam format for the 2025-2026 session',
            'Class 11': 'the official CBSE Class 11 final exam format for the 2025-2026 session',
            'Class 12': 'the official CBSE Class 12 board exam format for the 2025-2026 session',
            'NEET': 'the latest official NEET (UG) exam format including sections and marking scheme for the 2025-2026 session',
            'JEE': 'the latest official JEE Mains exam format including sections for different question types and marking scheme for the 2025-2026 session',
        };

        let sourceInstruction = `The questions must be sourced from the latest CBSE 2025-2026 syllabus and pattern, including official sample papers, previous 4 years' CBSE question papers, and reputable question banks like Arihant, Educart, and Oswal.`;
        if ((sectionName === 'Class 11' || sectionName === 'Class 12') && subjectName === 'Physics') {
            sourceInstruction = `The questions must be of a very high standard, sourced from the latest CBSE 2025-2026 syllabus and pattern. Critically, you must include a mix of questions inspired by official CBSE sample papers, the CBSE Question Bank, and renowned, conceptually-demanding textbooks like HC Verma and SL Arora. Ensure the difficulty level is appropriate for a final board exam.`;
        }

        const prompt = `You are an AI assistant and expert question paper setter. Create a full-length, high-quality mock test paper for '${subjectName}' for a '${sectionName}' student. 
        
        **CRITICAL INSTRUCTIONS:**
        1.  The paper must strictly follow ${formatDetails[sectionName] || 'a standard competitive exam format'}.
        2.  ${sourceInstruction}
        3.  The total marks for the test must be exactly 80. Distribute marks across sections and questions appropriately to sum up to 80.
        4.  For all mathematical content (equations, symbols, variables), you MUST use LaTeX syntax for proper rendering (e.g., \`$x^2$\` or \`$$...$$\`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook.
        
        Generate the output as a single, valid JSON object. The root object should have keys: "title", "subject", "totalMarks" (must be 80), "duration", and "sections". 
        "sections" should be an array of objects, where each object has "title", "instructions", and "questions".
        "questions" should be an array of question objects. Each question object must have a "type" ('SHORT_ANSWER', 'LONG_ANSWER', or 'CASE_BASED'), a "question" (string), and "marks" (number).
        Ensure the final structure is a valid JSON.`;

        try {
            const ai = getAiInstance();
            const cacheKey = `mockTest-${sectionName}-${subjectName}`;
            const response = await rateLimitedApiCall<GenerateContentResponse>(cacheKey, () => ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 },
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            subject: { type: Type.STRING },
                            totalMarks: { type: Type.NUMBER },
                            duration: { type: Type.STRING },
                            sections: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        instructions: { type: Type.STRING },
                                        questions: {
                                            type: Type.ARRAY,
                                            items: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    type: { type: Type.STRING },
                                                    question: { type: Type.STRING },
                                                    marks: { type: Type.NUMBER },
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }));
            return extractJson(response.text);
        } catch (error) {
            throw new Error(getApiErrorMessage(error, "Failed to generate mock test."));
        }
    }
};

// --- MODULE: AnswerAnalyzer ---
// Fix: Exported AnswerAnalyzer to make it accessible to other modules.
export const AnswerAnalyzer = {
    /**
     * Generates an ideal model answer for a given question.
     */
    async generateModelAnswerStream(
      question: string,
      sectionName: string,
      subjectName: string,
      onChunk: (chunk: string) => void,
      onComplete: (fullText: string) => void,
      onError: (error: string) => void
    ) {
      const cacheKey = `modelAnswer-${sectionName}-${subjectName}-${question}`;
      try {
        const cachedResponse = getSessionCache(cacheKey);
        if (cachedResponse) {
            onChunk(cachedResponse);
            onComplete(cachedResponse);
            return;
        }

        checkRateLimit();

        const prompt = `
        You are an expert teacher. Provide a comprehensive, well-structured, and ideal model answer for the following question, tailored for a "${sectionName}" student studying "${subjectName}". 
        The question is: "${question}".
        Format the answer clearly using Markdown. **CRITICAL FOR MATH**: For all mathematical formulas, equations, and symbols, you MUST use LaTeX syntax. For inline mathematics (e.g., variables in a sentence), use single dollar signs (e.g., \`$x^2$\`). For display mathematics (equations on their own line), use double dollar signs (e.g., \`$$...$$\`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook.
        Ensure the answer is accurate and detailed enough to earn full marks according to the CBSE 2025-2026 curriculum.
        `;

        const ai = getAiInstance();
        const responseStream = await ai.models.generateContentStream({ model: fastModel, contents: prompt });

        let fullText = '';
        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                fullText += text;
                onChunk(text);
            }
        }
        setSessionCache(cacheKey, fullText);
        onComplete(fullText);
      } catch (error) {
        onError(getApiErrorMessage(error, "Failed to generate a model answer."));
      }
    },

    /**
     * Analyzes a student's typed answer and provides feedback.
     */
    async analyzeTypedAnswerStream(
      question: string,
      answer: string,
      onChunk: (chunk: string) => void,
      onComplete: () => void,
      onError: (error: string) => void
    ) {
        const prompt = `
        You are an expert teacher evaluating a student's typed answer. Your task is to:
        1.  **Analyze the Answer**: Carefully read the student's response.
        2.  **Identify Mistakes**: Pinpoint any factual errors, logical fallacies, calculation mistakes, or significant omissions.
        3.  **Provide Corrections**: For each mistake, explain why it's incorrect and provide the correct information or method.
        4.  **Give Overall Feedback**: Summarize the strengths and weaknesses of the answer and offer constructive advice for improvement.
        5.  **Format clearly**: Use Markdown with headings, bold text, and bullet points. **CRITICAL FOR MATH**: Use LaTeX syntax for all mathematical expressions (e.g., \`$x^2$\` or \`$$...$$\`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook.
        **Question:** "${question}"
        **Student's Answer:** "${answer}"
        Begin your analysis now.
        `;
        try {
            checkRateLimit();
            const ai = getAiInstance();
            const responseStream = await ai.models.generateContentStream({ model: fastModel, contents: prompt });
            for await (const chunk of responseStream) {
                const text = chunk.text;
                if (text) onChunk(text);
            }
            onComplete();
        } catch (error) {
            onError(getApiErrorMessage(error, "Failed to analyze the typed answer."));
        }
    },

    /**
     * Analyzes a student's handwritten answer from an image file.
     */
    async analyzeHandwrittenAnswerStream(
      question: string,
      imageFile: File,
      onChunk: (chunk: string) => void,
      onComplete: () => void,
      onError: (error: string) => void
    ) {
        const prompt = `
        You are an expert teacher evaluating a student's handwritten answer. The user has provided an image of their answer to the following question. Your task is to:
        1.  **Analyze the Answer**: Carefully read and understand the student's response from the image.
        2.  **Identify Mistakes**: Pinpoint any factual errors, logical fallacies, calculation mistakes, or significant omissions.
        3.  **Provide Corrections**: For each mistake, explain why it's incorrect and provide the correct information or method.
        4.  **Give Overall Feedback**: Summarize the strengths and weaknesses of the answer and offer constructive advice for improvement.
        5.  **Format clearly**: Use Markdown with headings, bold text, and bullet points. **CRITICAL FOR MATH**: Use LaTeX syntax for all mathematical expressions (e.g., \`$x^2$\` or \`$$...$$\`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook.
        **Question:** "${question}"
        Begin your analysis now.
        `;
        try {
            checkRateLimit();
            const ai = getAiInstance();
            const imagePart = await fileToGenerativePart(imageFile);
            const responseStream = await ai.models.generateContentStream({
                model: model,
                contents: { parts: [{ text: prompt }, imagePart] },
            });
            for await (const chunk of responseStream) {
                const text = chunk.text;
                if (text) onChunk(text);
            }
            onComplete();
        } catch (error) {
            onError(getApiErrorMessage(error, "Failed to analyze the answer."));
        }
    },

    /**
     * Analyzes a student's performance on an MCQ test and provides feedback.
     */
    async analyzeMCQPerformanceStream(
        mcqs: MCQ[],
        selectedAnswers: { [key: number]: string },
        onChunk: (chunk: string) => void,
        onComplete: () => void,
        onError: (error: string) => void
    ) {
        const incorrectAnswers = mcqs.map((mcq, index) => ({
            question: mcq.question,
            selectedAnswer: selectedAnswers[index],
            correctAnswer: mcq.correctAnswer,
            explanation: mcq.explanation
        })).filter(item => item.selectedAnswer !== item.correctAnswer);

        if (incorrectAnswers.length === 0) {
            onChunk("Excellent work! You answered all questions correctly. Keep up the great momentum.");
            onComplete();
            return;
        }

        const prompt = `
        You are an expert teacher providing feedback on a student's MCQ test performance. The student made some mistakes. Your task is to:
        1.  **Summarize Performance**: Start with a brief, encouraging summary of their performance.
        2.  **Analyze Mistakes**: For each incorrect answer provided below, explain the underlying concept the student likely misunderstood, based on the CBSE 2025-2026 curriculum.
        3.  **Provide Clarifications**: Offer clear, concise explanations for the correct answers.
        4.  **Suggest Improvements**: Give actionable advice on how the student can improve in these specific areas.
        5.  **Format clearly**: Use Markdown with headings, bold text, and bullet points. **CRITICAL FOR MATH**: Use LaTeX syntax for all mathematical expressions (e.g., \`$x^2$\` or \`$$...$$\`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook.
        **Incorrectly Answered Questions:**
        ${JSON.stringify(incorrectAnswers, null, 2)}
        Begin your analysis now.
        `;

        try {
            checkRateLimit();
            const ai = getAiInstance();
            const responseStream = await ai.models.generateContentStream({ model, contents: prompt });
            for await (const chunk of responseStream) {
                const text = chunk.text;
                if (text) onChunk(text);
            }
            onComplete();
        } catch (error) {
            onError(getApiErrorMessage(error, "Failed to analyze the MCQ performance."));
        }
    },

    /**
     * Provides a final grade and detailed report for a subjective test (long answer or case-based).
     */
    async analyzeSubjectiveTestStream(
      testType: 'Long Answer' | 'Case-Based',
      totalMarks: number,
      marksPerQuestion: number,
      questions: (string | CaseStudy)[],
      answers: { [key: string]: { text?: string; image?: File } },
      onChunk: (chunk: string) => void,
      onComplete: () => void,
      onError: (error: string) => void
    ) {
      const parts: any[] = [];
      const answerMap: any = {};
      let imageCounter = 0;
      for (const key in answers) {
          const answer = answers[key];
          if (answer.text) {
              answerMap[key] = { text: answer.text };
          }
          if (answer.image) {
              const imagePart = await fileToGenerativePart(answer.image);
              parts.push(imagePart);
              answerMap[key] = { ...answerMap[key], imageReference: `[Reference to image ${imageCounter}]` };
              imageCounter++;
          }
      }

      const prompt = `
      You are a strict but fair examiner following the CBSE 2025-2026 marking scheme. A student has completed a ${testType} test and submitted their answers for grading and analysis.
      **Instructions for Grading:**
      1.  The test consists of ${questions.length} questions. Each question is worth ${marksPerQuestion} marks. The total marks for the test is ${totalMarks}.
      2.  Evaluate each of the student's answers based on accuracy, completeness, and clarity.
      3.  For answers provided as text, evaluate the text. For answers provided as images, analyze the content of the image.
      4.  Assign a score out of ${marksPerQuestion} for each question.
      **Instructions for the Report:**
      1.  Provide a detailed question-by-question breakdown. For each question:
          - State the question.
          - State the student's answer (or a summary if it's long).
          - Provide your feedback on the answer, highlighting strengths and weaknesses.
          - Clearly state the marks awarded for that question (e.g., "Marks Awarded: 4/${marksPerQuestion}").
      2.  After the breakdown, provide a "Final Report" section. This section should include:
          - An overall summary of the student's performance.
          - Key areas of strength.
          - Key areas needing improvement.
          - Actionable advice for the student.
      3.  **CRITICAL**: At the very end of your entire response, after all other text, you MUST provide the total score in a specific, machine-readable JSON format on a new line. The format is: \`{"final_score_report": {"score": TOTAL_SCORE_HERE, "totalMarks": ${totalMarks}}}\`. For example: \`{"final_score_report": {"score": 22, "totalMarks": ${totalMarks}}}\`. This JSON block must be the absolute last thing you output.
      **Test Content:**
      **Questions:**
      ${JSON.stringify(questions, null, 2)}
      **Student's Answers:**
      ${JSON.stringify(answerMap, null, 2)}
      Begin your evaluation now. Format the entire response in well-structured Markdown. **For any mathematical content in your feedback, use LaTeX syntax. Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook.**
      `;
      
      parts.unshift({ text: prompt });
      
      try {
          checkRateLimit();
          const ai = getAiInstance();
          const responseStream = await ai.models.generateContentStream({
              model,
              contents: { parts: parts },
          });

          for await (const chunk of responseStream) {
              const text = chunk.text;
              if(text) onChunk(text);
          }
          onComplete();
      } catch (error) {
          onError(getApiErrorMessage(error, `Failed to analyze the ${testType} test.`));
      }
    },

    /**
     * Grades a full mock test, including text and image answers, and provides a detailed report.
     */
    async analyzeFullMockTestStream(
      testData: MockTestFormat,
      answers: { [key: string]: SubjectiveAnswer },
      onChunk: (chunk: string) => void,
      onComplete: () => void,
      onError: (error: string) => void
    ) {
        const parts: any[] = [];
        const answerMap: { [key: string]: { text?: string; imageReference?: string } } = {};
        let imageCounter = 0;

        for (const key in answers) {
            const answer = answers[key];
            if (answer) {
                if (answer.text) {
                    answerMap[key] = { text: answer.text };
                }
                if (answer.image) {
                    const imagePart = await fileToGenerativePart(answer.image);
                    parts.push(imagePart);
                    answerMap[key] = { ...answerMap[key], imageReference: `[See uploaded image ${imageCounter}]` };
                    imageCounter++;
                }
            }
        }

        const prompt = `
        You are a strict but fair CBSE board examiner for the 2025-2026 session. A student has submitted their answers for a full mock test for ${testData.totalMarks} marks.

        **Instructions for Grading:**
        1.  Review the entire test structure (provided below) and the student's answers.
        2.  Evaluate each answer (which can be text or an image) based on accuracy, completeness, clarity, and adherence to the CBSE marking scheme.
        3.  Assign a score for each question out of the maximum marks allocated to it. Be realistic with partial marks.

        **Instructions for the Report:**
        1.  Begin with a "General Performance Summary" section. Provide overall feedback, highlighting strengths and major areas for improvement.
        2.  Provide a detailed, question-by-question breakdown. For each question:
            -   Restate the question number and the question itself.
            -   Provide a brief summary of the student's answer.
            -   Give your detailed feedback and analysis.
            -   Clearly state the marks awarded (e.g., "Marks Awarded: 4/5").
        3.  After the breakdown, calculate the total score.
        4.  **CRITICAL**: At the very end of your entire response, after all other text, you MUST provide the total score in a specific, machine-readable JSON format on a new line. The format is: \`{"final_score_report": {"score": TOTAL_SCORE_HERE, "totalMarks": ${testData.totalMarks}}}\`. For example: \`{"final_score_report": {"score": 68, "totalMarks": 80}}\`. This JSON block must be the absolute last thing you output.

        **Full Test Paper:**
        ${JSON.stringify(testData, null, 2)}

        **Student's Submitted Answers:**
        ${JSON.stringify(answerMap, null, 2)}

        Begin your evaluation now. Format the entire report in well-structured Markdown. **For any mathematical content in your feedback, use LaTeX syntax. Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook.**
        `;

        parts.unshift({ text: prompt });

        try {
            checkRateLimit();
            const ai = getAiInstance();
            const responseStream = await ai.models.generateContentStream({
                model,
                contents: { parts },
            });

            for await (const chunk of responseStream) {
                const text = chunk.text;
                if (text) onChunk(text);
            }
            onComplete();
        } catch (error) {
            onError(getApiErrorMessage(error, `Failed to analyze the mock test.`));
        }
    }
};

// --- MODULE: FlashcardGenerator ---
// Fix: Exported FlashcardGenerator to make it accessible to other modules.
export const FlashcardGenerator = {
    /**
     * Generates a set of key term/definition flashcards for a given chapter.
     */
    async generateFlashcards(sectionName: string, subjectName: string, chapterName: string): Promise<string> {
        const prompt = `You are an AI assistant specialized in creating educational flashcards. Generate 15 to 20 key terms and their concise definitions for the chapter '${chapterName}' from the subject '${subjectName}' for a '${sectionName}' student. The content must be strictly based on the CBSE 2025-2026 curriculum. For any mathematical content, use LaTeX syntax (e.g., \`$x^2$\` or \`$$...$$\`). Your LaTeX should be clean, standard, and unambiguous, mirroring the quality of a professional textbook. Provide the output as a JSON array of objects. Each object must have two keys: "term" (string) and "definition" (string).`;

        try {
            const ai = getAiInstance();
            const cacheKey = `flashcards-${sectionName}-${subjectName}-${chapterName}`;
            const response = await rateLimitedApiCall<GenerateContentResponse>(cacheKey, () => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                term: { type: Type.STRING },
                                definition: { type: Type.STRING }
                            },
                            required: ["term", "definition"]
                        }
                    }
                }
            }));
            return extractJson(response.text);
        } catch (error) {
            throw new Error(getApiErrorMessage(error, "Failed to generate flashcards."));
        }
    }
};