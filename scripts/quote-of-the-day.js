
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
        "quote": "The single most powerful asset we all have is our mind. If it is trained well, it can create enormous wealth.",
        "author": "Robert T. Kiyosaki",
        "source": "Rich Dad Poor Dad"
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
    }
];

function getQuoteOfTheDay() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const quoteIndex = dayOfYear % quotes.length;
    return quotes[quoteIndex];
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
