export const WEATHER_API_KEY = "075f78cd37cba4d6a3acc3289f567757";
export const GEMINI_API_KEY = "AIzaSyAX6HEd5kZBFjzsNn4wixNv3-Ah3yILRl0";
export const MERRIAM_WEBSTER_DICTIONARY_API_KEY = "50a3a0ee-c6ec-4f2c-8cb0-b17dd80f75a1";
export const MERRIAM_WEBSTER_THESAURUS_API_KEY = "e012d782-cc43-4bc4-9644-e3a521fa1038";
export const MERRIAM_WEBSTER_COLLEGIATE_API_KEY = "f197f19e-dfd4-4e19-baf6-dd705ec0d7d1";

export const WEATHER_CITY = "Greer,US";
export const WEATHER_UNITS = "imperial";
export const WEATHER_CITY_DETAILS = { lat: 34.9388, lon: -82.2386 }; // Placeholder: Update with actual coordinates for your city
export const FAMILY_MEMBERS = ["Andrew", "Jenna", "Olivia", "Malia", "Kaci", "Declan", "Halle", "Liam"];

export const FEELINGS_WHEEL = {
    "Mad": {
        icon: 'angry', value: 1, color: 'bg-red-600/50',
        feelings: ["Hurt", "Worried", "Embarrassed", "Vulnerable", "Annoyed", "Defensive", "Sarcastic", "Frustrated", "Jealous", "Hostile", "Hateful", "Selfish", "Angry", "Critical", "Rattled"]
    },
    "Scared": {
        icon: 'frown', value: 2, color: 'bg-orange-500/50',
        feelings: ["Insecure", "Helpless", "Hopeless", "Anxious", "Rejected", "Confused", "Nervous", "Overwhelmed"]
    },
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
    "Sad": {
        icon: 'frown', value: 2, color: 'bg-indigo-500/50',
        feelings: ["Uncaring", "Hopeless", "Ashamed", "Depressed", "Miserable", "Desolate", "Guilty", "Stupid", "Lonely", "Bored", "Tired", "Sleepy"]
    }
};

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

export const VERSE_HISTORY_LENGTH = 365;

export const verseInsightSchema = {
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

export const activitySchema = {
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

export const feelingInsightSchema = {
    type: "OBJECT",
    properties: {
        "explanation": { "type": "STRING" },
        "strategies": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": { "title": { "type": "STRING" }, "description": { "type": "STRING" } },
                "required": ["title", "description"]
            }
        }
    },
    "required": ["explanation", "strategies"]
};