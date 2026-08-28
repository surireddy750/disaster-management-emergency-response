import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.nodeEnv,
    weatherApiConfigured: Boolean(config.openWeatherApiKey),
    timestamp: new Date().toISOString()
  });
});

export default app;
