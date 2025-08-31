import { MERRIAM_WEBSTER_COLLEGIATE_API_KEY, MERRIAM_WEBSTER_THESAURUS_API_KEY } from '../config.js';
import { fetchAgeAppropriateWordFromGemini } from '../scripts/gemini.js'; // Import the new function

const DICTIONARY_API_URL = "https://www.dictionaryapi.com/api/v3/references/collegiate/json/";
const THESAURUS_API_URL = "https://www.dictionaryapi.com/api/v3/references/ithesaurus/json/";

let cachedWordData = null;
const WORD_HISTORY_LENGTH = 50; // Keep history of last 50 words

// Helper function to construct audio URL
function getAudioUrl(audioFilename) {
    if (!audioFilename) return null;
    let subdirectory;
    if (audioFilename.startsWith('bix')) {
        subdirectory = 'bix';
    } else if (audioFilename.startsWith('gg')) {
        subdirectory = 'gg';
    } else if (audioFilename.match(/^[0-9]/)) {
        subdirectory = 'number';
    } else {
        subdirectory = audioFilename.charAt(0);
    }
    // Corrected URL structure based on Merriam-Webster documentation
    return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${audioFilename}.mp3`;
}

// Helper function to clean Merriam-Webster markup
function cleanMarkup(text) {
    if (!text) return '';
    // Remove {bc}, {sx|...||}, {it}, {/it}, {d_link|...}, {a_link|...}, {gloss|...}, {dx_link|...}, {a_link|...}, {dx|...}, {sc}, {/sc}
    return text.replace(/\{.*?\}/g, '').replace(/\s+/g, ' ').trim();
}

// Functions to manage word history in localStorage
function getWordHistory() {
    try {
        return JSON.parse(localStorage.getItem('wordHistory') || '[]');
    } catch (e) {
        console.error("Error parsing word history from localStorage:", e);
        return [];
    }
}

function addWordToHistory(word) {
    let history = getWordHistory();
    // Remove the word if it already exists to move it to the end (most recent)
    history = history.filter(w => w.toLowerCase() !== word.toLowerCase());
    history.push(word);
    // Trim history to WORD_HISTORY_LENGTH
    if (history.length > WORD_HISTORY_LENGTH) {
        history = history.slice(history.length - WORD_HISTORY_LENGTH);
    }
    localStorage.setItem('wordHistory', JSON.stringify(history));
}

export async function fetchWordOfTheDay() {
    try {
        const wordHistory = getWordHistory();
        const randomWord = await fetchAgeAppropriateWordFromGemini(wordHistory); // Pass history to Gemini

        if (!randomWord) {
            console.warn("Gemini did not return a word.");
            return null;
        }

        // Add the fetched word to history
        addWordToHistory(randomWord);

        // Fetch definition from Merriam-Webster Collegiate Dictionary API
        const dictionaryResponse = await fetch(`${DICTIONARY_API_URL}${randomWord}?key=${MERRIAM_WEBSTER_COLLEGIATE_API_KEY}`);
        if (!dictionaryResponse.ok) {
            throw new Error(`HTTP error! status: ${dictionaryResponse.status}`);
        }
        const dictionaryData = await dictionaryResponse.json();

        console.log(`Processing word: ${randomWord}. Raw dictionary data:`, JSON.stringify(dictionaryData, null, 2));

        if (!dictionaryData || dictionaryData.length === 0 || typeof dictionaryData[0] === 'string') {
            console.warn(`No valid dictionary data for ${randomWord}. API response:`, dictionaryData);
            return null;
        }

        const wordEntry = dictionaryData.find(entry => entry.meta && entry.meta.id.toLowerCase().startsWith(randomWord.toLowerCase()));

        if (!wordEntry || !wordEntry.meta || !wordEntry.hwi || !wordEntry.def) {
            console.warn(`Invalid dictionary data structure for ${randomWord}. Word entry:`, wordEntry, `Raw data:`, JSON.stringify(dictionaryData, null, 2));
            return null;
        }

        const word = wordEntry.meta.id.split(':')[0];
        const phonetic = wordEntry.hwi.prs && wordEntry.hwi.prs[0] ? wordEntry.hwi.prs[0].mw : 'N/A';
        const partOfSpeech = wordEntry.fl;

        // Definitions from Collegiate API are in 'def' array, each element is a definition object
        // We need to extract the 'dt' (definition text) and clean it.
        const definitions = wordEntry.def.map(def => {
            if (def.sseq) {
                // sseq is an array of arrays, each containing a sense object
                const sense = def.sseq[0][0][1]; // Get the first sense object
                if (sense && sense.dt) {
                    const dtText = sense.dt.find(item => item[0] === 'text');
                    return dtText ? cleanMarkup(dtText[1]) : '';
                }
            }
            return '';
        }).filter(Boolean);

        // Extract audio filename
        const audioFilename = wordEntry.hwi.prs?.[0]?.sound?.audio;
        const audioUrl = getAudioUrl(audioFilename);

        // Extract example sentences from 'def' array, looking for 'vis' (verbal illustration)
        const examples = [];
        wordEntry.def.forEach(def => {
            if (def.sseq) {
                def.sseq.forEach(sseqItem => {
                    sseqItem.forEach(item => {
                        if (item[0] === 'sense' && item[1].dt) {
                            item[1].dt.forEach(dtItem => {
                                if (dtItem[0] === 'vis') {
                                    dtItem[1].forEach(visItem => {
                                        examples.push(cleanMarkup(visItem.t));
                                    });
                                }
                            });
                        }
                    });
                });
            }
        });

        // Fetch thesaurus data for synonyms and antonyms (still using Intermediate Thesaurus API)
        const thesaurusResponse = await fetch(`${THESAURUS_API_URL}${word}?key=${MERRIAM_WEBSTER_THESAURUS_API_KEY}`);
        if (!thesaurusResponse.ok) {
            console.warn(`Thesaurus API error for word "${word}": status ${thesaurusResponse.status}`);
        }
        const thesaurusData = await thesaurusResponse.json();
        let synonyms = thesaurusData?.[0]?.meta?.syns?.[0] || [];
        let antonyms = thesaurusData?.[0]?.meta?.ants?.[0] || [];

        return { word, phonetic, partOfSpeech, definitions, synonyms, antonyms, audioUrl, examples };

    } catch (error) {
        console.error("Error fetching word of the day:", error);
        return null;
    }
}

export function displayWordOfTheDay(wordData) {
    const modalOverlay = document.getElementById('word-of-the-day-modal-overlay');
    const wordTitle = document.getElementById('word-of-the-day-title');
    const wordPhonetic = document.getElementById('word-of-the-day-phonetic');
    const wordPartOfSpeech = document.getElementById('word-of-the-day-part-of-speech');
    const wordDefinitions = document.getElementById('word-of-the-day-definitions');
    const wordExamples = document.getElementById('word-of-the-day-examples');

    if (!wordData) {
        wordTitle.textContent = "Word of the Day Unavailable";
        wordPhonetic.textContent = "";
        wordPartOfSpeech.textContent = "";
        wordDefinitions.innerHTML = "<p>Could not load the word of the day. Please try again later.</p>";
        wordExamples.innerHTML = "";
        return;
    }

    wordTitle.textContent = wordData.word;
    wordPhonetic.innerHTML = `/${wordData.phonetic}/`; // Use innerHTML to allow for icon
    if (wordData.audioUrl) {
        wordPhonetic.innerHTML += ` <i data-lucide="volume-2" class="w-5 h-5 inline-block cursor-pointer ml-2" onclick="new Audio('${wordData.audioUrl}').play()"></i>`;
    }
    wordPartOfSpeech.textContent = wordData.partOfSpeech;

    wordDefinitions.innerHTML = wordData.definitions.map((def, index) => `
        <p>${index + 1}. ${def}</p>
    `).join('');

    let examplesHtml = '';
    if (wordData.examples && wordData.examples.length > 0) {
        examplesHtml += `<p class="font-semibold mt-4">Examples:</p>`;
        wordData.examples.forEach(example => {
            examplesHtml += `<p class="italic">"${example}"</p>`;
        });
    }

    if (wordData.synonyms.length > 0) {
        examplesHtml += `<p class="font-semibold mt-4">Synonyms:</p><p>${wordData.synonyms.join(', ')}</p>`;
    }
    if (wordData.antonyms.length > 0) {
        examplesHtml += `<p class="font-semibold mt-2">Antonyms:</p><p>${wordData.antonyms.join(', ')}</p>`;
    }
    wordExamples.innerHTML = examplesHtml;
}

export async function initializeWordOfTheDay() {
    const wordOfTheDayBtn = document.getElementById('word-of-the-day-btn');
    const modalOverlay = document.getElementById('word-of-the-day-modal-overlay');
    const closeModalBtn = document.getElementById('close-word-of-the-day-modal');

    if (wordOfTheDayBtn) {
        wordOfTheDayBtn.addEventListener('click', () => {
            if (cachedWordData) {
                displayWordOfTheDay(cachedWordData);
                modalOverlay.style.display = 'flex';
                lucide.createIcons();
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                modalOverlay.style.display = 'none';
            }
        });
    }

    // Fetch and display the word of the day on initial load
    cachedWordData = await fetchWordOfTheDay();
    if (cachedWordData) {
        document.getElementById('word-of-the-day-text').textContent = cachedWordData.word;
    }
}