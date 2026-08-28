import { GoogleGenAI, Type } from '@google/genai';

/**
 * In-memory backend cache for Gemini safety advice to minimize API credit usage.
 * Key format: `${lat}_${lon}_${condition}_${precip}_${wind}_${riskLevel}_${riskScore}`
 */
const adviceCache = new Map();

/**
 * Deterministic fallback advice generator when Gemini API key is missing,
 * quota is exceeded, or an error occurs.
 */
export function getFallbackSafetyAdvice(riskLevel = 'LOW', weather = {}) {
  const levelUpper = (riskLevel || 'LOW').toUpperCase();
  const condition = weather.condition || 'current';

  switch (levelUpper) {
    case 'CRITICAL':
      return {
        summary: 'Current conditions indicate a high level of potential danger. Move to a safer location if necessary and follow instructions from local authorities.',
        recommendations: [
          'Remain indoors in a secure, sturdy structure away from windows.',
          'Follow all official directives and local emergency announcements immediately.',
          'Keep an emergency go-bag prepared with essential medications, water, and documents.',
          'Avoid flooded roads, low-lying zones, and downed utility lines.',
        ],
        source: 'fallback',
      };
    case 'HIGH':
      return {
        summary: 'Weather conditions indicate increased risk. Avoid unnecessary travel and monitor local emergency information.',
        recommendations: [
          'Limit non-essential travel and outdoor activities until weather clears.',
          'Stay tuned to official weather channels and community advisories.',
          'Keep mobile phones, power banks, and emergency flashlights charged.',
          'Inspect drainage around your residence if heavy precipitation continues.',
        ],
        source: 'fallback',
      };
    case 'MODERATE':
      return {
        summary: `Moderate weather conditions (${condition}) detected. Exercise caution during outdoor activities and travel.`,
        recommendations: [
          'Monitor weather updates periodically for sudden changes in intensity.',
          'Secure loose outdoor items if wind speeds or rain pick up.',
          'Allow extra commute time for potential road slickness or reduced visibility.',
        ],
        source: 'fallback',
      };
    case 'LOW':
    default:
      return {
        summary: 'Current conditions indicate a low level of weather-related risk. Stay aware of changing conditions.',
        recommendations: [
          'Check local weather forecasts periodically throughout the day.',
          'Maintain standard household emergency supplies and first aid items.',
          'Enjoy regular daily activities while remaining mindful of ambient weather shifts.',
        ],
        source: 'fallback',
      };
  }
}

/**
 * Generates a stable cache key based on the environmental & risk metrics.
 */
export function generateCacheKey(input = {}) {
  const loc = input.location || {};
  const lat = typeof loc.latitude === 'number' ? loc.latitude.toFixed(2) : (input.lat ? parseFloat(input.lat).toFixed(2) : '0');
  const lon = typeof loc.longitude === 'number' ? loc.longitude.toFixed(2) : (input.lon ? parseFloat(input.lon).toFixed(2) : '0');
  const condition = (input.weatherCondition || input.condition || loc.condition || 'unknown').toLowerCase().trim();
  const precipitation = typeof input.precipitation === 'number' ? Math.round(input.precipitation) : 0;
  const windSpeed = typeof input.windSpeed === 'number' ? Math.round(input.windSpeed) : 0;
  const riskLevel = (input.riskLevel || 'LOW').toUpperCase();
  const riskScore = typeof input.riskScore === 'number' ? input.riskScore : 0;

  return `${lat}_${lon}_${condition}_${precipitation}_${windSpeed}_${riskLevel}_${riskScore}`;
}

/**
 * Fetches AI Safety Advice from Gemini 3.7 Flash or falls back gracefully.
 * 
 * @param {Object} input
 * @param {Object|string} [input.location]
 * @param {string} [input.weatherCondition]
 * @param {string} [input.condition]
 * @param {number} [input.temperature]
 * @param {number} [input.humidity]
 * @param {number} [input.windSpeed]
 * @param {number} [input.precipitation]
 * @param {number} [input.riskScore]
 * @param {string} [input.riskLevel]
 * @param {string} [input.trend]
 * @param {string[]} [input.factors]
 * @returns {Promise<{ summary: string, recommendations: string[], source: 'gemini' | 'fallback' }>}
 */
export async function getSafetyAdvice(input = {}) {
  const riskLevel = (input.riskLevel || 'LOW').toUpperCase();
  const riskScore = input.riskScore ?? 0;
  const condition = input.weatherCondition || input.condition || 'Normal';
  const temperature = input.temperature !== undefined ? `${input.temperature}°C` : 'N/A';
  const humidity = input.humidity !== undefined ? `${input.humidity}%` : 'N/A';
  const windSpeed = input.windSpeed !== undefined ? `${input.windSpeed} m/s` : 'N/A';
  const precipitation = input.precipitation !== undefined ? `${input.precipitation} mm` : '0 mm';
  const trend = input.trend || 'STABLE';
  const factors = Array.isArray(input.factors) && input.factors.length > 0 ? input.factors.join(', ') : 'None';
  const locationName = typeof input.location === 'object' ? (input.location?.name || 'Local Area') : (input.location || 'Local Area');

  // Check cache first to avoid unneeded API consumption
  const cacheKey = generateCacheKey(input);
  if (adviceCache.has(cacheKey)) {
    return adviceCache.get(cacheKey);
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const isKeyLoaded = Boolean(
    apiKey &&
    apiKey !== 'MY_GEMINI_API_KEY' &&
    apiKey !== 'your-gemini-api-key' &&
    apiKey !== 'your_actual_gemini_api_key_here'
  );

  // Safe diagnostic log (never prints the API key)
  console.log(`[Gemini Diagnostics] API key loaded: ${isKeyLoaded ? 'YES' : 'NO'}`);

  // If API key is missing or dummy placeholder, return deterministic fallback directly
  if (!isKeyLoaded) {
    const fallback = getFallbackSafetyAdvice(riskLevel, { condition });
    adviceCache.set(cacheKey, fallback);
    return fallback;
  }

  const modelName = 'gemini-3.6-flash';
  console.log(`[Gemini Diagnostics] Model being used: ${modelName}`);

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 10000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are a practical, calm safety assistant.
Analyze the following atmospheric telemetry and disaster risk data for ${locationName}:
- Weather Condition: ${condition}
- Temperature: ${temperature}
- Humidity: ${humidity}
- Wind Speed: ${windSpeed}
- Precipitation: ${precipitation}
- Disaster Risk Score: ${riskScore} / 100
- Risk Level: ${riskLevel}
- Risk Trend: ${trend}
- Contributing Hazard Factors: ${factors}

STRICT SAFETY RULES:
1. Base your guidance ONLY on the supplied data.
2. DO NOT invent disasters, official government warnings, evacuations, shelter locations, or non-existent hazards.
3. Provide simple, short, practical safety advice suitable for a citizen.
4. Provide between 3 and 5 clear, actionable recommendations.
5. Use plain language.
6. Clearly avoid presenting yourself as an official emergency authority or legal authority.

Return your response in strict JSON adhering to the schema.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: 'You are an AI safety adviser for citizens during changing weather and environmental conditions. Provide concise, factual, practical recommendations based solely on given data.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'A 1-2 sentence concise safety summary of current conditions.',
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: '3 to 5 practical, actionable safety recommendations for the citizen.',
              },
            },
            required: ['summary', 'recommendations'],
          },
        },
      });
    } catch (primaryModelErr) {
      const primaryErrStatus = primaryModelErr?.status || primaryModelErr?.name || 'Error';
      console.warn(`[Gemini Diagnostics] Primary model (${modelName}) failed with ${primaryErrStatus}: ${primaryModelErr?.message || primaryModelErr}. Trying backup flash model...`);
      
      // Fallback model trial: gemini-flash-latest
      const backupModel = 'gemini-flash-latest';
      console.log(`[Gemini Diagnostics] Backup model being used: ${backupModel}`);
      response = await ai.models.generateContent({
        model: backupModel,
        contents: prompt,
        config: {
          systemInstruction: 'You are an AI safety adviser for citizens during changing weather and environmental conditions. Provide concise, factual, practical recommendations based solely on given data.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'A 1-2 sentence concise safety summary of current conditions.',
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: '3 to 5 practical, actionable safety recommendations for the citizen.',
              },
            },
            required: ['summary', 'recommendations'],
          },
        },
      });
    }

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty response from Gemini model');
    }

    const parsed = JSON.parse(text);

    // Validate structure
    const summary = typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : getFallbackSafetyAdvice(riskLevel, { condition }).summary;
    let recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.filter(r => typeof r === 'string' && r.trim()).slice(0, 5) : [];

    if (recommendations.length < 3) {
      recommendations = getFallbackSafetyAdvice(riskLevel, { condition }).recommendations;
    }

    const result = {
      summary,
      recommendations,
      source: 'gemini',
    };

    // Cache the result
    adviceCache.set(cacheKey, result);
    return result;
  } catch (err) {
    const errorType = err?.status || err?.name || (err?.response ? err.response.status : 'Network/FetchError');
    const errorMessage = err?.message || String(err);
    console.warn(`[Gemini Diagnostics] Gemini HTTP/API error type: ${errorType} - ${errorMessage}`);
    console.warn('Gemini Safety Advice generation failed, using fallback.');
    const fallback = getFallbackSafetyAdvice(riskLevel, { condition });
    adviceCache.set(cacheKey, fallback);
    return fallback;
  }
}

export default {
  getSafetyAdvice,
  getFallbackSafetyAdvice,
  generateCacheKey,
};
