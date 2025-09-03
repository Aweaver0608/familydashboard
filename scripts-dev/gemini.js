import { GEMINI_API_KEY } from '../config.js';
import { getVerseHistory, addVerseToHistory, getRawWeatherData, setGeminiChatHistory, getSelectedPersonForMood } from './main.js';

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

async function callGemini(chatHistory, model = "gemini-1.5-flash-latest", responseSchema = null) {
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
    const result = await callGemini([{ parts: [{ text: prompt }] }], undefined, { type: "OBJECT", properties: { "sentences": schema }, required: ["sentences"] });
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

        I need you to generate 2 plausible but incorrect definitions for this word. These will be used as distractors in a multiple-choice quiz for a child (ages 8-13).

        Here are the requirements for the distractors:
        1.  **Plausible:** They should sound like real definitions.
        2.  **Incorrect:** They must not be a correct definition of the word.
        3.  **Creative:** Think about words that sound similar, have related themes, or are common misconceptions. For example, for "serendipity", a distractor could be related to "serenity" (calmness) or sound scientific.
        4.  **Distinct:** The distractors must be clearly different from the correct definition.

        Return a JSON object with a "distractors" key containing an array of the 2 incorrect definition strings.
    `;

    try {
        const result = await callGemini([{ parts: [{ text: prompt }] }], undefined, distractorSchema);
        return result.distractors || [];
    } catch (error) {
        console.error(`Error fetching distractors for ${word}:`, error);
        return []; // Return empty array on error
    }
}

export async function fetchActivityIdeas(weatherContext) {
    const prompt = `You are a helpful local guide for the Andrew Weaver family with 7 children: Liam (9), Kaci (12), Declan (11), Halle (11), Malia (13), Olivia (17). Andrew is a Caucasian male, 37 years old. His wife Jenna is 37. Based on this weather information for Greer, SC: "${weatherContext}". Provide 10 diverse ideas for fun family activities or local events. Ensure a mix of creative (e.g., arts/crafts, storytelling), physical (e.g., sports, active games), quiet (e.g., reading, puzzles), family friendly local events(free preferred) and adventurous (e.g., exploring parks, new places) activities. Include both at-home (indoor or outdoor) and local (near Greer, SC) options. For each idea, provide a "title" and a short but detailed "description". Do NOT include any information or suggestions about parental supervision in the response.`;
    
    try {
        const parsedJson = await callGemini([{ parts: [{ text: prompt }] }], undefined, activitySchema);
        return parsedJson.activities || [];
    } catch (error) {
        console.error("Error calling Gemini API for weather:", error);
        return [];
    }
}

export async function fetchConversationStarter() {
    let questionHistory = [];
    try {
        questionHistory = JSON.parse(localStorage.getItem('questionHistory') || '[]');
    } catch (e) {
        questionHistory = [];
    }

    const exclusionPrompt = questionHistory.length > 0 ? `Please do not ask a question similar to these recent ones: "${questionHistory.join('", "')}"` : "";
    const prompt = `Generate a single, fun, and thought-provoking conversation starter question suitable for a family with children of various ages (8-17). The question should be open-ended and encourage imagination or sharing personal stories. Do not include any introductory text, just the question itself. ${exclusionPrompt}`;

    try {
        const question = await callGemini([{ parts: [{ text: prompt }] }]);
        questionHistory.push(question);
        if (questionHistory.length > 10) { questionHistory.shift(); }
        localStorage.setItem('questionHistory', JSON.stringify(questionHistory));
        return question;
    } catch (error) {
        console.error("Error fetching conversation starter:", error);
        return 'What is your favorite family memory?'; // Fallback question
    }
}

export async function fetchVerseInsights(verseToAnalyze) {
    const track = document.getElementById('gemini-verse-insight-track');
    if (track) track.innerHTML = `<div class="carousel-slide flex items-center justify-center w-full h-full"><div class="spinner"></div><span class="ml-2">Loading...</span></div>`;

    if (!verseToAnalyze || !verseToAnalyze.text) {
        if (track) track.innerHTML = `<div class="carousel-slide text-center p-4"><p>Verse not loaded. Cannot get insights.</p></div>`;
        return null;
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
        const insights = await callGemini([{ parts: [{ text: insightPrompt }] }], undefined, verseInsightSchema);
        return insights;
    } catch (error) {
        console.error("Failed to fetch consolidated insights:", error);
        if (track) track.innerHTML = `<div class="carousel-slide p-4 text-center">Could not load insights.</div>`;
        return null;
    }
}

export async function askGemini(chatHistory, question) {
    const conversationToSend = JSON.parse(JSON.stringify(chatHistory));
    conversationToSend.push({ role: 'user', parts: [{ text: question }] });

    const safetyPrompt = `
          You are a friendly, patient, and knowledgeable AI assistant for children.
          A child has asked the following question: "${question}"
          
          Your task is to answer this question in a way that is simple, engaging, and easy for a child (ages 8-13) to understand. Use analogies and simple examples where possible.
          
          IMPORTANT SAFETY RULES:
          - You MUST NOT answer questions about or use language related to violence, weapons, self-harm, hate speech, sexual topics, drugs, alcohol, gambling, or any other mature or inappropriate themes.
          - If the user's question touches on any of these forbidden topics, you MUST refuse to answer directly. Instead, respond with a gentle and friendly refusal like: "That's a very grown-up question! I'm here to help with topics like science, animals, history, and homework. How about we talk about something else, like why dinosaurs are so cool?" and encourage the child to speak to their parents about that topic.
          - Keep your answers positive and encouraging.
    `;

    if (conversationToSend.filter(m => m.role === 'user').length === 1) {
        conversationToSend[conversationToSend.length - 1].parts[0].text = safetyPrompt;
    }

    try {
        const answer = await callGemini(conversationToSend);
        return answer;
    } catch (error) {
        console.error("Error asking Gemini:", error);
        return "Sorry, I had trouble thinking of an answer. Please try again!";
    }
}

export async function showFeelingResponse(feeling, coreEmotion) {
    const modalOverlay = document.getElementById('feeling-insight-modal-overlay');
    const titleEl = document.getElementById('feeling-insight-title');
    const bodyEl = document.getElementById('feeling-insight-body');

    // 1. Show the modal immediately with a loading state
    modalOverlay.style.display = 'flex';
    titleEl.textContent = `Understanding: ${feeling}`;
    bodyEl.innerHTML = '<div class="flex items-center justify-center w-full h-full"><div class="spinner"></div><span class="ml-2">Loading insights...</span></div>';
    lucide.createIcons();

    // 2. Fetch the insights from Gemini
    const person = getSelectedPersonForMood();
    const prompt = `
        Act as a child psychologist speaking to ${person}.
        The user is feeling "${feeling}", which is a specific type of the core emotion "${coreEmotion}".
        
        Generate a JSON object with two keys: "explanation" and "strategies".
        
        1.  "explanation": A short, simple, and reassuring explanation of what it means to feel ${feeling}. Validate the feeling as normal and okay.
        2.  "strategies": An array of 2-3 simple, actionable coping strategies or activities that a child can do to manage or process this feeling. Each item in the array should be an object with a "title" and a "description".

        Keep the tone gentle, validating, and age-appropriate.
    `;

    try {
        const insight = await callGemini([{ parts: [{ text: prompt }] }], undefined, feelingInsightSchema);

        // 3. Populate the modal with the fetched content
        if (insight && insight.explanation && insight.strategies) {
            let strategiesHTML = insight.strategies.map(strategy => `
                <div class="feeling-strategy">
                    <h4 class="font-semibold text-md mb-1">${strategy.title}</h4>
                    <p class="text-sm">${strategy.description}</p>
                </div>
            `).join('');

            bodyEl.innerHTML = `
                <p class="mb-4 text-base">${insight.explanation}</p>
                <h3 class="font-bold text-lg mb-2">Things you can do:</h3>
                <div class="space-y-3">${strategiesHTML}</div>
            `;
        } else {
            throw new Error("Invalid insight structure received from API.");
        }
    } catch (error) {
        console.error("Error fetching feeling insight:", error);
        bodyEl.innerHTML = `<p class="text-center text-red-400">Sorry, I couldn't load insights for this feeling right now. Please try again later.</p>`;
    }
    lucide.createIcons();
}