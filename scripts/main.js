import { initializeFirebase, listenForPrayerRequests, addPrayerRequest, updatePrayerRequest, addPrayerAnswer, updatePrayerAnswer, getCurrentPrayerDocId } from './firebase.js';
import { fetchActivityIdeas, askGemini, fetchConversationStarter } from './gemini.js';
import { updateTime, updateStaticBackground, updateVerseFromLocalList, showVerseInsight, showActivityIdea, initializeFeelingsWheel, initializeFeelingInsightModal, renderChatHistory, renderPrayerLists, initializeSmartSearchHelpModal, initializeSearchOperatorDropdown, renderActivityCarousel, showPrayerListView, showAddRequestView, showEditRequestView, showAnswerRequestView, checkRecentPrayerRequests, setAllPrayers } from './ui.js';
import { initializeWordOfTheDay } from './word-of-the-day.js';
import { initializeQuoteOfTheDay } from './quote-of-the-day.js';

import { WEATHER_CITY_DETAILS, FAMILY_MEMBERS, FEELINGS_WHEEL, WEATHER_IMAGES, NLT_VERSES_FOR_DAY } from '/config.js';

// --- Global State Variables ---
let currentVerse = {};
let rawWeatherData = null;
let activityIdeas = [];
let verseInsights = [];
let currentIdeaIndex = 0;
let currentVerseInsightIndex = 0;
const VERSE_HISTORY_LENGTH = 365;
let selectedPersonForMood = null;
let geminiChatHistory = [];
let currentWeatherContext = ''; // New global variable

export function getRawWeatherData() { return rawWeatherData; }
export function setRawWeatherData(data) { rawWeatherData = data; }
export function getCurrentVerse() { return currentVerse; }
export function setCurrentVerse(verse) { currentVerse = verse; }
export function getActivityIdeas() { return activityIdeas; }
export function setActivityIdeas(ideas) { activityIdeas = ideas; }
export function getVerseInsights() { return verseInsights; }
export function setVerseInsights(insights) { verseInsights = insights; }
export function getCurrentIdeaIndex() { return currentIdeaIndex; }
export function setCurrentIdeaIndex(index) { currentIdeaIndex = index; }
export function getCurrentVerseInsightIndex() { return currentVerseInsightIndex; }
export function setCurrentVerseInsightIndex(index) { currentVerseInsightIndex = index; }
export function getSelectedPersonForMood() { return selectedPersonForMood; }
export function setSelectedPersonForMood(person) { selectedPersonForMood = person; }
export function getGeminiChatHistory() { return geminiChatHistory; }
export function setGeminiChatHistory(history) { geminiChatHistory = history; }

export async function refreshActivityIdeas() {
    const refreshButton = document.getElementById('refresh-ideas');
    const insightTrack = document.getElementById('gemini-weather-insight-track');
    const originalButtonContent = refreshButton.innerHTML; // Store original content

    refreshButton.disabled = true;
    refreshButton.innerHTML = '<div class="spinner w-5 h-5"></div>'; // Show spinner only
    lucide.createIcons(); // Re-render icons if any

    // Display loading indicator in the insight track area
    insightTrack.innerHTML = `<div class="carousel-slide text-center flex items-center justify-center"><div class="spinner w-5 h-5 mr-2"></div> Loading new ideas...</div>`;

    try {
        if (!currentWeatherContext) {
            console.warn("No weather context available to refresh activity ideas. Attempting to fetch weather.");
            await fetchCurrentConditions(); // Re-fetch weather to get context
            if (!currentWeatherContext) {
                console.error("Still no weather context after re-fetch. Cannot refresh activity ideas.");
                insightTrack.innerHTML = `<div class="carousel-slide text-center"><p>Sorry, couldn't get ideas right now. Weather data unavailable.</p></div>`;
                return; // Exit early if no context
            }
        }

        const ideas = await fetchActivityIdeas(currentWeatherContext);
        setActivityIdeas(ideas);
        if (ideas.length > 0) {
            renderActivityCarousel(); // This will re-render the carousel with new ideas
        } else {
            insightTrack.innerHTML = `<div class="carousel-slide text-center"><p>Sorry, couldn't get ideas right now.</p></div>`;
        }
    } finally {
        refreshButton.disabled = false;
        refreshButton.innerHTML = originalButtonContent; // Restore original content
        lucide.createIcons(); // Re-render icons if any
    }
}

async function handleAddPrayerRequest() {
    const requestInput = document.getElementById('prayer-request-text');
    const requestText = requestInput.value.trim();
    const name = document.getElementById('prayer-requester-name').value;
    
    if (!requestText) {
        console.warn("Prayer request text cannot be empty.");
        requestInput.classList.add('error');
        setTimeout(() => requestInput.classList.remove('error'), 2000);
        return;
    }
    try {
        await addPrayerRequest(name, requestText);
        showPrayerListView();
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

async function handleUpdateRequest() {
    const requestInput = document.getElementById('prayer-request-text');
    const requestText = requestInput.value.trim();
    const name = document.getElementById('prayer-requester-name').value;
    const prayerId = document.getElementById('edit-prayer-id').value;

    if (!requestText) {
        console.warn("Prayer request text cannot be empty.");
        requestInput.classList.add('error');
        setTimeout(() => requestInput.classList.remove('error'), 2000);
        return;
    }

    try {
        await updatePrayerRequest(prayerId, name, requestText);
        showPrayerListView();
    } catch (e) {
        console.error("Error updating document: ", e);
    }
}

async function handleAddPrayerAnswer() {
    const answerInput = document.getElementById('prayer-answer-text');
    const answerText = answerInput.value.trim();
    const prayerId = getCurrentPrayerDocId();
     if (!answerText || !prayerId) {
        console.error("Answer text or document ID is missing.");
         if (!answerText) {
             answerInput.classList.add('error');
             setTimeout(() => answerInput.classList.remove('error'), 2000);
         }
        return;
    }
    try {
        await addPrayerAnswer(prayerId, answerText);
        showPrayerListView();
    } catch (e) {
        console.error("Error updating document: ", e);
    }
}

async function handleUpdateAnswer() {
    const answerInput = document.getElementById('prayer-answer-text');
    const answerText = answerInput.value.trim();
    const prayerId = document.getElementById('edit-prayer-id').value;

    if (!answerText) {
        console.warn("Answer text cannot be empty.");
        answerInput.classList.add('error');
        setTimeout(() => answerInput.classList.remove('error'), 2000);
        return;
    }

    try {
        await updatePrayerAnswer(prayerId, answerText);
        showPrayerListView();
    } catch (e) {
        console.error("Error updating document: ", e);
    }
}

function initializePrayerRequests() {
    const openBtn = document.getElementById('open-prayer-modal');
    const closeBtn = document.getElementById('close-prayer-modal');
    const modalOverlay = document.getElementById('prayer-modal-overlay');
    const addNewBtn = document.getElementById('add-new-prayer-request-btn');
    const cancelBtn = document.getElementById('cancel-prayer-request-btn');
    const submitRequestBtn = document.getElementById('submit-prayer-request-btn');
    const submitAnswerBtn = document.getElementById('submit-prayer-answer-btn');
    const updateRequestBtn = document.getElementById('update-prayer-request-btn');
    const updateAnswerBtn = document.getElementById('update-prayer-answer-btn');

    openBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'flex';
        showPrayerListView();
    });
    closeBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        showPrayerListView();
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.style.display = 'none';
            showPrayerListView();
        }
    });

    addNewBtn.addEventListener('click', showAddRequestView);
    cancelBtn.addEventListener('click', showPrayerListView);
    submitRequestBtn.addEventListener('click', handleAddPrayerRequest);
    submitAnswerBtn.addEventListener('click', handleAddPrayerAnswer);
    updateRequestBtn.addEventListener('click', () => {
        if (window.confirm("Are you sure you want to update this prayer request?")) {
            handleUpdateRequest();
        }
    });
    updateAnswerBtn.addEventListener('click', () => {
        if (window.confirm("Are you sure you want to update this answer?")) {
            handleUpdateAnswer();
        }
    });
}

// --- APPLICATION LOGIC ---
document.addEventListener('DOMContentLoaded', function() {
    try {
        updateTime();
        initializeDashboard();
        initializeFeelingsWheel();
        initializeFeelingInsightModal();
        initializeFirebase().then(() => {
            listenForPrayerRequests((prayers, error) => {
                if (error) {
                    document.getElementById('current-requests-list').innerHTML = `<p class="text-red-400">Could not load requests. Check security rules.</p>`;
                    return;
                }
                setAllPrayers(prayers);
                renderPrayerLists();
                checkRecentPrayerRequests(prayers);
            });
        });
        initializePrayerRequests();
        initializeSmartSearchHelpModal();
        initializeSearchOperatorDropdown();
        initializeWordOfTheDay();
        initializeQuoteOfTheDay();
    
        document.getElementById('refresh-ideas').addEventListener('click', refreshActivityIdeas);
        document.getElementById('prev-idea').addEventListener('click', () => showActivityIdea(currentIdeaIndex - 1));
        document.getElementById('next-idea').addEventListener('click', () => showActivityIdea(currentIdeaIndex + 1)); 
        document.getElementById('prev-verse-insight').addEventListener('click', () => showVerseInsight(currentVerseInsightIndex - 1));
        document.getElementById('next-verse-insight').addEventListener('click', () => showVerseInsight(currentVerseInsightIndex + 1)); 
        document.getElementById('refresh-calendar').addEventListener('click', () => {
            document.getElementById('calendar-iframe').src = document.getElementById('calendar-iframe').src; 
        });
        document.getElementById('refresh-starter').addEventListener('click', updateConversationStarter);

        // --- Modal Listeners ---
        const geminiModalOverlay = document.getElementById('gemini-modal-overlay');
        document.getElementById('open-gemini-modal').addEventListener('click', () => {
            geminiModalOverlay.style.display = 'flex';
            initializeGeminiChat();
            lucide.createIcons(); 
        });
        document.getElementById('close-gemini-modal').addEventListener('click', () => {
            geminiModalOverlay.style.display = 'none';
        });
        geminiModalOverlay.addEventListener('click', (event) => {
            if (event.target === geminiModalOverlay) {
                geminiModalOverlay.style.display = 'none';
            }
        });
        document.getElementById('submit-gemini-question').addEventListener('click', handleAskGeminiUI);
        document.getElementById('gemini-question-input').addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleAskGeminiUI();
            }
        });


        // --- Verse Devotional Modal Listeners ---
        const verseWidget = document.getElementById('verse');
        const verseDevotionalModalOverlay = document.getElementById('verse-devotional-modal-overlay');
        const closeVerseDevotionalModalBtn = document.getElementById('close-verse-devotional-modal');

        verseWidget.addEventListener('click', () => {
            if (getVerseInsights().length > 0) {
                verseDevotionalModalOverlay.style.display = 'flex';
                lucide.createIcons();
            }
        });

        closeVerseDevotionalModalBtn.addEventListener('click', () => {
            verseDevotionalModalOverlay.style.display = 'none';
        });

        verseDevotionalModalOverlay.addEventListener('click', (event) => {
            if (event.target === verseDevotionalModalOverlay) {
                verseDevotionalModalOverlay.style.display = 'none';
            }
        });
        
        setInterval(updateTime, 1000);
        setInterval(fetchForecastData, 600000);
        setInterval(fetchCurrentConditions, 300000);

        lucide.createIcons();

        const searchInput = document.getElementById('prayer-search-input');
        searchInput.addEventListener('input', (e) => {
            renderPrayerLists(e.target.value);
        });

    } catch (error) {
        console.error("Critical error on startup:", error);
        document.body.innerHTML = `<div class="w-screen h-screen flex justify-center items-center text-2xl">A critical error occurred. Please refresh.</div>`;
    }
});

async function initializeDashboard() {
    await fetchForecastData();
    await fetchCurrentConditions();
    scheduleDailyVerseUpdate();
    updateConversationStarter();
}

async function updateConversationStarter() {
    const questionEl = document.getElementById('starter-question');
    const refreshBtn = document.getElementById('refresh-starter');
    const originalQuestionContent = questionEl.innerHTML; // Store original content of question element
    const originalButtonContent = refreshBtn.innerHTML; // Store original content of button

    refreshBtn.disabled = true;
    questionEl.innerHTML = '<div class="flex items-center justify-center"><div class="spinner w-5 h-5 mr-2"></div> Loading new question...</div>'; // Show spinner and text in question area

    try {
        const question = await fetchConversationStarter();
        questionEl.textContent = question;
    } catch (error) {
        console.error("Error fetching conversation starter:", error);
        questionEl.textContent = 'Failed to load question. Please try again.'; // Fallback message
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalButtonContent; // Restore original button content
        lucide.createIcons(); // Re-render icons if any
    }
}

async function scheduleDailyVerseUpdate() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); 
    const msUntilMidnight = midnight.getTime() - now.getTime();
    updateVerseFromLocalList(); 
    setTimeout(() => {
        setInterval(updateVerseFromLocalList, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
}

export function getVerseHistory() {
    try {
        return JSON.parse(localStorage.getItem('verseHistory') || '[]');
    } catch (e) { return []; }
}

export function addVerseToHistory(verseReference) {
    let history = getVerseHistory();
    const normalizedNewRef = verseReference.replace(/ NLT/i, '').trim();
    history = history.filter(ref => ref.replace(/ NLT/i, '').trim() !== normalizedNewRef); 
    history.push(verseReference); 
    if (history.length > VERSE_HISTORY_LENGTH) {
        history.shift();
    }
    localStorage.setItem('verseHistory', JSON.stringify(history));
}

async function fetchCurrentConditions() {
    const { lat, lon } = WEATHER_CITY_DETAILS;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open-Meteo API fetch failed: ${response.status}`);
        const data = await response.json();

        const current = data.current;
        document.getElementById('weather-temp').textContent = `${Math.round(current.temperature_2m)}°`;
        document.getElementById('weather-description').textContent = getWeatherDescription(current.weather_code);
        document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
        document.getElementById('feels-like').textContent = `${Math.round(current.apparent_temperature)}°`;
        document.getElementById('weather-icon').src = getWeatherIcon(current.weather_code, new Date().getHours() >= 6 && new Date().getHours() < 18);
        document.getElementById('chance-of-rain').textContent = `${Math.round(current.precipitation * 100)}%`;

        updateStaticBackground(getWeatherDescription(current.weather_code));

        document.getElementById('weather-loading').classList.add('hidden');
        document.getElementById('weather-content').classList.remove('hidden');

    } catch (error) {
        console.error('Error fetching Open-Meteo weather data:', error);
        document.getElementById('weather-loading').textContent = 'Weather Unavailable';
    }
}

async function fetchForecastData() {
    const { lat, lon } = WEATHER_CITY_DETAILS;
    const pointsUrl = `https://api.weather.gov/points/${lat},${lon}`;
    const headers = { 'User-Agent': '(FamilyDashboard, your-contact-email@example.com)' };

    try {
        const pointsResponse = await fetch(pointsUrl, { headers });
        if (!pointsResponse.ok) throw new Error(`NWS points lookup failed: ${pointsResponse.status}`);
        const pointsData = await pointsResponse.json();
        
        const forecastUrl = pointsData.properties.forecast;
        const hourlyForecastUrl = pointsData.properties.forecastHourly;

        const [forecastResponse, hourlyForecastResponse] = await Promise.all([
            fetch(forecastUrl, { headers }),
            fetch(hourlyForecastUrl, { headers })
        ]);

        if (!forecastResponse.ok) throw new Error(`NWS forecast fetch failed: ${forecastResponse.status}`);
        if (!hourlyForecastResponse.ok) throw new Error(`NWS hourly forecast fetch failed: ${hourlyForecastResponse.status}`);

        const forecastData = await forecastResponse.json();
        const hourlyData = await hourlyForecastResponse.json();

        const dailyPeriods = forecastData.properties.periods;
        const hourlyPeriods = hourlyData.properties.periods;

        const todayForecast = dailyPeriods.find(p => p.isDaytime === true);
        const tonightForecast = dailyPeriods.find(p => p.isDaytime === false);

        if (todayForecast) {
            document.getElementById('temp-high').textContent = `${todayForecast.temperature}°`;
        }

        if (tonightForecast) {
            document.getElementById('temp-low').textContent = `${tonightForecast.temperature}°`;
        }

        const hourlyForecastContainer = document.getElementById('hourly-forecast');
        hourlyForecastContainer.innerHTML = '';
        const now = new Date();
        const nextHours = hourlyPeriods.filter(h => new Date(h.startTime) > now).slice(0, 12);
        nextHours.forEach(hour => {
            const hourWrapper = document.createElement('div');
            hourWrapper.className = 'forecast-item';
            hourWrapper.innerHTML = `
                <p class="font-semibold" style="margin-bottom:-0.75rem;">${new Date(hour.startTime).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '')}</p>
                <div class="flex flex-col items-center justify-center">
                    <img class="w-12 h-12 my-1" src="${getNWSWeatherIcon(hour.shortForecast, hour.isDaytime)}" alt="Hourly forecast icon">
                    <span style="font-size:1rem; font-weight:700; margin-top:-0.5rem; line-height:1;">${hour.temperature}°</span>
                </div>
                <div class="flex items-center gap-0.5 text-xs">
                    <img src="https://raw.githubusercontent.com/basmilius/weather-icons/master/design/fill/animation-ready/umbrella.svg" class="w-5 h-5" alt="Umbrella icon">
                    <span>${hour.probabilityOfPrecipitation.value || 0}%</span>
                </div>`;
            hourlyForecastContainer.appendChild(hourWrapper);
        });

        const forecastContainerEl = document.getElementById('weather-forecast');
        forecastContainerEl.innerHTML = '';
        const uniqueDays = {};
        dailyPeriods.forEach(period => {
            const dayName = new Date(period.startTime).toLocaleDateString('en-US', { weekday: 'short' });
            if (!uniqueDays[dayName]) {
                uniqueDays[dayName] = { high: -Infinity, low: Infinity, pop: 0, icon: '', isDaytime: true };
            }
            uniqueDays[dayName].icon = getNWSWeatherIcon(period.shortForecast, true);

            if (period.isDaytime) {
                uniqueDays[dayName].high = Math.max(uniqueDays[dayName].high, period.temperature);
            } else {
                uniqueDays[dayName].low = Math.min(uniqueDays[dayName].low, period.temperature);
            }
            uniqueDays[dayName].pop = Math.max(uniqueDays[dayName].pop, period.probabilityOfPrecipitation.value || 0);
        });
        
        const forecastDays = Object.entries(uniqueDays).slice(1, 8);
        let diffs = [];
        forecastDays.forEach(([_, d]) => {
            if (d.low !== Infinity && d.high !== -Infinity) {
                diffs.push(d.high - d.low);
            }
        });
        const avgDiff = diffs.length ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0;

        forecastDays.forEach(([dayName, data]) => {
            const dayWrapper = document.createElement('div');
            dayWrapper.className = 'forecast-item';
            let lowDisplay = (data.low === Infinity) ? ((data.high !== -Infinity && avgDiff > 0) ? (data.high - avgDiff) : '--') : data.low;
            dayWrapper.innerHTML = `
                <p class="day-name" style="font-size:1.25rem; font-weight:700; margin-bottom:-0.75rem;">${dayName}</p>
                <div class="flex flex-col items-center justify-center">
                    <img class="w-12 h-12 my-1" src="${data.icon}" alt="Daily forecast icon">
                    <span style="font-size:1rem; font-weight:700; margin-top:-0.5rem; line-height:1;">${data.high}°/${lowDisplay}°</span>
                </div>
                <div class="flex items-center gap-1 text-xs">
                    <img class="w-5 h-5" src="https://raw.githubusercontent.com/basmilius/weather-icons/master/design/fill/animation-ready/umbrella.svg" class="w-5 h-5" alt="Umbrella icon">
                    <span>${data.pop}%</span>
                </div>`;
            forecastContainerEl.appendChild(dayWrapper);
        });

    } catch (error) {
        console.error('Error fetching NWS forecast data:', error);
    }
}

function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail',
    };
    return descriptions[code] || 'Unknown';
}

function getWeatherIcon(code, isDaytime) {
    let iconName = '';
    switch (code) {
        case 0: iconName = isDaytime ? 'clear-day' : 'clear-night'; break;
        case 1: iconName = isDaytime ? 'partly-cloudy-day' : 'partly-cloudy-night'; break;
        case 2: iconName = 'cloudy'; break;
        case 3: iconName = 'overcast'; break;
        case 45: case 48: iconName = 'mist'; break;
        case 51: case 53: case 55: case 56: case 57: iconName = 'drizzle'; break;
        case 61: case 63: case 65: case 66: case 67: iconName = 'rain'; break;
        case 71: case 73: case 75: case 77: iconName = 'snow'; break;
        case 80: case 81: case 82: iconName = 'showers'; break;
        case 85: case 86: iconName = 'snow'; break;
        case 95: case 96: case 99: iconName = 'thunderstorms'; break;
        default: iconName = isDaytime ? 'clear-day' : 'clear-night';
    }
    return `https://raw.githubusercontent.com/basmilius/weather-icons/master/production/fill/all/${iconName}.svg`;
}

function getNWSWeatherIcon(shortForecast, isDaytime) {
    let forecast = shortForecast.toLowerCase();
    let iconName = '';

    if (isDaytime) {
        forecast = forecast.replace(/night/g, '').replace(/evening/g, '').trim();
    } else {
        forecast = forecast.replace(/day/g, '').replace(/morning/g, '').replace(/afternoon/g, '').trim();
    }

    if (forecast.includes('thunderstorm')) {
        iconName = 'thunderstorms';
    } else if (forecast.includes('snow')) {
        iconName = 'snow';
    } else if (forecast.includes('rain') || forecast.includes('drizzle') || forecast.includes('showers')) {
        iconName = 'rain';
    } else if (forecast.includes('fog') || forecast.includes('mist')) {
        iconName = 'mist';
    } else if (forecast.includes('partly') || forecast.includes('mostly clear')) {
        iconName = isDaytime ? 'partly-cloudy-day' : 'partly-cloudy-night';
    } else if (forecast.includes('cloudy')) {
        iconName = 'cloudy';
    } else if (forecast.includes('overcast')) {
        iconName = 'overcast';
    } else if (forecast.includes('sunny') || forecast.includes('clear')) {
        iconName = isDaytime ? 'clear-day' : 'clear-night';
    } else {
        iconName = isDaytime ? 'clear-day' : 'clear-night';
    }
    
    return `https://raw.githubusercontent.com/basmilius/weather-icons/master/production/fill/all/${iconName}.svg`;
}

function initializeGeminiChat() {
    setGeminiChatHistory([{
        role: 'model',
        parts: [{ text: "Hi! I'm here to help. You can ask me anything about science, animals, history, or homework." }]
    }]);
    renderChatHistory();
}

async function handleAskGeminiUI() {
    const questionInput = document.getElementById('gemini-question-input');
    const submitButton = document.getElementById('submit-gemini-question');
    
    const question = questionInput.value.trim();
    if (!question) return;

    setGeminiChatHistory([...getGeminiChatHistory(), { role: 'user', parts: [{ text: question }] }]);
    renderChatHistory();
    questionInput.value = '';

    submitButton.disabled = true;
    submitButton.innerHTML = '<div class="spinner w-5 h-5"></div>';

    const answerContainer = document.getElementById('gemini-answer-container');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'chat-message model-message';
    thinkingDiv.innerHTML = '<div class="spinner w-5 h-5"></div>';
    answerContainer.appendChild(thinkingDiv);
    thinkingDiv.scrollIntoView({ behavior: "smooth", block: "start" });

    const answer = await askGemini(getGeminiChatHistory(), question);

    setGeminiChatHistory([...getGeminiChatHistory(), { role: 'model', parts: [{ text: answer }] }]);
    renderChatHistory();

    submitButton.disabled = false;
    submitButton.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i>';
    lucide.createIcons();
}