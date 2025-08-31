import { GEMINI_API_KEY, verseInsightSchema, activitySchema, feelingInsightSchema } from '../config.js';
import { renderVerseCarousel, renderActivityCarousel, renderChatHistory, updateVerseFromLocalList } from './ui.js';
import { addVerseToHistory, getVerseHistory, getRawWeatherData, getCurrentVerse, setCurrentVerse, getActivityIdeas, setActivityIdeas, getGeminiChatHistory, setGeminiChatHistory } from './main.js';

async function callGemini(chatHistory, model = "gemini-2.5-flash", responseSchema = null) {
     const apiKey = typeof __gemini_api_key !== 'undefined' ? __gemini_api_key : GEMINI_API_KEY; //Use environment api key if available
     if (!apiKey && !(typeof __gemini_api_key !== 'undefined')) {
         console.error("Gemini API key is missing.");
         throw new Error("Gemini API key is missing.");
     }

     const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
     let lastError = null;
     // Exponential backoff with retries
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

             // Check for rate limiting or server overload and retry
             if (response.status === 429 || response.status === 503) {
                 lastError = new Error(`API call failed with status: ${response.status}`);
                 if (i === 3) { // Last attempt
                     throw lastError;
                 }
                 // Exponential backoff with jitter
                 const delay = Math.pow(2, i) * 1000 + Math.random() * 100;
                 await new Promise(resolve => setTimeout(resolve, delay));
                 continue; // Retry the loop
             }

             if (!response.ok) {
                 throw new Error(`API call failed with status: ${response.status}`);
             }
            
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
                 return responseText; // Success
             } else {
                  throw new Error(`No content received from API. Finish reason: ${result.candidates?.[0]?.finishReason}`);
             }
         } catch (error) {
             lastError = error;
             if (i === 3) { // Only log the final error
                 console.error(`An error occurred after multiple API call attempts:`, error);
             }
         }
     }
     // If all retries fail, throw the last captured error
     throw lastError;
}

export async function fetchAgeAppropriateWordFromGemini(excludedWords = []) {
    let exclusionInstruction = excludedWords.length > 0 ? ` Do not provide any of the following words: ${excludedWords.join(', ')}.` : "";
    const prompt = `Provide a single, interesting, and age-appropriate English word for children aged 9-14.${exclusionInstruction} Do not include any definitions, explanations, or extra text, just the word itself.`;
    try {
        const word = await callGemini([{ parts: [{ text: prompt }] }]);
        return word.trim();
    } catch (error) {
        console.error("Error fetching age-appropriate word from Gemini:", error);
        return null;
    }
}

const sentenceSchema = {
    type: "ARRAY",
    items: { "type": "STRING" }
};

export async function fetchGeminiSentencesForWord(word) {
    const prompt = `Provide 3-4 distinct, age-appropriate (9-14) example sentences for the word '${word}'. Ensure the sentences are simple, clear, and demonstrate the word's meaning. Return them as a JSON array of strings, like ["Sentence 1.", "Sentence 2."].`;
    try {
        const sentences = await callGemini([{ parts: [{ text: prompt }] }], "gemini-2.5-flash", sentenceSchema);
        return sentences;
    } catch (error) {
        console.error(`Error fetching Gemini sentences for word '${word}':`, error);
        return [];
    }
}

export async function fetchVerseOfTheDayFromGemini() {
    const verseTextEl = document.getElementById('verse-text');
    const verseRefEl = document.getElementById('verse-reference');
    
    const todayKey = new Date().toISOString().slice(0, 10); 
    const cachedData = localStorage.getItem('verseData');
    const lastVerseDate = localStorage.getItem('lastVerseDate');

    if (lastVerseDate === todayKey && cachedData) {
        console.log("Loading verse and insights from localStorage for today.");
        const data = JSON.parse(cachedData);
        setCurrentVerse(data.verse);
        verseTextEl.textContent = getCurrentVerse().text;
        verseRefEl.textContent = getCurrentVerse().reference;
        renderVerseCarousel(data.insights);
        return; 
    }

    verseTextEl.textContent = "Generating verse...";
    verseRefEl.textContent = "";

    try {
        let verseHistory = getVerseHistory();
        const versesToExclude = verseHistory.slice(Math.max(0, 150)); 
        let exclusionInstruction = versesToExclude.length > 0 ? ` Ensure the verse reference is NOT one of these: ${versesToExclude.join(', ')}.` : "";
        const versePrompt = `Provide one inspirational Bible verse from the NLT (New Living Translation), including its reference. Try to select a verse that is not extremely common and that can easily be used for inspiration or to give wisdom for future or present issues.${exclusionInstruction} Format it strictly as 'VERSE_TEXT (Book Chapter:Verse NLT)' with no extra commentary or formatting.`;
        
        const geminiVerseResponse = await callGemini([{ parts: [{ text: versePrompt }] }]);
        
        const strictMatch = geminiVerseResponse.match(/(.*)\s\(([^)]+)\sNLT\)/i);
        if (!strictMatch) throw new Error("Verse response format was incorrect.");
        
        const [_, text, reference] = strictMatch;
        setCurrentVerse({ text: text.trim(), reference: `${reference.trim()} NLT` });
        addVerseToHistory(getCurrentVerse().reference); 

        verseTextEl.textContent = getCurrentVerse().text;
        verseRefEl.textContent = getCurrentVerse().reference;

        generateAndDisplayVerseInsights(getCurrentVerse()); // Pass the new verse directly

    } catch (error) {
        console.error("Error fetching verse of the day from Gemini:", error);
        verseTextEl.textContent = `Failed to load verse. Falling back to a local one.`;
        verseRefEl.textContent = "Error";
        updateVerseFromLocalList(); 
    }
}

export async function generateAndDisplayVerseInsights(verseToAnalyze) {
    const track = document.getElementById('gemini-verse-insight-track');
    if(track) track.innerHTML = `<div class="carousel-slide flex items-center justify-center w-full h-full"><div class="spinner"></div><span class="ml-2">Loading...</span></div>`;

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
        const insights = await callGemini([{ parts: [{ text: insightPrompt }] }], "gemini-2.5-flash", verseInsightSchema);
        renderVerseCarousel(insights);

        const todayKey = new Date().toISOString().slice(0, 10);
        localStorage.setItem('lastVerseDate', todayKey);
        localStorage.setItem('verseData', JSON.stringify({ verse: verseToAnalyze, insights: insights }));

    } catch (error) {
        console.error("Failed to fetch consolidated insights:", error);
        if (track) track.innerHTML = `<div class="carousel-slide p-4 text-center">Could not load insights.</div>`;
    }
}

export async function fetchActivityIdeas() {
    const refreshButton = document.getElementById('refresh-ideas');
    const insightTrack = document.getElementById('gemini-weather-insight-track');
    
    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.innerHTML = '<div class="spinner w-4 h-4"></div>';
    }
    if (insightTrack) insightTrack.innerHTML = `<div class="carousel-slide flex items-center justify-center text-center"><span class="text-lg">✨ Loading personalized activity ideas...</span></div>`; 
    
    document.getElementById('prev-idea').classList.add('hidden');
    document.getElementById('next-idea').classList.add('hidden');
    document.getElementById('idea-counter').classList.add('hidden');

    const rawWeatherData = getRawWeatherData();
    if (!rawWeatherData) { 
        if (insightTrack) insightTrack.innerHTML = `<div class="carousel-slide text-center"><p>Weather data not yet available.</p></div>`; 
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i>';
        }
        lucide.createIcons();
        return; 
    }
    const weatherContext = `Today\'s forecast is: ${rawWeatherData.current.description}, with a temperature of ${rawWeatherData.current.temp}°. The high for today will be ${rawWeatherData.forecast[0].maxTemp}° and the low will be ${rawWeatherData.forecast[0].minTemp}°. The chance of rain is ${rawWeatherData.forecast[0].pop}%.`;
    const prompt = `You are a helpful local guide for the Andrew Weaver family with 7 children: Liam (9), Kaci (12), Declan (11), Halle (11), Malia (13), Olivia (17). Andrew is a Caucasian male, 37 years old. His wife Jenna is 37. Based on this weather information for Greer, SC: "${weatherContext}". Provide 10 diverse ideas for fun family activities or local events. Ensure a mix of creative (e.g., arts/crafts, storytelling), physical (e.g., sports, active games), quiet (e.g., reading, puzzles), family friendly local events(free preferred) and adventurous (e.g., exploring parks, new places) activities. Include both at-home (indoor or outdoor) and local (near Greer, SC) options. For each idea, provide a "title" and a short but detailed "description". Do NOT include any information or suggestions about parental supervision in the response.`;
    
    try {
        const parsedJson = await callGemini([{ parts: [{ text: prompt }] }], "gemini-2.5-flash", activitySchema);
        setActivityIdeas(parsedJson.activities || []);
        if (getActivityIdeas().length > 0) {
            renderActivityCarousel();
        } else {
            if (insightTrack) insightTrack.innerHTML = `<div class="carousel-slide text-center"><p>Sorry, couldn\'t get ideas right now.</p></div>`;
        }
    } catch (error) {
        console.error("Error calling Gemini API for weather:", error);
        if (insightTrack) insightTrack.innerHTML = `<div class="carousel-slide text-center"><p>Sorry, couldn\'t get ideas right now due to an API error.</p></div>`;
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i>';
        }
        lucide.createIcons();
    }
}

export async function handleAskGemini() {
    const questionInput = document.getElementById('gemini-question-input');
    const submitButton = document.getElementById('submit-gemini-question');
    
    const question = questionInput.value.trim();
    if (!question) return;

    // Add user message to history and render
    const currentHistory = getGeminiChatHistory();
    setGeminiChatHistory([...currentHistory, { role: 'user', parts: [{ text: question }] }]);
    renderChatHistory();
    questionInput.value = ''; // Clear input

    submitButton.disabled = true;
    submitButton.innerHTML = '<div class="spinner w-5 h-5"></div>';

    // Add a thinking indicator
    const answerContainer = document.getElementById('gemini-answer-container');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'chat-message model-message';
    thinkingDiv.innerHTML = '<div class="spinner w-5 h-5"></div>';
    answerContainer.appendChild(thinkingDiv);
    thinkingDiv.scrollIntoView({ behavior: "smooth", block: "start" });


    const safetyPrompt = `
                  You are a friendly, patient, and knowledgeable AI assistant for children.
                  A child has asked the following question: "${question}"
                  
                  Your task is to answer this question in a way that is simple, engaging, and easy for a child (ages 8-13) to understand. Use analogies and simple examples where possible. 
                  
                  IMPORTANT SAFETY RULES:
                  - You MUST NOT answer questions about or use language related to violence, weapons, self-harm, hate speech, sexual topics, drugs, alcohol, gambling, or any other mature or inappropriate themes.
                  - If the user\'s question touches on any of these forbidden topics, you MUST refuse to answer directly. Instead, respond with a gentle and friendly refusal like: "That\'s a very grown-up question! I\'m here to help with topics like science, animals, history, and homework. How about we talk about something else, like why dinosaurs are so cool?" and encourage the child to speak to their parents about that topic.
                  - Keep your answers positive and encouraging.
            `;
    
    // Prepend safety prompt to the first user message only
    const conversationToSend = JSON.parse(JSON.stringify(getGeminiChatHistory()));
    if (conversationToSend.length === 2) { // First user message
        conversationToSend[1].parts[0].text = safetyPrompt;
    }

    try {
        const answer = await callGemini(conversationToSend);
        const currentHistory = getGeminiChatHistory();
        setGeminiChatHistory([...currentHistory, { role: 'model', parts: [{ text: answer }] }]);
    } catch (error) {
        console.error("Error asking Gemini:", error);
        const currentHistory = getGeminiChatHistory();
        setGeminiChatHistory([...currentHistory, { role: 'model', parts: [{ text: "Sorry, I had trouble thinking of an answer. Please try again!" }] }]);
    } finally {
        renderChatHistory(); // Render the final response (or error)
        submitButton.disabled = false;
        submitButton.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i>';
        lucide.createIcons();
    }
}

export async function fetchConversationStarter() {
    const questionEl = document.getElementById('starter-question');
    const refreshBtn = document.getElementById('refresh-starter');
    
    refreshBtn.disabled = true;
    questionEl.textContent = 'Thinking of a new question...';

    // Get history to avoid repetition
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
        questionEl.textContent = question;

        // Update history
        questionHistory.push(question);
        if (questionHistory.length > 10) { // Keep the last 10 questions
            questionHistory.shift();
        }
        localStorage.setItem('questionHistory', JSON.stringify(questionHistory));

    } catch (error) {
        console.error("Error fetching conversation starter:", error);
        questionEl.textContent = 'What is your favorite family memory?'; // Fallback question
    } finally {
        refreshBtn.disabled = false;
    }
} 

const didYouKnowSchema = {
    type: "STRING"
};

export async function fetchDidYouKnowFactForWord(word) {
    const prompt = `Provide a single, short, and interesting "Did You Know?" fact about the word "${word}" that would appeal to children aged 9-14. The fact should be concise and engaging. Do not include any introductory phrases like "Did you know that..." or "Fun fact:". Just provide the fact.`;
    try {
        const fact = await callGemini([{ parts: [{ text: prompt }] }], "gemini-2.5-flash", didYouKnowSchema);
        return fact.trim();
    } catch (error) {
        console.error(`Error fetching "Did You Know?" fact for word '${word}':`, error);
        return null;
    }
}

export async function showFeelingResponse(feeling, coreEmotion) {
    const modalOverlay = document.getElementById('feeling-insight-modal-overlay');
    const titleEl = document.getElementById('feeling-insight-title');
    const bodyEl = document.getElementById('feeling-insight-body');

    titleEl.textContent = `Understanding "${feeling}"`;
    bodyEl.innerHTML = `<div class="flex items-center justify-center"><div class="spinner w-8 h-8"></div><p class="ml-3 text-lg">Generating some helpful insight...</p></div>`;
    modalOverlay.style.display = 'flex';
    lucide.createIcons();

    const prompt = `
                Act as a helpful and empathetic family counselor using principles from emotional intelligence and cognitive behavioral therapy (CBT).
A person in a family context has identified their feeling as "${feeling}," which is part of the core emotion of "${coreEmotion}."

                Please provide a response in JSON format that is simple, scientifically-backed, and suitable for a general audience including children (8+), teens, and adults. The tone should be reassuring and constructive.

                The JSON object should contain two keys:
                1. "explanation": A string that briefly and simply explains what this feeling is and a common reason why people experience it. (e.g., "Feeling hurt is a natural response when our feelings are dismissed or someone is unkind...")
                2. "strategies": An array of at least two JSON objects, each with a "title" and a "description" for a simple, actionable, and positive coping strategy. (e.g., title: "Name The Feeling", description: "Simply saying \'I feel hurt because...\' can help make the feeling less overwhelming.")
            `;

    try {
        const insight = await callGemini([{ parts: [{ text: prompt }] }], "gemini-2.5-flash", feelingInsightSchema);
        let strategiesHTML = (insight.strategies || []).map(strategy => `
                    <div class="mt-4">
                        <h4 class="font-bold text-lg text-white/90">${strategy.title}</h4>
                        <p class="text-white/80">${strategy.description}</p>
                    </div>
                `).join('');

        bodyEl.innerHTML = `
                    <p class="text-lg text-white/90">${insight.explanation}</p>
                    <h3 class="text-xl font-semibold mt-6 mb-2 border-t border-white/20 pt-4">What you can do:</h3>
                    ${strategiesHTML}
                `;
    } catch (error) {
        console.error("Error fetching feeling insight:", error);
        bodyEl.innerHTML = `<p class="text-red-400">Sorry, I had trouble generating an insight for that feeling. The most important thing is to be kind to yourself and talk to someone you trust about how you're feeling.</p>`;
    }
}