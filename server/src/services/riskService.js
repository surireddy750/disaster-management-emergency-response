/**
 * Disaster Risk Engine Service (Rule-Based Deterministic Risk Calculation)
 * Receives weather data and calculates:
 * - riskScore (0–100 clamped)
 * - riskLevel (LOW, MODERATE, HIGH, CRITICAL)
 * - trend (STABLE, INCREASING, DECREASING)
 * - factors (List of contributing factor descriptions)
 */

export const RISK_LEVELS = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const RISK_TRENDS = {
  STABLE: 'STABLE',
  INCREASING: 'INCREASING',
  DECREASING: 'DECREASING',
};

/**
 * Maps a numeric score (0-100) to standard Risk Levels:
 * 0–25 = LOW
 * 26–50 = MODERATE
 * 51–75 = HIGH
 * 76–100 = CRITICAL
 */
export function getRiskLevel(score) {
  if (score <= 25) return RISK_LEVELS.LOW;
  if (score <= 50) return RISK_LEVELS.MODERATE;
  if (score <= 75) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.CRITICAL;
}

/**
 * Calculates risk score and factors based on deterministic weather metrics.
 * 
 * @param {Object} weather
 * @param {string} weather.condition - Weather condition (e.g. 'Clear', 'Clouds', 'Rain', 'Thunderstorm', 'Snow', 'Drizzle')
 * @param {number} [weather.precipitation] - Precipitation volume in mm
 * @param {number} [weather.windSpeed] - Wind speed in m/s (from OpenWeather)
 * @param {number} [weather.windSpeedKmh] - Optional explicit wind speed in km/h
 * @returns {{ riskScore: number, riskLevel: string, trend: string, factors: string[] }}
 */
export function calculateRisk(weather = {}) {
  let score = 0;
  const factors = [];

  const rawCondition = (weather.condition || '').trim();
  const conditionUpper = rawCondition.toUpperCase();
  const precipitation = typeof weather.precipitation === 'number' ? weather.precipitation : 0;

  // Convert wind speed to km/h if passed in m/s (OpenWeather default is m/s)
  let windSpeedKmh = 0;
  if (typeof weather.windSpeedKmh === 'number') {
    windSpeedKmh = weather.windSpeedKmh;
  } else if (typeof weather.windSpeed === 'number') {
    windSpeedKmh = weather.windSpeed * 3.6;
  }
  windSpeedKmh = Number(windSpeedKmh.toFixed(1));

  // --- 1. Weather Condition Rules ---
  // Clear → 0 points
  // Clouds → 5 points
  // Drizzle → 15 points
  // Rain → 30 points
  // Thunderstorm → 45 points
  // Snow → 10 points
  if (conditionUpper === 'THUNDERSTORM') {
    score += 45;
    factors.push('Thunderstorm weather conditions detected');
  } else if (conditionUpper === 'RAIN') {
    score += 30;
    factors.push('Active rainfall detected');
  } else if (conditionUpper === 'DRIZZLE') {
    score += 15;
    factors.push('Light drizzle conditions');
  } else if (conditionUpper === 'SNOW') {
    score += 10;
    factors.push('Snowfall conditions detected');
  } else if (conditionUpper === 'CLOUDS') {
    score += 5;
    factors.push('Overcast cloud cover');
  } else if (conditionUpper === 'CLEAR') {
    // 0 points
  } else if (
    conditionUpper.includes('TORNADO') ||
    conditionUpper.includes('SQUALL') ||
    conditionUpper.includes('STORM')
  ) {
    score += 45;
    factors.push(`Severe atmospheric condition: ${rawCondition}`);
  }

  // --- 2. Precipitation Rules ---
  // 0 mm → 0 points
  // > 0 and < 5 mm → 10 points
  // 5–20 mm → 20 points
  // > 20 mm → 30 points
  if (precipitation > 20) {
    score += 30;
    factors.push(`Heavy rainfall detected (${precipitation} mm)`);
  } else if (precipitation >= 5) {
    score += 20;
    factors.push(`Moderate precipitation (${precipitation} mm)`);
  } else if (precipitation > 0) {
    score += 10;
    factors.push(`Light precipitation detected (${precipitation} mm)`);
  }

  // --- 3. Wind Speed Rules (km/h) ---
  // < 20 km/h → 0 points
  // 20–40 km/h → 10 points
  // 40–60 km/h → 20 points
  // > 60 km/h → 30 points
  if (windSpeedKmh > 60) {
    score += 30;
    factors.push(`Severe / gale-force winds (${windSpeedKmh} km/h)`);
  } else if (windSpeedKmh >= 40) {
    score += 20;
    factors.push(`Strong wind conditions (${windSpeedKmh} km/h)`);
  } else if (windSpeedKmh >= 20) {
    score += 10;
    factors.push(`Elevated wind speeds (${windSpeedKmh} km/h)`);
  }

  // Strictly clamp score between 0 and 100
  const riskScore = Math.max(0, Math.min(100, Math.round(score)));
  const riskLevel = getRiskLevel(riskScore);

  // --- 4. Trend Determination ---
  // - Thunderstorm or very heavy weather conditions → INCREASING
  // - Rain with meaningful precipitation → INCREASING
  // - Clear conditions → STABLE
  // - Otherwise → STABLE
  let trend = RISK_TRENDS.STABLE;
  if (
    conditionUpper === 'THUNDERSTORM' ||
    conditionUpper.includes('TORNADO') ||
    conditionUpper.includes('SQUALL') ||
    precipitation > 20 ||
    windSpeedKmh > 60
  ) {
    trend = RISK_TRENDS.INCREASING;
  } else if (conditionUpper === 'RAIN' && precipitation > 0) {
    trend = RISK_TRENDS.INCREASING;
  } else if (conditionUpper === 'CLEAR') {
    trend = RISK_TRENDS.STABLE;
  } else {
    trend = RISK_TRENDS.STABLE;
  }

  return {
    riskScore,
    riskLevel,
    trend,
    factors,
  };
}

export default {
  calculateRisk,
  getRiskLevel,
  RISK_LEVELS,
  RISK_TRENDS,
};
