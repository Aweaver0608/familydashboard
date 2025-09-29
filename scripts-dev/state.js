let currentVerse = {};
let rawWeatherData = null;
let activityIdeas = [];
let verseInsights = [];
let currentIdeaIndex = 0;
let currentVerseInsightIndex = 0;
const VERSE_HISTORY_LENGTH = 365;
let selectedPersonForMood = null;
let geminiChatHistory = [];
let allPrayers = [];

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
export function getAllPrayers() { return allPrayers; }
export function setAllPrayers(prayers) { allPrayers = prayers; }