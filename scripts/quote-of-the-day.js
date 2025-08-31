const quotes = [
    {
        "quote": "You do not rise to the level of your goals. You fall to the level of your systems.",
        "author": "James Clear",
        "source": "Atomic Habits"
    },
    {
        "quote": "Every action you take is a vote for the type of person you wish to become.",
        "author": "James Clear",
        "source": "Atomic Habits"
    },
    {
        "quote": "The most effective way to change your habits is to focus not on what you want to achieve, but on who you wish to become.",
        "author": "James Clear",
        "source": "Atomic Habits"
    },
    {
        "quote": "Habits are the compound interest of self-improvement.",
        "author": "James Clear",
        "source": "Atomic Habits"
    },
    {
        "quote": "The secret to getting results that last is to never stop making improvements.",
        "author": "James Clear",
        "source": "Atomic Habits"
    },
    {
        "quote": "In the real world, the smartest people are people who make mistakes and learn. In school, the smartest people don't make mistakes.",
        "author": "Robert T. Kiyosaki",
        "source": "Rich Dad Poor Dad"
    },
    {
        "quote": "It's not how much money you make, but how much money you keep, how hard it works for you, and how many generations you keep it for.",
        "author": "Robert T. Kiyosaki",
        "source": "Rich Dad Poor Dad"
    },
    {
        "quote": "The poor and the middle class work for money. The rich have money work for them.",
        "author": "Robert T. Kiyosaki",
        "source": "Rich Dad Poor Dad"
    },
    {
        "quote": "Winners are not afraid of losing. But losers are. Failure is part of the process of success.",
        "author": "Robert T. Kiyosaki",
        "source": "Rich Dad Poor Dad"
    },
    {
        "quote": "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
        "author": "Will Durant"
    },
    {
        "quote": "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
        "author": "Stephen Covey"
    },
    {
        "quote": "Discipline is the bridge between goals and accomplishment.",
        "author": "Jim Rohn"
    },
    {
        "quote": "Either you run the day, or the day runs you.",
        "author": "Jim Rohn"
    },
    {
        "quote": "Integrity is doing the right thing, even when no one is watching.",
        "author": "C.S. Lewis"
    },
    {
        "quote": "The time is always right to do what is right.",
        "author": "Martin Luther King, Jr."
    },
    {
        "quote": "Be the same person in private that you are in public.",
        "author": "Unknown"
    },
    {
        "quote": "Your reputation is what you are perceived to be; your character is what you really are.",
        "author": "John Wooden"
    },
    {
        "quote": "It takes courage to grow up and become who you really are.",
        "author": "E.E. Cummings"
    },
    {
        "quote": "Hard work beats talent when talent doesn't work hard.",
        "author": "Tim Notke"
    },
    {
        "quote": "It does not matter how slowly you go as long as you do not stop.",
        "author": "Confucius"
    },
    {
        "quote": "Success is the sum of small efforts, repeated day in and day out.",
        "author": "Robert Collier"
    },
    {
        "quote": "The secret of getting ahead is getting started.",
        "author": "Mark Twain"
    },
    {
        "quote": "No one can make you feel inferior without your consent.",
        "author": "Eleanor Roosevelt"
    },
    {
        "quote": "The only person you should try to be better than is the person you were yesterday.",
        "author": "Matty Mullins"
    },
    {
        "quote": "Your value doesn't decrease based on someone's inability to see your worth.",
        "author": "Unknown"
    },
    {
        "quote": "No act of kindness, no matter how small, is ever wasted.",
        "author": "Aesop"
    },
    {
        "quote": "If you want to lift yourself up, lift up someone else.",
        "author": "Booker T. Washington"
    },
    {
        "quote": "Be kind, for everyone you meet is fighting a harder battle.",
        "author": "Plato"
    },
    {
        "quote": "A smooth sea never made a skilled sailor.",
        "author": "Franklin D. Roosevelt"
    },
    {
        "quote": "The only real mistake is the one from which we learn nothing.",
        "author": "Henry Ford"
    },
    {
        "quote": "A ship in harbor is safe, but that is not what ships are built for.",
        "author": "John A. Shedd"
    },
    {
        "quote": "Before you speak, think: T - Is it True? H - Is it Helpful? I - Is it Inspiring? N - Is it Necessary? K - Is it Kind?",
        "author": "Alan Redpath"
    },
    {
        "quote": "Wisdom is knowing the right path to take. Integrity is taking it.",
        "author": "M. H. McKee"
    },
    {
        "quote": "Stand for what is right. Even if you are standing alone.",
        "author": "Unknown"
    },
    {
        "quote": "Comparison is the thief of joy.",
        "author": "Theodore Roosevelt"
    },
    {
        "quote": "An unexamined life is not worth living.",
        "author": "Socrates"
    },
    {
        "quote": "Life is 10% what happens to you and 90% how you react to it.",
        "author": "Charles R. Swindoll"
    },
    {
        "quote": "Prayer is the greater work.",
        "author": "Oswald Chambers"
    },
    {
        "quote": "He is no fool who gives what he cannot keep to gain what he cannot lose.",
        "author": "Jim Elliot"
    },
    {
        "quote": "God does not call the qualified, He qualifies the called.",
        "author": "Unknown"
    },
    {
        "quote": "Faith is taking the first step even when you don't see the whole staircase.",
        "author": "Martin Luther King, Jr."
    },
    {
        "quote": "Waste no more time arguing what a good man should be. Be one.",
        "author": "Marcus Aurelius"
    },
    {
        "quote": "It is our choices that show what we truly are, far more than our abilities.",
        "author": "J.K. Rowling"
    }
];

const RECENTLY_SEEN_LIMIT = 5; // Store up to 5 recently seen quote indices

function getRecentlySeenQuoteIndices() {
    try {
        const stored = localStorage.getItem('recentlySeenQuoteIndices');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Error parsing recently seen quote indices from localStorage:", e);
        return [];
    }
}

function addQuoteIndexToRecentlySeen(index) {
    let recentlySeen = getRecentlySeenQuoteIndices();
    // Remove if already exists to move to end (most recent)
    recentlySeen = recentlySeen.filter(i => i !== index);
    recentlySeen.push(index);
    // Trim to limit
    if (recentlySeen.length > RECENTLY_SEEN_LIMIT) {
        recentlySeen = recentlySeen.slice(recentlySeen.length - RECENTLY_SEEN_LIMIT);
    }
    localStorage.setItem('recentlySeenQuoteIndices', JSON.stringify(recentlySeen));
}

function getQuoteOfTheDay() {
    const recentlySeenIndices = getRecentlySeenQuoteIndices();
    
    let availableQuoteIndices = [];
    for (let i = 0; i < quotes.length; i++) {
        if (!recentlySeenIndices.includes(i)) {
            availableQuoteIndices.push(i);
        }
    }

    // If all quotes have been seen recently, reset the history
    if (availableQuoteIndices.length === 0) {
        availableQuoteIndices = Array.from({ length: quotes.length }, (_, i) => i);
        localStorage.removeItem('recentlySeenQuoteIndices'); // Clear history
    }

    const randomIndex = availableQuoteIndices[Math.floor(Math.random() * availableQuoteIndices.length)];
    addQuoteIndexToRecentlySeen(randomIndex);
    return quotes[randomIndex];
}

export function initializeQuoteOfTheDay() {
    const quote = getQuoteOfTheDay();
    const quoteBanner = document.getElementById('quote-banner');
    const quoteText = document.getElementById('quote-text');
    const quoteAuthor = document.getElementById('quote-author');

    if (quoteText && quoteAuthor && quote) {
        quoteText.textContent = `"${quote.quote}"`;
        quoteAuthor.textContent = ` - ${quote.author}`;
        if(quote.source) {
            quoteAuthor.textContent += ` (${quote.source})`;
        }
    }
}