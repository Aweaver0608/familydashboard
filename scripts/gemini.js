import { GEMINI_API_KEY, FAMILY_MEMBERS } from '/config.js';
import { getVerseHistory, addVerseToHistory, getRawWeatherData, setGeminiChatHistory, getSelectedPersonForMood, calculateAge } from './main.js';

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

async function callGemini(chatHistory, { systemInstruction = null, model = "gemini-2.5-flash", responseSchema = null } = {}) {
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
            if (systemInstruction) {
                payload.systemInstruction = { parts: [{ text: systemInstruction }] };
            }
            if (responseSchema) {
                payload.generationConfig = {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                };
            }

            console.log('Gemini API Payload:', JSON.stringify(payload, null, 2));

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
    const prompt = `Provide a single, age-appropriate English word for a child (ages 9-14) that is interesting but not overly obscure. ${exclusionPrompt} Only return the word itself, with no extra text or punctuation.`;
    return await callGemini([{ parts: [{ text: prompt }] }]);
}

export async function fetchGeminiSentencesForWord(word) {
    const prompt = `Provide an array of 2-3 example sentences for the word "${word}" that are easy for a child (ages 9-14) to understand. Return as a JSON array of strings.`;
    const schema = { type: "ARRAY", items: { type: "STRING" } };
    const result = await callGemini([{ parts: [{ text: prompt }] }], { responseSchema: { type: "OBJECT", properties: { "sentences": schema }, required: ["sentences"] } });
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

        I need you to generate 3 plausible but incorrect definitions for this word. These will be used as distractors in a multiple-choice quiz for a child (ages 8-13).

        Here are the requirements for the distractors:
        1.  **Plausible:** They should sound like real definitions.
        2.  **Incorrect:** They must not be a correct definition of the word.
        3.  **Creative:** Think about words that sound similar, have related themes, or are common misconceptions. For example, for "serendipity", a distractor could be related to "serenity" (calmness) or sound scientific.
        4.  **Distinct:** The distractors must be clearly different from the correct definition.

        Return a JSON object with a "distractors" key containing an array of 3 incorrect definition strings.
    `;

    try {
        const result = await callGemini([{ parts: [{ text: prompt }] }], { responseSchema: distractorSchema });
        return result.distractors || [];
    } catch (error) {
        console.error(`Error fetching distractors for ${word}:`, error);
        return []; // Return empty array on error
    }
}

const inspirationWords = [
    "educational","discovery", "silly", "teamwork", "magic", "nature", "history", "technology", "music", "art", "building", "storytelling", "adventure", "kindness", "speed", "quiet", "laughter"
];

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
}

function getInspirationWords(count) {
    const shuffled = inspirationWords.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

export async function fetchActivityIdeas(weatherContext) {
    const timeOfDay = getTimeOfDay();
    const inspirations = getInspirationWords(3);
    const inspirationText = inspirations.join(', ').replace(/, ([^,]*)$/, ' and $1'); // Formats to "a, b, and c"
    
    const children = FAMILY_MEMBERS.filter(m => m.relationship === 'child');
    const parents = FAMILY_MEMBERS.filter(m => m.relationship === 'parent');
    
    const childrenString = children.map(child => `${child.name} (${calculateAge(child.birthdate)})`).join(', ');
    const parentStrings = parents.map(parent => `${parent.name} is a ${parent.gender === 'male' ? 'Caucasian male' : 'female'}, ${calculateAge(parent.birthdate)} years old.`);
    
    const familyDescription = `You are a helpful local guide for the Weaver family with ${children.length} children: ${childrenString}. ${parentStrings.join(' ')}`;

    const prompt = `${familyDescription}
    
    It is currently the **${timeOfDay}**. Based on this weather information for Greer, SC: "${weatherContext}". 
    Today's random inspiration words are **${inspirationText}**.

    Provide 10 diverse ideas for fun family activities or local events that are appropriate for the time of day, the weather and at least one of the inspiration words. 
    
    Ensure a mix of creative (e.g., arts/crafts, storytelling), physical (e.g., sports, active games), quiet (e.g., reading, puzzles), family friendly local events(free preferred) and adventurous (e.g., exploring parks, new places) activities. Include both at-home (indoor or outdoor) and local (near Greer, SC) options. For each idea, provide a "title" and a short but detailed "description". Do NOT include any information or suggestions about parental supervision in the response.`;
    
    try {
        const parsedJson = await callGemini([{ parts: [{ text: prompt }] }], { responseSchema: activitySchema });
        return parsedJson.activities || [];
    } catch (error) {
        console.error("Error calling Gemini API for weather:", error);
        return [];
    }
}

export async function fetchVerseOfTheDay() {
    let verseHistory = getVerseHistory();
    const versesToExclude = verseHistory.slice(-150); // Exclude the last 150 verses
    let exclusionInstruction = versesToExclude.length > 0 ? ` Ensure the verse reference is NOT one of these: ${versesToExclude.join(', ')}.` : "";
    const versePrompt = `Provide one inspirational Bible verse from the NLT (New Living Translation), including its reference. Try to select a verse that is not extremely common and that can easily be used for inspiration or to give wisdom for future or present issues.${exclusionInstruction} Format it strictly as 'VERSE_TEXT (Book Chapter:Verse NLT)' with no extra commentary or formatting.`;
    return await callGemini([{ parts: [{ text: versePrompt }] }]);
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
        const insights = await callGemini([{ parts: [{ text: insightPrompt }] }], { responseSchema: verseInsightSchema });
        return insights;
    } catch (error) {
        console.error("Failed to fetch consolidated insights:", error);
        if (track) track.innerHTML = `<div class="carousel-slide p-4 text-center">Could not load insights.</div>`;
        return null;
    }
}

export async function askGemini(chatHistory, question, userName) {
    // The question is already in the chatHistory passed to this function

    const user = FAMILY_MEMBERS.find(member => member.name === userName);
    const age = user ? calculateAge(user.birthdate) : 'a child';

    const safetyPrompt = `
          **IMPORTANT RULES:**
          - **DO NOT** answer questions about: violence, weapons, self-harm, hate speech, sexual topics, drugs, alcohol, gambling, religion, evolution, the origin of the world, or other mature or controversial topics.
          - If a user asks about one of those topics, you MUST gently decline to answer. Your response should acknowledge that it's an important question but explain that it's a topic best discussed with their parents. Your tone should be warm and redirecting, not dismissive. For example, you could say something like: "Wow, that's a really big and important question! I think it's one of the best questions to talk about with your mom or dad, since they know you so well. Is there anything else I can help you with, like homework or fun facts about animals? 🦒"
          - For all other questions, keep your answers positive, encouraging, and simple for a child of about ${age} years old to understand.

          **Your Personality:**
          - You are a friendly and fun AI assistant.
          - You MUST use lots of emojis in all of your responses to make them fun and engaging. ✨🚀🤔

    `;
    try {
        const answer = await callGemini(chatHistory, { systemInstruction: safetyPrompt });
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
    const personObject = FAMILY_MEMBERS.find(member => member.name === person);
    const age = personObject ? calculateAge(personObject.birthdate) : 'a child'; // Default to 'a child' if not found

    const prompt = `
        Act as a behavioral psychologist, who specializes in trauma and CBT techniques, speaking to ${person}, who is ${age} years old.
        The user is feeling "${feeling}", which is a specific type of the core emotion "${coreEmotion}".
        
        Generate a JSON object with two keys: "explanation" and "strategies".
        
        1.  "explanation": A short, simple, and reassuring explanation of what it means to feel ${feeling}. Validate the feeling as normal and okay.
            **Tailor the complexity and language of the explanation to be appropriate for a ${age}-year-old.**
        2.  "strategies": An array of 2-3 simple, actionable coping strategies or activities that a ${age}-year-old can do to manage or process this feeling. Each item in the array should be an object with a "title" and a "description".

        Keep the tone gentle, validating, and age-appropriate.

    `;

    try {
        const insight = await callGemini([{ parts: [{ text: prompt }] }], { responseSchema: feelingInsightSchema });

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
