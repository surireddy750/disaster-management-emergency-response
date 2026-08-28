/**
 * Disaster Risk Assessment Client Service
 * Calls the backend `/api/risk` endpoint to obtain computed risk telemetry and underlying weather metrics.
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
 * Fetches computed disaster risk and weather telemetry for specific coordinates.
 * @param {number|string} latitude
 * @param {number|string} longitude
 * @returns {Promise<{ weather: Object, risk: { riskScore: number, riskLevel: string, trend: string, factors: string[] } }>}
 */
export async function fetchRiskAssessment(latitude, longitude) {
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    throw new Error('Valid latitude and longitude are required for risk calculation.');
  }

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);

  if (isNaN(latNum) || isNaN(lonNum)) {
    throw new Error('Coordinates must be valid numbers.');
  }

  const response = await fetch(`/api/risk?lat=${latNum}&lon=${lonNum}`, {
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
    const message = errorData.error || `Risk calculation request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  const data = await response.json();
  return data;
}

export default {
  fetchRiskAssessment,
  RISK_LEVELS,
  RISK_TRENDS,
};
