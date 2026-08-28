import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getWeatherData } from './server/src/services/weatherService.js';
import { calculateRisk } from './server/src/services/riskService.js';
import { getSafetyAdvice } from './server/src/services/aiService.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Disaster Guard API',
    });
  });

  /**
   * GET /api/weather?lat={latitude}&lon={longitude}
   * Fetches weather metrics via OpenWeather API
   */
  app.get('/api/weather', async (req, res) => {
    try {
      const { lat, lon } = req.query;
      const weatherPayload = await getWeatherData(lat, lon);
      return res.json(weatherPayload);
    } catch (err: any) {
      const status = err.status || (err.response ? err.response.status : 500);
      const message = err.message || (err.response?.data?.message || 'Error fetching weather data.');
      return res.status(status).json({
        error: message,
        status,
      });
    }
  });

  /**
   * GET /api/risk?lat={latitude}&lon={longitude}
   * Obtains live weather and evaluates deterministic disaster risk score (0-100), level, trend & factors
   */
  app.get('/api/risk', async (req, res) => {
    try {
      const { lat, lon } = req.query;
      const weatherPayload = await getWeatherData(lat, lon);
      const riskPayload = calculateRisk(weatherPayload);

      return res.json({
        weather: weatherPayload,
        risk: riskPayload,
      });
    } catch (err: any) {
      const status = err.status || (err.response ? err.response.status : 500);
      const message = err.message || (err.response?.data?.message || 'Error computing disaster risk.');
      return res.status(status).json({
        error: message,
        status,
      });
    }
  });

  /**
   * POST /api/ai/safety-advice
   * Calls Gemini AI (with caching and robust fallback) to generate short, practical citizen safety recommendations
   */
  app.post('/api/ai/safety-advice', async (req, res) => {
    try {
      const input = req.body || {};
      const advice = await getSafetyAdvice(input);
      return res.json(advice);
    } catch (err: any) {
      console.error('API /api/ai/safety-advice error:', err);
      // Even if unexpected error occurs, safety advice returns deterministic fallback
      const fallback = {
        summary: 'Current conditions indicate standard caution is advised. Monitor local weather and emergency channels.',
        recommendations: [
          'Stay aware of changing local weather conditions.',
          'Keep mobile phones charged and emergency contacts accessible.',
          'Follow instructions from local emergency personnel.',
        ],
        source: 'fallback',
      };
      return res.json(fallback);
    }
  });

  // Vite Middleware for dev / static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Disaster Guard server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
