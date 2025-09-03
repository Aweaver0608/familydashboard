import { GEMINI_API_KEY } from '../config.js';
import { getVerseHistory, addVerseToHistory, getRawWeatherData, setGeminiChatHistory, renderChatHistory, renderVerseCarousel, getSelectedPersonForMood } from './main.js';

// --- JSON Schemas for Gemini ---
const verseInsightSchema = {
    type: "OBJECT",
    properties: {
        "devotional": {
            "type": "OBJECT",
            "properties": {
                "title": { "type": "STRING" },
                "story": { "type": "STRING" },
                "big_idea": { "type": "STRING" },
                "application_questions": { "type": "ARRAY", "items": { "type": "STRING" } },
                "prayer": { "type": "STRING" }
            },
            "required": ["title", "story", "big_idea", "application_questions", "prayer"]
        },
        "context": { "type": "STRING" }
    },
    required: ["devotional", "context"]
};

const activitySchema = {
    type: "OBJECT",
    properties: {
        "activities": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": { "title": { "type": "STRING" }, "description": { "type": "STRING" } },
                "required": ["title", "description"]
            }
        }
    },
    "required": ["activities"]
};

const feelingInsightSchema = {
    type: "OBJECT",
    properties: {
        "explanation": { "type": "STRING" },
        "strategies": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "title": { "type": "STRING" },
                    "description": { "type": "STRING" }
                },
                "required": ["title", "description"]
            }
        }
    },
    required: ["explanation", "strategies"]
};

async function callGemini(chatHistory, model = "gemini-1.5-flash-preview-0514", responseSchema = null) {
    const apiKey = typeof __gemini_api_key !== 'undefined' ? __gemini_api_key : GEMINI_API_KEY;
    if (!apiKey && !(typeof __gemini_api_key !== 'undefined')) {
        console.error("Gemini API key is missing.");
        throw new Error("Gemini API key is missing.");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let lastError = null;
    for (let i = 0; i < 4; i++) {
        try {
            const payload = { contents: chatHistory };
            if (responseSchema) {
                payload.generationConfig = {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                };
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429 || response.status === 503) {
                lastError = new Error(`API call failed with status: ${response.status}`);
                if (i === 3) throw lastError;
                const delay = Math.pow(2, i) * 1000 + Math.random() * 100;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);

            const result = await response.json();

            if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                const responseText = result.candidates[0].content.parts[0].text;
                if (responseSchema) {
                    try {
                        return JSON.parse(responseText);
                    } catch (e) {
                        throw new Error("Invalid JSON response from API.");
                    }
                }
                return responseText;
            } else {
                throw new Error(`No content received from API. Finish reason: ${result.candidates?.[0]?.finishReason}`);
            }
        } catch (error) {
            lastError = error;
            if (i === 3) console.error(`An error occurred after multiple API call attempts:`, error);
        }
    }
    throw lastError;
}

export async function fetchAgeAppropriateWordFromGemini(wordHistory) {
    const exclusionPrompt = wordHistory.length > 0 ? `Do not choose any of these words: ${wordHistory.join(', ')}.` : '';
    const prompt = `Provide a single, age-appropriate English word for a child (ages 8-13) that is interesting but not overly obscure. ${exclusionPrompt} Only return the word itself, with no extra text or punctuation.`;
    return await callGemini([{ parts: [{ text: prompt }] }]);
}

export async function fetchGeminiSentencesForWord(word) {
    const prompt = `Provide an array of 2-3 example sentences for the word "${word}" that are easy for a child (ages 8-13) to understand. Return as a JSON array of strings.`;
    const schema = { type: "ARRAY", items: { type: "STRING" } };
    const result = await callGemini([{ parts: [{ text: prompt }] }], "gemini-1.5-flash-preview-0514", { type: "OBJECT", properties: { "sentences": schema }, required: ["sentences"] });
    return result.sentences || [];
}

export async function fetchDidYouKnowFactForWord(word) {
    const prompt = `Provide a single, interesting "Did you know?" fact about the word "${word}" suitable for a child (ages 8-13). This could be about its origin, a related concept, or a fun tidbit. Return only the fact as a single string.`;
    return await callGemini([{ parts: [{ text: prompt }] }]);
}

export async function fetchDistractorDefinitionsForWord(word, correctDefinition) {
    const distractorSchema = {
        type: "OBJECT",
        properties: {
            "distractors": {
                "type": "ARRAY",
                "items": { "type": "STRING" }
            }
        },
        required: ["distractors"]
    };

    const prompt = `
        For the word "${word}", the correct definition is: "${correctDefinition}".
        Please generate a JSON object containing an array of 2 plausible but incorrect definitions for this word that could be used as distractors in a multiple-choice quiz for a child (ages 8-13).
        The incorrect definitions should be for words that sound similar, have a related theme, or are common misconceptions. They must be different from the correct definition.
    `;

    try {
        const result = await callGemini([{ parts: [{ text: prompt }] }], "gemini-1.5-flash-preview-0514", distractorSchema);
        return result.distractors || [];
    } catch (error) {
        console.error(`Error fetching distractors for ${word}:`, error);
        return []; // Return empty array on error
    }
}

export async function generateAndDisplayVerseInsights(verseToAnalyze) {
    const track = document.getElementById('gemini-verse-insight-track');
    if (track) track.innerHTML = `<div class="carousel-slide flex items-center justify-center w-full h-full"><div class="spinner"></div><span class="ml-2">Loading...</span></div>`;

    if (!verseToAnalyze || !verseToAnalyze.text) {
        if (track) track.innerHTML = `<div class="carousel-slide text-center p-4"><p>Verse not loaded. Cannot get insights.</p></div>`;
        return;
    }

    const insightPrompt = `
Act as a theologian and Bible scholar who is skilled at making deep biblical truths accessible to children.
Based on the Bible verse "${verseToAnalyze.text}" (${verseToAnalyze.reference}), generate a JSON object with two main keys: "devotional" and "context".

1.  The "context" key should contain a string with historically accurate information simplified for a child (age 8+). Explain who wrote it, to whom, and the situation, focusing on what was happening that makes the verse's message important.

2.  The "devotional" key should contain a JSON object with the following keys:
    * "title": A short, catchy title for the devotional that captures the main theme.
    * "story": Instead of a fictional story, briefly explain the theological principle of the verse. If possible, use a real, brief example from another Bible character who lived out this truth (e.g., how David trusted God, how Paul showed perseverance).
    * "big_idea": A single sentence summarizing the core theological truth or promise of the verse.
    * "application_questions": An array of 2-3 short, relatable questions that connect the theological truth to a child's life.
    * "prayer": A short, simple prayer a child can say that reflects the theme of the verse.

Ensure the entire output is a single, valid JSON object.`;

    try {
        const insights = await callGemini([{ parts: [{ text: insightPrompt }] }], "gemini-1.5-flash-preview-0514", verseInsightSchema);
        renderVerseCarousel(insights);

        const todayKey = new Date().toISOString().slice(0, 10);
        localStorage.setItem('lastVerseDate', todayKey);
        localStorage.setItem('verseData', JSON.stringify({ verse: verseToAnalyze, insights: insights }));

    } catch (error) {
        console.error("Failed to fetch consolidated insights:", error);
        if (track) track.innerHTML = `<div class="carousel-slide p-4 text-center">Could not load insights.</div>`;
    }
}

// This is just a placeholder. The real implementation is in the main file.
export async function fetchVerseOfTheDayFromGemini() { console.log("fetchVerseOfTheDayFromGemini called"); }
export async function fetchActivityIdeas() { console.log("fetchActivityIdeas called"); }
export async function handleAskGemini() { console.log("handleAskGemini called"); }
export async function fetchConversationStarter() { console.log("fetchConversationStarter called"); }
export async function showFeelingResponse() { console.log("showFeelingResponse called"); }