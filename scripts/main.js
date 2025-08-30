import { initializePrayerRequests, handleUpdateRequest, handleUpdateAnswer } from './firebase.js';
import { fetchVerseOfTheDayFromGemini, generateAndDisplayVerseInsights, fetchActivityIdeas, handleAskGemini, fetchConversationStarter } from './gemini.js';
import { updateTime, updateStaticBackground, updateVerseFromLocalList, showVerseInsight, showActivityIdea, initializeFeelingsWheel, initializeFeelingInsightModal, renderChatHistory, renderPrayerLists, initializeSmartSearchHelpModal } from './ui.js';

// --- CONFIGURATION ---
export const WEATHER_CITY_DETAILS = {
    name: "Greer,US",
    lat: 34.9368,
    lon: -82.2243
};
export const FAMILY_MEMBERS = ["Andrew", "Jenna", "Olivia", "Malia", "Kaci", "Declan", "Halle", "Liam"];

export const FEELINGS_WHEEL = {
    "Joyful": {
        icon: 'smile', value: 5, color: 'bg-yellow-500/50',
        feelings: ["Hopeful", "Energetic", "Creative", "Excited", "Passionate", "Enthusiastic", "Amused", "Delighted", "Optimistic", "Cheerful", "Daring", "Successful"]
    },
    "Strong": {
        icon: 'smile', value: 5, color: 'bg-green-500/50',
        feelings: ["Worthy", "Appreciated", "Respected", "Proud", "Confident", "Faithful", "Assured", "Inspired", "Caring", "Fulfilled", "Motivated", "Valuable"]
    },
    "Calm": {
        icon: 'meh', value: 4, color: 'bg-blue-500/50',
        feelings: ["Trusting", "Loving", "Present", "Relaxed", "Peaceful", "Comfortable", "Safe", "Content", "Serene", "Grounded"]
    },
    "Scared": {
        icon: 'frown', value: 2, color: 'bg-orange-500/50',
        feelings: ["Insecure", "Helpless", "Hopeless", "Anxious", "Rejected", "Confused", "Nervous", "Overwhelmed"]
    },
    "Sad": {
        icon: 'frown', value: 2, color: 'bg-indigo-500/50',
        feelings: ["Uncaring", "Hopeless", "Ashamed", "Depressed", "Miserable", "Desolate", "Guilty", "Stupid", "Lonely", "Bored", "Tired", "Sleepy"]
    },
    "Mad": {
        icon: 'angry', value: 1, color: 'bg-red-600/50',
        feelings: ["Hurt", "Worried", "Embarrassed", "Vulnerable", "Annoyed", "Defensive", "Sarcastic", "Frustrated", "Jealous", "Hostile", "Selfish", "Angry", "Critical", "Rattled"]
    }
};

// Static image URLs
export const WEATHER_IMAGES = {
    "clear sky": "https://images.pexels.com/photos/912364/pexels-photo-912364.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "few clouds": "https://images.pexels.com/photos/96622/pexels-photo-96622.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "scattered clouds": "https://images.pexels.com/photos/86695/pexels-photo-86695.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "broken clouds": "https://images.pexels.com/photos/695657/pexels-photo-695657.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "overcast clouds": "https://images.pexels.com/photos/8318263/pexels-photo-8318263.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "light rain": "https://images.pexels.com/photos/1529360/pexels-photo-1529360.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "moderate rain": "https://images.pexels.com/photos/459451/pexels-photo-459451.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "heavy intensity rain": "https://images.pexels.com/photos/2748716/pexels-photo-2748716.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "shower rain": "https://images.pexels.com/photos/1530423/pexels-photo-1530423.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "rain": "https://images.pexels.com/photos/1529360/pexels-photo-1529360.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "drizzle": "https://images.pexels.com/photos/1529360/pexels-photo-1529360.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "thunderstorm": "https://images.pexels.com/photos/1154510/pexels-photo-1154510.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "snow": "https://images.pexels.com/photos/954710/pexels-photo-954710.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "mist": "https://images.pexels.com/photos/163323/fog-dawn-landscape-morgenstimmung-163323.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "fog": "https://images.pexels.com/photos/163323/fog-dawn-landscape-morgenstimmung-163323.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920",
    "default": "https://images.pexels.com/photos/1431822/pexels-photo-1431822.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920"
};

export const NLT_VERSES_FOR_DAY = [
    { text: "For I know the plans I have for you,” says the Lord. “They are plans for good and not for disaster, to give you a future and a hope.", reference: "Jeremiah 29:11 NLT" },
    { text: "Fearing people is a dangerous trap, but trusting the Lord means safety.", reference: "Proverbs 29:25 NLT" },
];

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


// --- APPLICATION LOGIC ---
document.addEventListener('DOMContentLoaded', function() {
    try {
        updateTime();
        initializeDashboard();
        initializeFeelingsWheel();
        initializeFeelingInsightModal();
        initializePrayerRequests();
        initializeSmartSearchHelpModal();
        initializeSearchOperatorDropdown();
    
        document.getElementById('refresh-ideas').addEventListener('click', fetchActivityIdeas);
        document.getElementById('prev-idea').addEventListener('click', () => showActivityIdea(currentIdeaIndex - 1));
        document.getElementById('next-idea').addEventListener('click', () => showActivityIdea(currentIdeaIndex + 1)); 
        document.getElementById('prev-verse-insight').addEventListener('click', () => showVerseInsight(currentVerseInsightIndex - 1));
        document.getElementById('next-verse-insight').addEventListener('click', () => showVerseInsight(currentVerseInsightIndex + 1));
        document.getElementById('refresh-calendar').addEventListener('click', () => {
            document.getElementById('calendar-iframe').src = document.getElementById('calendar-iframe').src; 
        });
        document.getElementById('refresh-starter').addEventListener('click', fetchConversationStarter);

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
        document.getElementById('submit-gemini-question').addEventListener('click', handleAskGemini);
        document.getElementById('gemini-question-input').addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleAskGemini();
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
        setInterval(fetchWeather, 600000);

        lucide.createIcons();

        const updateRequestBtn = document.getElementById('update-prayer-request-btn');
        updateRequestBtn.addEventListener('click', () => {
            if (window.confirm("Are you sure you want to update this prayer request?")) {
                handleUpdateRequest();
            }
        });

        const updateAnswerBtn = document.getElementById('update-prayer-answer-btn');
        updateAnswerBtn.addEventListener('click', () => {
            if (window.confirm("Are you sure you want to update this answer?")) {
                handleUpdateAnswer();
            }
        });

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
    await fetchWeather(); // This already triggers activity ideas
    await scheduleDailyVerseUpdate();
    await fetchConversationStarter();
}

async function scheduleDailyVerseUpdate() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); 
    const msUntilMidnight = midnight.getTime() - now.getTime();
    await fetchVerseOfTheDayFromGemini(); 
    setTimeout(() => {
        setInterval(fetchVerseOfTheDayFromGemini, 24 * 60 * 60 * 1000);
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

async function fetchWeather() {
    const { lat, lon } = WEATHER_CITY_DETAILS;
    const pointsUrl = `https://api.weather.gov/points/${lat},${lon}`;
    const headers = { 'User-Agent': '(FamilyDashboard, your-contact-email@example.com)' };

    try {
        // Step 1: Fetch the grid endpoints from the points URL
        const pointsResponse = await fetch(pointsUrl, { headers });
        if (!pointsResponse.ok) throw new Error(`NWS points lookup failed: ${pointsResponse.status}`);
        const pointsData = await pointsResponse.json();
        
        const forecastUrl = pointsData.properties.forecast;
        const hourlyForecastUrl = pointsData.properties.forecastHourly;

        // Step 2: Fetch both forecast and hourly forecast data
        const [forecastResponse, hourlyForecastResponse] = await Promise.all([
            fetch(forecastUrl, { headers }),
            fetch(hourlyForecastUrl, { headers })
        ]);

        if (!forecastResponse.ok) throw new Error(`NWS forecast fetch failed: ${forecastResponse.status}`);
        if (!hourlyForecastResponse.ok) throw new Error(`NWS hourly forecast fetch failed: ${hourlyForecastResponse.status}`);

        const forecastData = await forecastResponse.json();
        const hourlyData = await hourlyForecastResponse.json();

        // Step 3: Process and display the data
        const dailyPeriods = forecastData.properties.periods;
        const hourlyPeriods = hourlyData.properties.periods;

        // Current conditions from the first hourly period
        const currentConditions = hourlyPeriods[0];
        document.getElementById('weather-temp').textContent = `${currentConditions.temperature}°`;
        document.getElementById('weather-description').textContent = currentConditions.shortForecast;
        document.getElementById('humidity').textContent = `${currentConditions.relativeHumidity.value}%`;
        // NWS doesn't provide a "feels like" temp, so we'll use the actual temp
        document.getElementById('feels-like').textContent = `${currentConditions.temperature}°`;

        // High/Low from the first daily period
        const todayForecast = dailyPeriods[0];
        document.getElementById('temp-high').textContent = `${todayForecast.temperature}°`;
        // Find the next period that is a "night" period for the low
        const tonightForecast = dailyPeriods.find(p => p.isDaytime === false);
        if(tonightForecast) {
            document.getElementById('temp-low').textContent = `${tonightForecast.temperature}°`;
        }
        
        // Set main icon
        document.getElementById('weather-icon').src = getWeatherIcon(todayForecast.shortForecast, todayForecast.isDaytime);
        updateStaticBackground(todayForecast.shortForecast);

        // Chance of rain
        const chanceOfRain = todayForecast.probabilityOfPrecipitation.value || 0;
        document.getElementById('chance-of-rain').textContent = `${chanceOfRain}%`;

        // Hourly forecast: start with the next upcoming hour
        const hourlyForecastContainer = document.getElementById('hourly-forecast');
        hourlyForecastContainer.innerHTML = '';
        const now = new Date();
        // Find the first hour that is after now
        const nextHours = hourlyPeriods.filter(h => new Date(h.startTime) > now).slice(0, 12);
        nextHours.forEach(hour => {
            const hourWrapper = document.createElement('div');
            hourWrapper.className = 'forecast-item';
            hourWrapper.innerHTML = `
                <p class="font-semibold" style="margin-bottom:-0.75rem;">${new Date(hour.startTime).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '')}</p>
                <div class="flex flex-col items-center justify-center">
                    <img class="w-12 h-12 my-1" src="${getWeatherIcon(hour.shortForecast, hour.isDaytime)}" alt="Hourly forecast icon">
                    <span style="font-size:1rem; font-weight:700; margin-top:-0.5rem; line-height:1;">${hour.temperature}°</span>
                </div>
                <div class="flex items-center gap-0.5 text-xs">
                    <img src="https://raw.githubusercontent.com/basmilius/weather-icons/master/design/fill/animation-ready/umbrella.svg" class="w-5 h-5" alt="Umbrella icon">
                    <span>${hour.probabilityOfPrecipitation.value || 0}%</span>
                </div>`;
            hourlyForecastContainer.appendChild(hourWrapper);
        });

        // Daily forecast
        const forecastContainerEl = document.getElementById('weather-forecast');
        forecastContainerEl.innerHTML = '';
        const uniqueDays = {};
        dailyPeriods.forEach(period => {
            const dayName = new Date(period.startTime).toLocaleDateString('en-US', { weekday: 'short' });
            if (!uniqueDays[dayName]) {
                uniqueDays[dayName] = { high: -Infinity, low: Infinity, pop: 0, icon: '', isDaytime: true };
            }
            if (period.isDaytime) {
                uniqueDays[dayName].high = Math.max(uniqueDays[dayName].high, period.temperature);
                uniqueDays[dayName].icon = getWeatherIcon(period.shortForecast, period.isDaytime);
            } else {
                uniqueDays[dayName].low = Math.min(uniqueDays[dayName].low, period.temperature);
            }
            uniqueDays[dayName].pop = Math.max(uniqueDays[dayName].pop, period.probabilityOfPrecipitation.value || 0);
        });
        
        // Calculate average high-low difference from previous days
        const forecastDays = Object.entries(uniqueDays).slice(1, 8);
        let diffs = [];
        forecastDays.forEach(([_, d]) => {
            if (d.low !== Infinity && d.high !== -Infinity) {
                diffs.push(d.high - d.low);
            }
        });
        const avgDiff = diffs.length ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0;

        forecastDays.forEach(([dayName, data], idx) => {
            const dayWrapper = document.createElement('div');
            dayWrapper.className = 'forecast-item';
            let lowDisplay;
            if (data.low === Infinity) {
                // Estimate low using average difference
                lowDisplay = (data.high !== -Infinity && avgDiff > 0) ? (data.high - avgDiff) : '--';
            } else {
                lowDisplay = data.low;
            }
            dayWrapper.innerHTML = `
                <p class="day-name" style="font-size:1.25rem; font-weight:700; margin-bottom:-0.75rem;">${dayName}</p>
                <div class="flex flex-col items-center justify-center">
                    <img class="w-12 h-12 my-1" src="${getWeatherIcon(data.icon)}" alt="Daily forecast icon">
                    <span style="font-size:1rem; font-weight:700; margin-top:-0.5rem; line-height:1;">${data.high}°/${lowDisplay}°</span>
                </div>
                <div class="flex items-center gap-1 text-xs">
                    <img class="w-5 h-5" src="https://raw.githubusercontent.com/basmilius/weather-icons/master/design/fill/animation-ready/umbrella.svg" alt="Umbrella icon">
                    <span>${data.pop}%</span>
                </div>`;
            forecastContainerEl.appendChild(dayWrapper);
        });


        document.getElementById('weather-loading').classList.add('hidden');
        document.getElementById('weather-content').classList.remove('hidden');

        // Prepare data for Gemini prompt
        setRawWeatherData({
            current: {
                temp: currentConditions.temperature,
                description: currentConditions.shortForecast,
            },
            forecast: [{
                maxTemp: todayForecast.temperature,
                minTemp: tonightForecast ? tonightForecast.temperature : todayForecast.temperature,
                pop: chanceOfRain
            }]
        });
        fetchActivityIdeas();

    } catch (error) {
        console.error('Error fetching NWS weather data:', error);
        document.getElementById('weather-loading').textContent = 'Weather Unavailable';
    }
}

function getWeatherIcon(shortForecast, isDaytime) {
    const forecast = shortForecast.toLowerCase();
    let iconName = '';

    if (forecast.includes('thunderstorm')) {
        iconName = 'thunderstorms';
    } else if (forecast.includes('snow')) {
        iconName = 'snow';
    } else if (forecast.includes('rain') || forecast.includes('drizzle') || forecast.includes('showers')) {
        if (forecast.includes('partly') || forecast.includes('chance') || forecast.includes('likely')) {
            iconName = isDaytime ? 'partly-cloudy-day-rain' : 'partly-cloudy-night-rain';
        } else {
            iconName = 'rain';
        }
    } else if (forecast.includes('overcast')) {
        iconName = 'overcast';
    } else if (forecast.includes('cloudy')) {
        iconName = 'cloudy';
    } else if (forecast.includes('partly') || forecast.includes('mostly clear')) {
        iconName = isDaytime ? 'partly-cloudy-day' : 'partly-cloudy-night';
    } else if (forecast.includes('sunny') || forecast.includes('clear')) {
        iconName = isDaytime ? 'clear-day' : 'clear-night';
    } else if (forecast.includes('fog') || forecast.includes('mist')) {
        iconName = 'mist';
    } else {
        iconName = isDaytime ? 'clear-day' : 'clear-night'; // Default
    }
    
    return `https://raw.githubusercontent.com/basmilius/weather-icons/master/design/fill/animation-ready/${iconName}.svg`;
}

function initializeGeminiChat() {
    setGeminiChatHistory([{
        role: 'model',
        parts: [{ text: "Hi! I'm here to help. You can ask me anything about science, animals, history, or homework." }]
    }]);
    renderChatHistory();
}