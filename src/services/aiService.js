/**
 * Gemini AI Safety Advice Client Service
 * 
 * Provides client-side caching (sessionStorage + memory) to minimize Gemini API calls
 * and calls the backend `/api/ai/safety-advice` proxy endpoint.
 */

// In-memory fallback if sessionStorage is restricted or disabled
const memoryCache = new Map();

/**
 * Computes a standardized cache key to prevent unnecessary Gemini API credit usage.
 */
export function createSafetyAdviceCacheKey(payload = {}) {
  const weather = payload.weather || {};
  const risk = payload.risk || {};
  const loc = payload.location || weather.location || {};

  const lat = typeof loc.latitude === 'number' ? loc.latitude.toFixed(2) : (loc.lat ? parseFloat(loc.lat).toFixed(2) : '0');
  const lon = typeof loc.longitude === 'number' ? loc.longitude.toFixed(2) : (loc.lon ? parseFloat(loc.lon).toFixed(2) : '0');
  const condition = (weather.condition || 'normal').toLowerCase().trim();
  const precipitation = typeof weather.precipitation === 'number' ? Math.round(weather.precipitation) : 0;
  const windSpeed = typeof weather.windSpeed === 'number' ? Math.round(weather.windSpeed) : 0;
  const riskLevel = (risk.riskLevel || 'LOW').toUpperCase();
  const riskScore = typeof risk.riskScore === 'number' ? risk.riskScore : 0;

  return `safety_advice_${lat}_${lon}_${condition}_${precipitation}_${windSpeed}_${riskLevel}_${riskScore}`;
}

/**
 * Retrieves cached safety advice if available in session storage or memory.
 */
export function getCachedSafetyAdvice(cacheKey) {
  try {
    const sessionItem = sessionStorage.getItem(cacheKey);
    if (sessionItem) {
      return JSON.parse(sessionItem);
    }
  } catch {
    // sessionStorage not available
  }
  return memoryCache.get(cacheKey) || null;
}

/**
 * Stores safety advice in session storage and memory.
 */
export function setCachedSafetyAdvice(cacheKey, advice) {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(advice));
  } catch {
    // sessionStorage full or blocked
  }
  memoryCache.set(cacheKey, advice);
}

/**
 * Fetches safety advice from backend `/api/ai/safety-advice` with automated session-level caching.
 *
 * @param {Object} options
 * @param {Object} [options.location]
 * @param {Object} [options.weather]
 * @param {Object} [options.risk]
 * @param {boolean} [options.forceRefresh]
 * @returns {Promise<{ summary: string, recommendations: string[], source: 'gemini' | 'fallback' }>}
 */
export async function fetchSafetyAdvice({ location, weather, risk, forceRefresh = false }) {
  const cacheKey = createSafetyAdviceCacheKey({ location, weather, risk });

  // 1. Return cached advice if not forcing refresh
  if (!forceRefresh) {
    const cached = getCachedSafetyAdvice(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // 2. Prepare request payload for backend Gemini endpoint
  const payload = {
    location: location || weather?.location || 'Current Area',
    weatherCondition: weather?.condition || 'Normal',
    temperature: weather?.temperature,
    humidity: weather?.humidity,
    windSpeed: weather?.windSpeed,
    precipitation: weather?.precipitation,
    riskScore: risk?.riskScore ?? 0,
    riskLevel: risk?.riskLevel || 'LOW',
    trend: risk?.trend || 'STABLE',
    factors: risk?.factors || [],
  };

  try {
    const response = await fetch('/api/ai/safety-advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = {
      summary: data.summary || 'Stay aware of current conditions and monitor updates.',
      recommendations: Array.isArray(data.recommendations) && data.recommendations.length > 0
        ? data.recommendations
        : ['Check local forecasts periodically.', 'Keep emergency devices charged.'],
      source: data.source || 'fallback',
    };

    // Cache the response
    setCachedSafetyAdvice(cacheKey, result);
    return result;
  } catch {
    // Fallback gracefully without technical errors
    const fallback = {
      summary: 'Stay aware of changing weather conditions and monitor local channels.',
      recommendations: [
        'Check local weather updates periodically.',
        'Keep mobile devices charged and emergency contacts accessible.',
        'Follow instructions from local emergency personnel.',
      ],
      source: 'fallback',
    };
    setCachedSafetyAdvice(cacheKey, fallback);
    return fallback;
  }
}

export default {
  fetchSafetyAdvice,
  createSafetyAdviceCacheKey,
  getCachedSafetyAdvice,
  setCachedSafetyAdvice,
};
