/**
 * Weather Service for Client Applications
 * Calls the secure backend /api/weather endpoint to prevent API key exposure.
 */

export async function fetchCurrentWeather(latitude, longitude) {
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    throw new Error('Valid latitude and longitude are required to fetch weather.');
  }

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);

  if (isNaN(latNum) || isNaN(lonNum)) {
    throw new Error('Coordinates must be valid numbers.');
  }

  const response = await fetch(`/api/weather?lat=${latNum}&lon=${lonNum}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response
    }
    const message = errorData.error || `Weather request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  const data = await response.json();
  return data;
}

export default {
  fetchCurrentWeather,
};
