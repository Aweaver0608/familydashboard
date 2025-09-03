import { addDailyChallengeEntry, getPin, setPin } from './firebase.js';
import { getCachedWordData as getWordOfTheDayData } from './word-of-the-day.js';
import { getSelectedPersonForMood } from './main.js';
import { triggerConfetti } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const dailyChallengeBtn = document.getElementById('daily-challenge-btn');
    const dailyChallengeModalOverlay = document.getElementById('daily-challenge-modal-overlay');
    const dailyChallengeDialog = document.getElementById('daily-challenge-dialog'); // The inner modal content
    const moodTrackerBtn = document.getElementById('mood-tracker-btn');
    const feelingsModalOverlay = document.getElementById('feelings-modal-overlay');
    const dailyChallengeContent = document.getElementById('daily-challenge-content'); // The body of the modal
    const dailyChallengeHeader = document.getElementById('daily-challenge-header');
    const dailyChallengeFooter = document.getElementById('daily-challenge-footer');

    const QUIZ_STEPS = {
        FEELINGS_WHEEL_STEP: 'feelings_wheel',
        PIN_ENTRY_STEP: 'pin_entry',
        QUOTE_OF_THE_DAY_STEP: 'quote_of_the_day',
        VERSE_OF_THE_DAY_STEP: 'verse_of_the_day',
        WORD_OF_THE_DAY_STEP: 'word_of_the_day',
        PRAYER_LIST_STEP: 'prayer_list',
        QUIZ_COMPLETE_STEP: 'quiz_complete'
    };

    let currentQuizStep = null;
    let currentVerseQuestionIndex = 0;
    let verseAnswers = {};

    function getVerseInsights() {
        try {
            const storedData = localStorage.getItem('verseData');
            if (storedData) {
                return JSON.parse(storedData).insights;
            }
        } catch (e) {
            console.error("Error reading verse insights from localStorage:", e);
        }
        return null;
    }

    function getCachedWordData() {
        return getWordOfTheDayData();
    }

    function updateDailyChallengeDialog() {
        dailyChallengeContent.innerHTML = ''; // Clear previous content
        dailyChallengeFooter.innerHTML = ''; // Clear footer for dynamic buttons

        // Update header content (title and close button)
        dailyChallengeHeader.innerHTML = `
            <h2 class="text-xl font-bold">Daily Challenge</h2>
            <button id="close-daily-challenge-modal" class="p-1 rounded-full hover:bg-white/10">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
        `;

        // Add event listener for the close button
        dailyChallengeHeader.querySelector('#close-daily-challenge-modal').addEventListener('click', () => {
            dailyChallengeModalOverlay.style.display = 'none'; // Hide the overlay
            moodTrackerBtn.classList.remove('highlight-active');
            currentQuizStep = null; // Reset quiz state when closing
        });

        switch (currentQuizStep) {
            case QUIZ_STEPS.FEELINGS_WHEEL_STEP:
                dailyChallengeContent.innerHTML = `<p>To start the daily challenge, please click on the <strong>Mood Tracker Button</strong> (the large button at the bottom center of the screen) and select how you are feeling today.</p>`;
                // Automatically open the feelings modal if it's not already open
                if (feelingsModalOverlay.style.display !== 'flex') {
                    moodTrackerBtn.click();
                }
                break;
            
            case QUIZ_STEPS.QUOTE_OF_THE_DAY_STEP:
                const quoteText = document.getElementById('quote-text').textContent;
                const quoteAuthor = document.getElementById('quote-author').textContent;
                document.getElementById('quote-banner').classList.add('highlight-active');
                dailyChallengeContent.innerHTML = `
                    <p class="text-lg font-semibold mb-4">Today's Quote:</p>
                    <blockquote class="text-xl italic text-center mb-6">${quoteText} ${quoteAuthor}</blockquote>
                    <p class="mb-4">What does this quote mean to you?</p>
                    <textarea id="quote-reflection-input" class="form-input w-full h-24" placeholder="Type your thoughts here..."></textarea>
                    <p id="quote-feedback-message" class="text-red-400 text-sm mt-2 hidden"></p>
                `;
                dailyChallengeFooter.innerHTML = `<button id="submit-reflection-btn" class="gemini-btn">Submit Reflection</button>`;
                dailyChallengeFooter.querySelector('#submit-reflection-btn').addEventListener('click', () => {
                    const reflection = document.getElementById('quote-reflection-input').value.trim();
                    if (reflection) {
                        addDailyChallengeEntry({
                            type: 'quoteReflection',
                            reflection: reflection,
                            quote: quoteText,
                            author: quoteAuthor
                        });
                        document.getElementById('quote-banner').classList.remove('highlight-active');
                        currentVerseQuestionIndex = 0; // Reset for the verse step
                        verseAnswers = {}; // Reset for the verse step
                        currentQuizStep = QUIZ_STEPS.VERSE_OF_THE_DAY_STEP;
                        updateDailyChallengeDialog();
                    } else {
                        const feedbackMessage = document.getElementById('quote-feedback-message');
                        feedbackMessage.textContent = "Please write your reflection before submitting.";
                        feedbackMessage.classList.remove('hidden');
                    }
                });
                break;
            case QUIZ_STEPS.VERSE_OF_THE_DAY_STEP:
                const verseWidget = document.getElementById('verse');
                verseWidget.classList.add('highlight-active');
                const verseInsights = getVerseInsights();
                const applicationQuestions = verseInsights?.devotional?.application_questions || [];

                if (applicationQuestions.length > 0 && currentVerseQuestionIndex < applicationQuestions.length) {
                    const currentQuestion = applicationQuestions[currentVerseQuestionIndex];
                    dailyChallengeContent.innerHTML = `
                        <p class="text-lg font-semibold mb-4">Think About It (${currentVerseQuestionIndex + 1}/${applicationQuestions.length}):</p>
                        <p class="mb-2">${currentQuestion}</p>
                        <textarea id="verse-question-input" class="form-input w-full h-20 mb-4" placeholder="Your answer..."></textarea>
                        <p id="verse-feedback-message" class="text-red-400 text-sm mt-2 hidden"></p>
                    `;

                    const isLastQuestion = currentVerseQuestionIndex === applicationQuestions.length - 1;
                    const buttonText = isLastQuestion ? "Submit Final Answer" : "Next Question";
                    
                    dailyChallengeFooter.innerHTML = `<button id="submit-verse-answer-btn" class="gemini-btn">${buttonText}</button>`;
                    dailyChallengeFooter.querySelector('#submit-verse-answer-btn').addEventListener('click', () => {
                        const answerInput = document.getElementById('verse-question-input');
                        const answer = answerInput.value.trim();

                        if (answer) {
                            verseAnswers[currentQuestion] = answer;
                            currentVerseQuestionIndex++;
                            
                            if (currentVerseQuestionIndex >= applicationQuestions.length) {
                                // All questions answered, submit and move on
                                addDailyChallengeEntry({
                                    type: 'verseAnswers',
                                    verse: document.getElementById('verse-text').textContent,
                                    reference: document.getElementById('verse-reference').textContent,
                                    answers: verseAnswers
                                });
                                verseWidget.classList.remove('highlight-active');
                                currentQuizStep = QUIZ_STEPS.WORD_OF_THE_DAY_STEP;
                            }
                            updateDailyChallengeDialog(); // Re-render for next question or next step
                        } else {
                            const feedbackMessage = document.getElementById('verse-feedback-message');
                            feedbackMessage.textContent = "Please provide an answer.";
                            feedbackMessage.classList.remove('hidden');
                        }
                    });
                } else {
                    // This block handles either no questions or finishing the questions
                    verseWidget.classList.remove('highlight-active');
                    dailyChallengeContent.innerHTML = `<p>Verse reflection complete. Moving to the next step.</p>`;
                    dailyChallengeFooter.innerHTML = `<button id="continue-verse-btn" class="gemini-btn">Continue</button>`;
                    dailyChallengeFooter.querySelector('#continue-verse-btn').addEventListener('click', () => {
                        verseWidget.classList.remove('highlight-active');
                        currentQuizStep = QUIZ_STEPS.WORD_OF_THE_DAY_STEP;
                        updateDailyChallengeDialog();
                    });
                }
                break;
            case QUIZ_STEPS.WORD_OF_THE_DAY_STEP:
                const wordOfTheDayBtn = document.getElementById('word-of-the-day-btn');
                wordOfTheDayBtn.classList.add('highlight-active');
                const wordData = getCachedWordData();

                if (wordData && wordData.definitions && wordData.definitions.length > 0) {
                    // Select a random correct definition from the available definitions
                    const correctDefinition = wordData.definitions[Math.floor(Math.random() * wordData.definitions.length)];
                    let options = [correctDefinition]; // Start with only the chosen correct definition

                    // Add Gemini-generated distractors
                    if (wordData.distractors && wordData.distractors.length > 0) {
                        options.push(...wordData.distractors);
                    }

                    // Shuffle options and take the first 4
                    // Shuffle options and take the first 4
                    options = options.sort(() => Math.random() - 0.5).slice(0, 4);

                    let optionsHtml = options.map(def => `
                        <button class="quiz-option-btn" data-definition="${def}">${def}</button>
                    `).join('');

                    dailyChallengeContent.innerHTML = `
                        <p class="text-lg font-semibold mb-4">What is the meaning of "${wordData.word}"?</p>
                        <div id="word-quiz-options" class="mb-4">${optionsHtml}</div>
                        <p id="word-feedback-message" class="text-red-400 text-sm mt-2 hidden"></p>
                    `;
                    dailyChallengeFooter.innerHTML = `<button id="submit-word-answer-btn" class="gemini-btn">Submit Answer</button>`;

                    const optionButtons = dailyChallengeContent.querySelectorAll('.quiz-option-btn');
                    optionButtons.forEach(btn => {
                        btn.addEventListener('click', () => {
                            optionButtons.forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                        });
                    });

                    dailyChallengeFooter.querySelector('#submit-word-answer-btn').addEventListener('click', () => {
                        const selectedOption = document.querySelector('.quiz-option-btn.selected');
                        const feedbackMessage = document.getElementById('word-feedback-message');

                        if (selectedOption) {
                            const selectedDefinition = selectedOption.dataset.definition;
                            const isCorrect = selectedDefinition === correctDefinition;

                            // Disable all buttons and provide visual feedback
                            optionButtons.forEach(btn => {
                                btn.disabled = true;
                                if (btn.dataset.definition === correctDefinition) {
                                    btn.classList.add('correct');
                                }
                            });

                            if (isCorrect) {
                                selectedOption.classList.add('correct');
                                feedbackMessage.classList.add('hidden');
                                addDailyChallengeEntry({
                                    type: 'wordAnswer',
                                    word: wordData.word,
                                    correctDefinition: correctDefinition,
                                    selectedAnswer: selectedDefinition,
                                    isCorrect: true
                                });
                                // Move to next step after a short delay
                                setTimeout(() => {
                                    wordOfTheDayBtn.classList.remove('highlight-active');
                                    currentQuizStep = QUIZ_STEPS.PRAYER_LIST_STEP;
                                    updateDailyChallengeDialog();
                                }, 1500);
                            } else {
                                selectedOption.classList.add('incorrect');
                                feedbackMessage.textContent = "Not quite. The correct answer is highlighted in green.";
                                feedbackMessage.classList.remove('hidden');
                                addDailyChallengeEntry({
                                    type: 'wordAnswer',
                                    word: wordData.word,
                                    correctDefinition: correctDefinition,
                                    selectedAnswer: selectedDefinition,
                                    isCorrect: false
                                });
                                // Show a continue button
                                dailyChallengeFooter.innerHTML = `<button id="continue-word-quiz-btn" class="gemini-btn">Continue</button>`;
                                dailyChallengeFooter.querySelector('#continue-word-quiz-btn').addEventListener('click', () => {
                                    wordOfTheDayBtn.classList.remove('highlight-active');
                                    currentQuizStep = QUIZ_STEPS.PRAYER_LIST_STEP;
                                    updateDailyChallengeDialog();
                                });
                            }
                        } else {
                            const feedbackMessage = document.getElementById('word-feedback-message');
                            feedbackMessage.textContent = "Please select an answer.";
                            feedbackMessage.classList.remove('hidden');
                        }
                    });
                } else {
                    dailyChallengeContent.innerHTML = `<p>Word of the Day data not available. Skipping this step.</p>`;
                    dailyChallengeFooter.innerHTML = `<button id="skip-word-btn" class="gemini-btn">Continue</button>`;
                    dailyChallengeFooter.querySelector('#skip-word-btn').addEventListener('click', () => {
                        wordOfTheDayBtn.classList.remove('highlight-active');
                        currentQuizStep = QUIZ_STEPS.PRAYER_LIST_STEP;
                        updateDailyChallengeDialog();
                    });
                }
                break;
            case QUIZ_STEPS.PRAYER_LIST_STEP:
                const openPrayerModalBtn = document.getElementById('open-prayer-modal');
                openPrayerModalBtn.classList.add('highlight-active');
                dailyChallengeContent.innerHTML = `
                    <p class="text-lg font-semibold mb-4">Great job! Now, let's encourage our family.</p>
                    <p class="mb-4">Please review the prayer requests and pray for them.</p>
                `;
                dailyChallengeFooter.innerHTML = `
                    <button id="open-prayer-list-btn" class="gemini-btn">Open Prayer List</button>
                    <button id="i-have-prayed-btn" class="gemini-btn">I've Prayed</button>
                `;
                dailyChallengeFooter.querySelector('#open-prayer-list-btn').addEventListener('click', () => {
                    // Simulate click on the actual prayer modal button
                    openPrayerModalBtn.click();
                });
                dailyChallengeFooter.querySelector('#i-have-prayed-btn').addEventListener('click', () => {
                    openPrayerModalBtn.classList.remove('highlight-active');
                    currentQuizStep = QUIZ_STEPS.QUIZ_COMPLETE_STEP;
                    updateDailyChallengeDialog();
                    triggerConfetti();
                });
                break;
            case QUIZ_STEPS.QUIZ_COMPLETE_STEP:
                dailyChallengeContent.innerHTML = `<p>Daily Challenge Complete!</p>`; // Placeholder
                break;
            default:
                dailyChallengeContent.innerHTML = `<p>Welcome to the Daily Challenge!</p>`;
                break;
        }
        lucide.createIcons();
    }

    

    function startDailyChallenge() {
        dailyChallengeModalOverlay.style.display = 'flex'; // Show the overlay
        moodTrackerBtn.classList.add('highlight-active');
        currentQuizStep = QUIZ_STEPS.FEELINGS_WHEEL_STEP;
        updateDailyChallengeDialog();
    }

    if (dailyChallengeBtn && dailyChallengeModalOverlay && moodTrackerBtn && feelingsModalOverlay && dailyChallengeContent && dailyChallengeHeader && dailyChallengeFooter) {
        dailyChallengeBtn.addEventListener('click', startDailyChallenge);

        // Listen for when the feelings modal is opened
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (feelingsModalOverlay.style.display === 'flex') {
                        moodTrackerBtn.classList.remove('highlight-active'); // Remove highlight when modal opens
                    }
                }
            }
        });

        observer.observe(feelingsModalOverlay, { attributes: true });

        // Listen for dailyChallengeFeelingSelected event
        document.addEventListener('dailyChallengeFeelingSelected', async (event) => {
            if (dailyChallengeModalOverlay.style.display === 'flex') { // Only proceed if daily challenge is active
                moodTrackerBtn.classList.remove('highlight-active');
                currentQuizStep = QUIZ_STEPS.QUOTE_OF_THE_DAY_STEP; // Directly proceed to Quote of the Day
                await updateDailyChallengeDialog();
            }
        });
    }
});