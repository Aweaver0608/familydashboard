const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const prompt = event.queryStringParameters.prompt || '';

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing Gemini API key" })
    };
  }

  // Example Gemini API endpoint and payload (update as needed for your use case)
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=' + GEMINI_API_KEY;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    console.log('Gemini API request payload:', JSON.stringify(payload));
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    console.log('Gemini API response:', JSON.stringify(data));
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
