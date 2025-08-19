const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Available Gemini models:', JSON.stringify(data));
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
