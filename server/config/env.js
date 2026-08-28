import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config(); // fallback to root .env if present

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  appUrl: process.env.APP_URL || 'http://localhost:5173'
};
