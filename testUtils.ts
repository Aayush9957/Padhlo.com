

/**
 * Robustly finds and parses a JSON object from the end of a string,
 * typically from an AI model's streaming response that includes a final report.
 * It looks for the last occurrence of '{' to start parsing.
 * @param text The text which may contain a JSON object at the end.
 * @returns The parsed JSON object or null if not found or if parsing fails.
 */
export const extractFinalJson = (text: string): any | null => {
    const lastBraceIndex = text.lastIndexOf('{');
    if (lastBraceIndex === -1) {
        return null;
    }
    const jsonString = text.substring(lastBraceIndex);
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse final JSON report from string:", jsonString, e);
        return null;
    }
};