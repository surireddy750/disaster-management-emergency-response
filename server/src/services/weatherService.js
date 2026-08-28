import axios from 'axios';

/**
 * Backend Weather Service
 * Fetches current weather metrics from OpenWeather API using server-side API key.
 */
export async function getWeatherData(latitude, longitude) {
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    const err = new Error('Missing required coordinates: latitude and longitude are required.');
    err.status = 400;
    throw err;
  }

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);

  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    const err = new Error('Invalid latitude. Must be a numeric value between -90 and 90.');
    err.status = 400;
    throw err;
  }

  if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
    const err = new Error('Invalid longitude. Must be a numeric value between -180 and 180.');
    err.status = 400;
    throw err;
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey === 'your-openweather-api-key' || apiKey === 'MY_OPENWEATHER_API_KEY') {
    const err = new Error('OpenWeather API key is not configured on the server.');
    err.status = 503;
    throw err;
  }

  const openWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latNum}&lon=${lonNum}&units=metric&appid=${apiKey}`;
  
  const response = await axios.get(openWeatherUrl, { timeout: 8000 });
  const data = response.data;

  // Calculate precipitation (1h or 3h rain/snow volume)
  let precipitation = 0;
  if (data.rain) {
    precipitation += data.rain['1h'] || data.rain['3h'] || 0;
  }
  if (data.snow) {
    precipitation += data.snow['1h'] || data.snow['3h'] || 0;
  }

  const windSpeed = Number((data.wind?.speed ?? 0).toFixed(1));

  return {
    location: {
      name: data.name || `${latNum.toFixed(2)}°, ${lonNum.toFixed(2)}°`,
      latitude: data.coord?.lat ?? latNum,
      longitude: data.coord?.lon ?? lonNum,
      country: data.sys?.country || '',
    },
    temperature: Math.round(data.main?.temp ?? 0),
    feelsLike: Math.round(data.main?.feels_like ?? 0),
    condition: data.weather?.[0]?.main || 'Unknown',
    description: data.weather?.[0]?.description || 'No description available',
    humidity: data.main?.humidity ?? 0,
    windSpeed,
    precipitation: Number(precipitation.toFixed(1)),
    icon: data.weather?.[0]?.icon || '01d',
    timestamp: new Date().toISOString(),
  };
}

export default {
  getWeatherData,
};
