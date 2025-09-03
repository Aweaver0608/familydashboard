import { FAMILY_MEMBERS, FEELINGS_WHEEL, WEATHER_IMAGES, NLT_VERSES_FOR_DAY } from '../config.js';
import { getCurrentVerse, setCurrentVerse, getVerseInsights, setVerseInsights, getCurrentVerseInsightIndex, setCurrentVerseInsightIndex, getActivityIdeas, setCurrentIdeaIndex, getCurrentIdeaIndex, getSelectedPersonForMood, setSelectedPersonForMood, getGeminiChatHistory } from './main.js';
import { setCurrentPrayerDocId, getPin } from './firebase.js';
import { showFeelingResponse, generateAndDisplayVerseInsights } from './gemini.js';

let allPrayers = [];
let currentPinEntryPerson = null;
let isPinCreateMode = false; // New global variable // To store the name of the person for PIN entry

export function updateTime() {
    const now = new Date();
    const timeEl = document.getElementById('time');
    const ampmEl = document.getElementById('ampm');
    const dateEl = document.getElementById('date');
    if (!timeEl || !dateEl || !ampmEl) return;
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    ampmEl.textContent = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    timeEl.textContent = `${formattedHours}:${minutes}`;
    dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export async function updateStaticBackground(weatherDescription) {
    const bodyElement = document.body;
    const normalizedWeatherDescription = weatherDescription.toLowerCase();
    const imageUrl = WEATHER_IMAGES[normalizedWeatherDescription] || WEATHER_IMAGES.default;
    
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
        bodyElement.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${imageUrl}')`;
    };
    img.onerror = () => {
        bodyElement.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${WEATHER_IMAGES.default}')`;
    };
}

export function updateVerseFromLocalList() { 
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    setCurrentVerse(NLT_VERSES_FOR_DAY[dayOfYear % NLT_VERSES_FOR_DAY.length]);
    
    document.getElementById('verse-text').textContent = getCurrentVerse().text;
    document.getElementById('verse-reference').textContent = getCurrentVerse().reference;
    generateAndDisplayVerseInsights(getCurrentVerse());
}

export function renderVerseCarousel(insights) {
    const track = document.getElementById('gemini-verse-insight-track');
    const verseWidget = document.getElementById('verse');
    const indicator = document.getElementById('verse-click-indicator');
    if (!track) return;
    track.innerHTML = ''; 

    setVerseInsights([]);
    
    if (insights?.devotional) {
        const dev = insights.devotional;
        let devotionalContent = `
            <div class="p-4 text-left">
                <h5 class="font-semibold text-lg mb-2">${dev.title}</h5>
                <p class="text-base mb-4">${dev.story}</p>
                <h5 class="font-semibold text-lg mb-2">The Big Idea</h5>
                <p class="text-base mb-4 italic">"${dev.big_idea}"</p>
                <h5 class="font-semibold text-lg mb-2">Think About It</h5>
                <div class="text-base mb-4">${(dev.application_questions || []).map(q => `• ${q}`).join('<br>')}
</div>
                <h5 class="font-semibold text-lg mb-2">Prayer</h5>
                <p class="text-base mb-4">${dev.prayer}</p>
            </div>
        `;
        setVerseInsights([...getVerseInsights(), { title: 'Devotional', content: devotionalContent }]);
    }

    if (insights?.context) {
        let contextContent = `
            <div class="p-4 text-left">
                <h5 class="font-semibold text-lg mb-2">What was happening?</h5>
                <p class="text-base">${insights.context}</p>
            </div>
        `;
        setVerseInsights([...getVerseInsights(), { title: 'Context', content: contextContent }]);
    }

    getVerseInsights().forEach(insight => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.innerHTML = `<div class="scrollable-content h-full w-full">${insight.content}</div>`;
        track.appendChild(slide);
    });
    
    showVerseInsight(0);
    const prevBtn = document.getElementById('prev-verse-insight');
    const nextBtn = document.getElementById('next-verse-insight');
    if (getVerseInsights().length > 1) {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    } else {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
    }

    // Show indicator and make widget clickable
    if (indicator) indicator.classList.remove('hidden');
    if (verseWidget) verseWidget.classList.add('clickable');
    lucide.createIcons();
}

export function showVerseInsight(index) {
    const track = document.getElementById('gemini-verse-insight-track');
    const prevButton = document.getElementById('prev-verse-insight');
    const nextButton = document.getElementById('next-verse-insight');
    if (!track || !prevButton || !nextButton || !getVerseInsights() || getVerseInsights().length === 0) return;
    if (index < 0 || index >= getVerseInsights().length) return;
    
    setCurrentVerseInsightIndex(index);
    track.style.transform = `translateX(-${getCurrentVerseInsightIndex() * 100}%)`;
    prevButton.disabled = getCurrentVerseInsightIndex() === 0;
    nextButton.disabled = getCurrentVerseInsightIndex() >= getVerseInsights().length - 1;
}

export function renderActivityCarousel() {
    const insightTrack = document.getElementById('gemini-weather-insight-track');
    if (!insightTrack) return;

    insightTrack.innerHTML = ''; 
    getActivityIdeas().forEach(idea => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide flex flex-col items-center justify-center text-center'; 
        slide.innerHTML = `
            <h4 class="font-bold text-lg">${idea.title}</h4>
            <div class="scrollable-content" style="max-height: 150px; overflow-y: auto;">
                <p class="text-sm mt-1">${idea.description}</p>
            </div>
        `;
        insightTrack.appendChild(slide);
    });

    if (getActivityIdeas().length > 1) {
        document.getElementById('prev-idea').classList.remove('hidden');
        document.getElementById('next-idea').classList.remove('hidden');
        document.getElementById('idea-counter').classList.remove('hidden');
    }
    document.getElementById('refresh-ideas').classList.remove('hidden');
    showActivityIdea(0);
}

export function showActivityIdea(index) {
    const track = document.getElementById('gemini-weather-insight-track');
    const counter = document.getElementById('idea-counter');
    const prevButton = document.getElementById('prev-idea');
    const nextButton = document.getElementById('next-idea'); 
    if (!track || !counter || !prevButton || !nextButton || !getActivityIdeas() || getActivityIdeas().length === 0) return; 
    if (index < 0 || index >= getActivityIdeas().length) return;
    setCurrentIdeaIndex(index);
    track.style.transform = `translateX(-${getCurrentIdeaIndex() * 100}%)`;
    counter.textContent = `${getCurrentIdeaIndex() + 1} / ${getActivityIdeas().length}`;
    prevButton.disabled = getCurrentVerseInsightIndex() === 0;
    nextButton.disabled = getCurrentVerseInsightIndex() >= getVerseInsights().length - 1;
}

export function renderChatHistory() {
    const answerContainer = document.getElementById('gemini-answer-container');
    answerContainer.innerHTML = '';
    getGeminiChatHistory().forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.role === 'user' ? 'user-message' : 'model-message'}`;
        messageDiv.innerHTML = `<p>${message.parts[0].text.replace(/\n/g, '<br>')}</p>`;
        answerContainer.appendChild(messageDiv);
    });
    const lastMessage = answerContainer.lastElementChild;
    if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

export function initializeFeelingsWheel() {
    const modalOverlay = document.getElementById('feelings-modal-overlay');
    const openBtn = document.getElementById('mood-tracker-btn');
    const closeBtn = document.getElementById('close-feelings-modal');
    const pinEntryModalOverlay = document.getElementById('pin-entry-modal-overlay');
    const submitPinEntryBtn = document.getElementById('submit-pin-entry-btn'); // Get reference here
    
    openBtn.addEventListener('click', () => {
        showNameSelection();
        modalOverlay.style.display = 'flex';
        lucide.createIcons();
    });

    closeBtn.addEventListener('click', closeAndResetFeelingsModal);
    
    modalOverlay.addEventListener('click', (event) => {
        if(event.target === modalOverlay) {
            closeAndResetFeelingsModal();
        }
    });

    // Centralize PIN modal listeners
    if (pinEntryModalOverlay) {
        const closePinEntryModalBtn = document.getElementById('close-pin-entry-modal');
        submitPinEntryBtn.addEventListener('click', handlePinSubmit);
        closePinEntryModalBtn.addEventListener('click', () => {
            pinEntryModalOverlay.style.display = 'none';
        });
    }
    updateOverallMoodIcon();
}

function closeAndResetFeelingsModal() {
    const modalOverlay = document.getElementById('feelings-modal-overlay');
    modalOverlay.style.display = 'none';
    // Reset the view to name selection for the next time it opens
    document.getElementById('wheel-view').classList.add('hidden');
    document.getElementById('name-selection-view').classList.remove('hidden');
};

function getFamilyFeelings() {
    try {
        return JSON.parse(localStorage.getItem('familyFeelings') || '{}');
    } catch (e) { return {}; }
}

function saveFamilyFeelings(feelings) {
    localStorage.setItem('familyFeelings', JSON.stringify(feelings));
}

function showNameSelection() {
    const nameView = document.getElementById('name-selection-view');
    const wheelView = document.getElementById('wheel-view');
    const title = document.getElementById('feelings-modal-title');
    
    nameView.innerHTML = '';
    wheelView.innerHTML = ''; // Clear the wheel view
    nameView.classList.remove('hidden');
    wheelView.classList.add('hidden');
    title.textContent = 'How are you feeling?';

    const familyFeelings = getFamilyFeelings();

    FAMILY_MEMBERS.forEach(name => {
        const personData = familyFeelings[name];
        const button = document.createElement('button');
        button.className = 'name-btn';
        button.dataset.name = name;

        let lastFeelingHTML = '<span class="text-xs text-white/50">Click to select a feeling</span>';
        if (personData) {
            const lastUpdated = new Date(personData.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            lastFeelingHTML = `<span class="text-sm">${personData.feeling} <span class="text-xs text-white/50">(${lastUpdated})</span></span>`;
        }

        button.innerHTML = `<div class="flex justify-between items-center">
                                        <span class="font-bold text-lg">${name}</span>
                                        ${lastFeelingHTML}
                                    </div>`;
        button.addEventListener('click', () => showPinEntryForFeelingSelection(name));
        nameView.appendChild(button);
    });
}

// New top-level function for handling PIN submission
async function handlePinSubmit() {
    const pinEntryInput = document.getElementById('pin-entry-input');
    const pinConfirmInput = document.getElementById('pin-confirm-input');
    const pinEntryErrorMessage = document.getElementById('pin-entry-error-message');
    const pinEntryModalOverlay = document.getElementById('pin-entry-modal-overlay');

    const enteredPin = pinEntryInput.value;

    if (isPinCreateMode) { // Use the global flag
        const confirmedPin = pinConfirmInput.value;
        if (enteredPin === '' || confirmedPin === '') {
            pinEntryErrorMessage.textContent = "PIN cannot be empty.";
            pinEntryErrorMessage.classList.remove('hidden');
            return;
        }
        if (enteredPin !== confirmedPin) {
            pinEntryErrorMessage.textContent = "PINs do not match. Please try again.";
            pinEntryErrorMessage.classList.remove('hidden');
            pinEntryInput.value = '';
            pinConfirmInput.value = '';
            return;
        }
        await setPin(currentPinEntryPerson, enteredPin);
        pinEntryModalOverlay.style.display = 'none'; // Hide PIN modal
        displayFeelingsWheelContent(currentPinEntryPerson); // Show feelings wheel
    } else { // Enter PIN mode
        const storedPin = await getPin(currentPinEntryPerson); // Re-fetch storedPin here
        if (enteredPin === storedPin) {
            pinEntryModalOverlay.style.display = 'none'; // Hide PIN modal
            displayFeelingsWheelContent(currentPinEntryPerson); // Show feelings wheel
        } else {
            pinEntryErrorMessage.textContent = "Incorrect PIN. Please try again.";
            pinEntryErrorMessage.classList.remove('hidden');
            pinEntryInput.value = '';
        }
    }
}

async function showPinEntryForFeelingSelection(personName) {
    currentPinEntryPerson = personName;
    const pinEntryModalOverlay = document.getElementById('pin-entry-modal-overlay');
    const pinModalTitle = document.getElementById('pin-modal-title');
    const pinEnterMessage = document.getElementById('pin-enter-message');
    const pinCreateMessage = document.getElementById('pin-create-message');
    const pinEntryPersonNameSpan = document.getElementById('pin-entry-person-name');
    const pinEntryPersonNameCreateSpan = document.getElementById('pin-entry-person-name-create');
    const pinEntryInput = document.getElementById('pin-entry-input');
    const pinConfirmInput = document.getElementById('pin-confirm-input');
    const pinEntryErrorMessage = document.getElementById('pin-entry-error-message');
    const submitPinEntryBtn = document.getElementById('submit-pin-entry-btn');

    const storedPin = await getPin(personName);
    isPinCreateMode = !storedPin; // Set the global flag
    pinEntryInput.value = ''; // Clear previous input
    pinConfirmInput.value = ''; // Clear previous input
    pinEntryErrorMessage.classList.add('hidden'); // Hide any previous error messages

    // Configure modal based on mode
    if (isPinCreateMode) {
        pinModalTitle.textContent = 'Create PIN';
        pinEnterMessage.classList.add('hidden');
        pinCreateMessage.classList.remove('hidden');
        pinConfirmInput.classList.remove('hidden');
        submitPinEntryBtn.textContent = 'Create PIN';
    } else {
        pinModalTitle.textContent = 'Enter PIN';
        pinEnterMessage.classList.remove('hidden');
        pinCreateMessage.classList.add('hidden');
        pinConfirmInput.classList.add('hidden');
        submitPinEntryBtn.textContent = 'Submit PIN';
    }

    pinEntryModalOverlay.style.display = 'flex';
    lucide.createIcons();

    

    closePinEntryModalBtn.addEventListener('click', () => {
        pinEntryModalOverlay.style.display = 'none';
        closeAndResetFeelingsModal(); // Close feelings modal as well
    });
}

function displayFeelingsWheelContent(name) {
    setSelectedPersonForMood(name);
    const nameView = document.getElementById('name-selection-view');
    const wheelView = document.getElementById('wheel-view');
    const title = document.getElementById('feelings-modal-title');

    nameView.classList.add('hidden');
    wheelView.classList.remove('hidden');
    wheelView.innerHTML = '';
    title.innerHTML = `<button id="back-to-names" class="p-1 mr-2 rounded-full hover:bg-white/10"><i data-lucide="arrow-left" class="w-5 h-5"></i></button> How are you feeling, ${name}?`;
    document.getElementById('back-to-names').addEventListener('click', showNameSelection);

    for (const coreEmotion in FEELINGS_WHEEL) {
        const data = FEELINGS_WHEEL[coreEmotion];
        const group = document.createElement('div');
        group.className = 'core-emotion-group';

        let feelingsHTML = '';
        data.feelings.forEach(feeling => {
            feelingsHTML += `<button class="feeling-btn" data-core="${coreEmotion}" data-feeling="${feeling}">${feeling}</button>`;
        });

        group.innerHTML = `
            <div class="group-header ${data.color}" data-target="${coreEmotion}-list">
                <h3>${coreEmotion}</h3>
                <i data-lucide="chevron-down" class="chevron"></i>
            </div>
            <div id="${coreEmotion}-list" class="feelings-list">
                ${feelingsHTML}
            </div>
        `;
        wheelView.appendChild(group);
    }

    wheelView.querySelectorAll('.group-header').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.dataset.target;
            const list = document.getElementById(targetId);
            header.classList.toggle('open');
            list.classList.toggle('open');
        });
    });

    wheelView.querySelectorAll('.feeling-btn').forEach(button => {
        button.addEventListener('click', handleFeelingSelection);
    });
    lucide.createIcons();
}


function handleFeelingSelection(event) {
    const { core, feeling } = event.currentTarget.dataset;
    const familyFeelings = getFamilyFeelings();

    familyFeelings[getSelectedPersonForMood()] = {
        feeling: feeling,
        coreEmotion: core,
        lastUpdated: new Date().toISOString()
    };
    saveFamilyFeelings(familyFeelings);
    
    closeAndResetFeelingsModal();
    updateOverallMoodIcon();
    showFeelingResponse(feeling, core);

    // Dispatch custom event for daily challenge integration
    document.dispatchEvent(new CustomEvent('dailyChallengeFeelingSelected', {
        detail: { feeling, core }
    }));
}

export function updateOverallMoodIcon() {
    const btnIcon = document.getElementById('overall-mood-icon');
    const moodBtn = document.getElementById('mood-tracker-btn');
    if (!btnIcon || !moodBtn) return;

    // Reset colors
    moodBtn.classList.remove('bg-green-500/30', 'bg-blue-500/30', 'bg-red-600/30');

    const familyFeelings = getFamilyFeelings();
    const feelingsArray = Object.values(familyFeelings);

    if (feelingsArray.length === 0) {
        btnIcon.setAttribute('data-lucide', 'smile');
        lucide.createIcons();
        return;
    }

    let totalValue = 0;
    feelingsArray.forEach(data => {
        const coreEmotionData = FEELINGS_WHEEL[data.coreEmotion];
        if (coreEmotionData) {
            totalValue += coreEmotionData.value;
        }
    });

    const averageValue = totalValue / feelingsArray.length;
    let overallIcon = 'smile';
    let overallColorClass = 'bg-green-500/30';

    if (averageValue < 2.5) {
        overallIcon = 'frown';
        overallColorClass = 'bg-red-600/30';
    } else if (averageValue < 4) {
        overallIcon = 'meh';
        overallColorClass = 'bg-blue-500/30';
    }

    btnIcon.setAttribute('data-lucide', overallIcon);
    moodBtn.classList.add(overallColorClass);
    lucide.createIcons();
}

export function initializeFeelingInsightModal() {
    const modalOverlay = document.getElementById('feeling-insight-modal-overlay');
    const closeBtn = document.getElementById('close-feeling-insight-modal');

    closeBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
    });

    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    });
}

export function checkRecentPrayerRequests(prayerRequests) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const hasRecent = prayerRequests.some(req => {
      let date;
      if (req.requestedAt && typeof req.requestedAt.toDate === 'function') {
        date = req.requestedAt.toDate();
      } else if (typeof req.requestedAt === 'string') {
        date = new Date(req.requestedAt);
      }
      return date && (now - date.getTime() < oneDay);
    });
    const btn = document.getElementById('open-prayer-modal');
    if (btn) {
      if (hasRecent) {
        btn.classList.add('pulse');
      } else {
        btn.classList.remove('pulse');
      }
    }
}

export function setAllPrayers(prayers) {
    allPrayers = prayers;
}

function parseSmartSearch(query) {
    const tokenRegex = /\s*("([^"]*)"|\(|\)|AND|OR|[\w:]+)\s*/g;
    const tokens = [];
    let match;
    while ((match = tokenRegex.exec(query)) !== null) {
        // We need to handle implicit AND operators.
        // If the current token is a value or a right parenthesis,
        // and the previous token was also a value or a right parenthesis,
        // then we insert an AND operator.
        if (tokens.length > 0) {
            const prevToken = tokens[tokens.length - 1];
            if (prevToken !== '(' && prevToken !== 'AND' && prevToken !== 'OR' && match[1] !== ')' && match[1] !== 'AND' && match[1] !== 'OR') {
                tokens.push('AND');
            }
        }
        tokens.push(match[1]);
    }
    return tokens;
}

function buildAst(tokens) {
    const precedence = { 'OR': 1, 'AND': 2 };
    const rpn = [];
    const operators = [];

    tokens.forEach(token => {
        if (token === 'AND' || token === 'OR') {
            while (operators.length > 0 && operators[operators.length - 1] !== '(' && precedence[operators[operators.length - 1]] >= precedence[token]) {
                rpn.push(operators.pop());
            }
            operators.push(token);
        } else if (token === '(') {
            operators.push(token);
        } else if (token === ')') {
            while (operators.length > 0 && operators[operators.length - 1] !== '(') {
                rpn.push(operators.pop());
            }
            operators.pop(); // Discard the '('
        } else {
            rpn.push(token);
        }
    });

    while (operators.length > 0) {
        rpn.push(operators.pop());
    }

    const astStack = [];
    rpn.forEach(token => {
        if (token === 'AND' || token === 'OR') {
            const right = astStack.pop();
            const left = astStack.pop();
            astStack.push({ type: token, left, right });
        } else {
            astStack.push({ type: 'VALUE', value: token });
        }
    });

    return astStack[0];
}

function evaluateAst(prayer, ast) {
    if (!ast) {
        return true;
    }
    switch (ast.type) {
        case 'AND':
            return evaluateAst(prayer, ast.left) && evaluateAst(prayer, ast.right);
        case 'OR':
            return evaluateAst(prayer, ast.left) || evaluateAst(prayer, ast.right);
        case 'VALUE':
            return prayerMatches(prayer, ast.value);
        default:
            return true;
    }
}

function prayerMatches(prayer, searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    if (lowerCaseSearchTerm.startsWith('"') && lowerCaseSearchTerm.endsWith('"')) {
        const phrase = lowerCaseSearchTerm.substring(1, lowerCaseSearchTerm.length - 1);
        return prayer.name.toLowerCase().includes(phrase) ||
               prayer.requestText.toLowerCase().includes(phrase) ||
               (prayer.answerText && prayer.answerText.toLowerCase().includes(phrase));
    }

    if (lowerCaseSearchTerm.includes(':')) {
        const [field, value] = lowerCaseSearchTerm.split(':', 2);
        switch (field) {
            case 'name':
                return prayer.name.toLowerCase().includes(value);
            case 'request':
                return prayer.requestText.toLowerCase().includes(value);
            case 'answer':
                return prayer.answerText && prayer.answerText.toLowerCase().includes(value);
            default:
                return false;
        }
    }

    return prayer.name.toLowerCase().includes(lowerCaseSearchTerm) ||
           prayer.requestText.toLowerCase().includes(lowerCaseSearchTerm) ||
           (prayer.answerText && prayer.answerText.toLowerCase().includes(lowerCaseSearchTerm));
}

export function renderPrayerLists(searchTerm = '') {
    const currentList = document.getElementById('current-requests-list');
    const answeredList = document.getElementById('answered-prayers-list');
    currentList.innerHTML = '';
    answeredList.innerHTML = '';

    console.log('renderPrayerLists called with searchTerm:', searchTerm);

    if (!searchTerm.trim()) {
        const allCurrentPrayers = allPrayers.filter(p => p.status === 'current');
        const allAnsweredPrayers = allPrayers.filter(p => p.status === 'answered');
        if (allCurrentPrayers.length === 0) {
            currentList.innerHTML = `<p class="text-white/50">No current prayer requests.</p>`;
        } else {
            allCurrentPrayers.forEach(p => currentList.appendChild(createPrayerItem(p)));
        }
        if (allAnsweredPrayers.length === 0) {
            answeredList.innerHTML = `<p class="text-white/50">No answered prayers yet.</p>`;
        } else {
            allAnsweredPrayers.forEach(p => answeredList.appendChild(createPrayerItem(p)));
        }
        lucide.createIcons();
        return;
    }

    const tokens = parseSmartSearch(searchTerm);
    console.log('Parsed tokens:', tokens);
    const ast = buildAst(tokens);
    console.log('Built AST:', ast);

    const filteredPrayers = allPrayers.filter(p => {
        const match = evaluateAst(p, ast);
        console.log('Prayer:', p.requestText, 'Matches:', match);
        return match;
    });
    console.log('Filtered prayers:', filteredPrayers);

    const currentPrayers = filteredPrayers.filter(p => p.status === 'current');
    const answeredPrayers = filteredPrayers.filter(p => p.status === 'answered');

    if (currentPrayers.length === 0) {
        currentList.innerHTML = `<p class="text-white/50">No current prayer requests matching your search.</p>`;
    } else {
        currentPrayers.forEach(p => currentList.appendChild(createPrayerItem(p)));
    }

    if (answeredPrayers.length === 0) {
        answeredList.innerHTML = `<p class="text-white/50">No answered prayers matching your search.</p>`;
    } else {
        answeredPrayers.forEach(p => answeredList.appendChild(createPrayerItem(p)));
    }
    lucide.createIcons();
}

function createPrayerItem(prayer) {
    const item = document.createElement('div');
    item.className = `prayer-request-item ${prayer.status === 'answered' ? 'answered' : ''}`;
    
    const requestedDate = prayer.requestedAt?.toDate().toLocaleDateString() || 'Someday';

    let answerHTML = '';
    if (prayer.status === 'answered') {
        const answeredDate = prayer.answeredAt?.toDate().toLocaleDateString() || 'Recently';
        answerHTML = `
            <div class="prayer-answer">
                <span class="font-semibold text-green-400">Answered on ${answeredDate}:</span>
                <p>${prayer.answerText}</p>
            </div>
        `;
    }

    let actionButtonHTML = '';
    if (prayer.status === 'current') {
        actionButtonHTML = `<button data-id="${prayer.id}" class="answer-btn gemini-btn bg-green-600 hover:bg-green-700 text-xs py-1 px-2">Answered!</button>`;
    }
    
    //Make the entire item clickable to edit the prayer request
    item.innerHTML = `
        <div class="prayer-request-header">
            <span class="font-bold">${prayer.name}</span>
            <span class="text-right">${requestedDate}</span>
        </div>
        <p class="prayer-request-body">${prayer.requestText}</p>
        ${answerHTML}
        <div class="text-right mt-2">${actionButtonHTML}</div>
    `;
    
    const answerBtn = item.querySelector('.answer-btn');
    item.addEventListener('click', () => {
        if (prayer.status === 'answered') {
            showEditAnswerView(prayer);
        } else {
            showEditRequestView(prayer);
        }
    });
    if (answerBtn) {
        answerBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            showAnswerRequestView(prayer.id, prayer.requestText);
        });
    }

    return item;
}

export function showPrayerListView() {
    document.getElementById('prayer-list-view').classList.remove('hidden');
    document.getElementById('add-prayer-form-view').classList.add('hidden');
    document.getElementById('update-prayer-request-btn').classList.add('hidden');
    document.getElementById('answer-prayer-form-view').classList.add('hidden');
    document.getElementById('add-new-prayer-request-btn').classList.remove('hidden');
    document.getElementById('cancel-prayer-request-btn').classList.add('hidden');
    document.getElementById('submit-prayer-request-btn').classList.add('hidden');
    document.getElementById('submit-prayer-answer-btn').classList.add('hidden');
    document.getElementById('update-prayer-answer-btn').classList.add('hidden');
    document.getElementById('prayer-modal-title').textContent = 'Family Prayer Requests';
    document.getElementById('edit-prayer-id').value = '';
}

export function showAddRequestView() {
    document.getElementById('prayer-list-view').classList.add('hidden');
    document.getElementById('add-prayer-form-view').classList.remove('hidden');
    document.getElementById('update-prayer-request-btn').classList.add('hidden');
    document.getElementById('add-new-prayer-request-btn').classList.add('hidden');
    document.getElementById('submit-prayer-request-btn').classList.remove('hidden');
    document.getElementById('cancel-prayer-request-btn').classList.remove('hidden');
    document.getElementById('submit-prayer-answer-btn').classList.add('hidden');
    document.getElementById('update-prayer-answer-btn').classList.add('hidden');
    document.getElementById('prayer-modal-title').textContent = 'Add a Request';

    const nameSelect = document.getElementById('prayer-requester-name');
    nameSelect.innerHTML = FAMILY_MEMBERS.map(name => `<option value="${name}">${name}</option>`).join('');
    nameSelect.selectedIndex = 0;
    document.getElementById('prayer-request-text').value = '';
    document.getElementById('edit-prayer-id').value = '';
}

export function showEditRequestView(prayer) {
    document.getElementById('prayer-list-view').classList.add('hidden');
    document.getElementById('add-prayer-form-view').classList.remove('hidden');
    document.getElementById('submit-prayer-request-btn').classList.add('hidden');
    document.getElementById('update-prayer-request-btn').classList.remove('hidden');
    document.getElementById('add-new-prayer-request-btn').classList.add('hidden');
    document.getElementById('cancel-prayer-request-btn').classList.remove('hidden');
    document.getElementById('submit-prayer-answer-btn').classList.add('hidden');
    document.getElementById('update-prayer-answer-btn').classList.add('hidden');
    document.getElementById('prayer-modal-title').textContent = 'Edit Request';

    const nameSelect = document.getElementById('prayer-requester-name');
    nameSelect.innerHTML = FAMILY_MEMBERS.map(name => `<option value="${name}" ${name === prayer.name ? 'selected' : ''}>${name}</option>`).join('');
    const requestTextarea = document.getElementById('prayer-request-text');
    requestTextarea.value = prayer.requestText;

    // Store the prayer ID in a hidden field for the update function
    const prayerIdInput = document.getElementById('edit-prayer-id');
    prayerIdInput.value = prayer.id;
}

export function showAnswerRequestView(docId, requestText) {
    setCurrentPrayerDocId(docId);
    document.getElementById('prayer-list-view').classList.add('hidden');
    document.getElementById('answer-prayer-form-view').classList.remove('hidden');
    document.getElementById('add-prayer-form-view').classList.add('hidden');
    document.getElementById('add-new-prayer-request-btn').classList.add('hidden');
    document.getElementById('submit-prayer-answer-btn').classList.remove('hidden');
    document.getElementById('cancel-prayer-request-btn').classList.remove('hidden');
    document.getElementById('submit-prayer-request-btn').classList.add('hidden');
    document.getElementById('update-prayer-request-btn').classList.add('hidden');
    document.getElementById('update-prayer-answer-btn').classList.add('hidden');
    document.getElementById('prayer-modal-title').textContent = 'Answer a Prayer';
    document.getElementById('original-request-for-answer').textContent = requestText;
    document.getElementById('prayer-answer-text').value = '';
    document.getElementById('edit-prayer-id').value = '';
}

export function showEditAnswerView(prayer) {
    setCurrentPrayerDocId(prayer.id);
    document.getElementById('prayer-list-view').classList.add('hidden');
    document.getElementById('answer-prayer-form-view').classList.remove('hidden');
    document.getElementById('add-prayer-form-view').classList.add('hidden');
    document.getElementById('add-new-prayer-request-btn').classList.add('hidden');
    document.getElementById('submit-prayer-answer-btn').classList.add('hidden');
    document.getElementById('update-prayer-answer-btn').classList.remove('hidden');
    document.getElementById('cancel-prayer-request-btn').classList.remove('hidden');
    document.getElementById('submit-prayer-request-btn').classList.add('hidden');
    document.getElementById('update-prayer-request-btn').classList.add('hidden');
    document.getElementById('prayer-modal-title').textContent = 'Edit Answer';
    document.getElementById('original-request-for-answer').textContent = prayer.requestText;
    document.getElementById('prayer-answer-text').value = prayer.answerText;
    document.getElementById('edit-prayer-id').value = prayer.id;
}

export function initializeSmartSearchHelpModal() {
    const modalOverlay = document.getElementById('smart-search-help-modal-overlay');
    const openBtn = document.getElementById('open-smart-search-help-btn');
    const closeBtn = document.getElementById('close-smart-search-help-modal');

    openBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'flex';
        lucide.createIcons();
    });

    closeBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
    });

    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    });
}

export function initializeSearchOperatorDropdown() {
    const operatorBtn = document.getElementById('search-operator-btn');
    const operatorDropdown = document.getElementById('search-operator-dropdown');
    const searchInput = document.getElementById('prayer-search-input');

    operatorBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        operatorDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        operatorDropdown.classList.add('hidden');
    });

    operatorDropdown.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    operatorDropdown.querySelectorAll('a').forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const operator = item.dataset.operator;
            const currentVal = searchInput.value;
            const selectionStart = searchInput.selectionStart;
            const selectionEnd = searchInput.selectionEnd;

            if (operator === '()') {
                searchInput.value = currentVal.slice(0, selectionStart) + '()'+ currentVal.slice(selectionEnd);
                searchInput.focus();
                searchInput.setSelectionRange(selectionStart + 1, selectionStart + 1);
            } else if (operator === '""') {
                searchInput.value = currentVal.slice(0, selectionStart) + '""'+ currentVal.slice(selectionEnd);
                searchInput.focus();
                searchInput.setSelectionRange(selectionStart + 1, selectionStart + 1);
            } else {
                searchInput.value = currentVal.slice(0, selectionStart) + operator + currentVal.slice(selectionEnd);
                searchInput.focus();
                searchInput.setSelectionRange(selectionStart + operator.length, selectionStart + operator.length);
            }
            operatorDropdown.classList.add('hidden');
        });
    });
}