const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
  const { city = "London", units = "imperial" } = event.queryStringParameters;

  if (!WEATHER_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing API key" })
    };
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${WEATHER_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
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