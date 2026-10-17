/**
 * Environment configuration — validates required variables at startup.
 * All other modules should import from here instead of reading process.env directly.
 */

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  databasePath: process.env.DATABASE_PATH || './data/quizforge.sqlite',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};

// Warn (not throw) if Gemini key is missing — quiz generation will fail gracefully.
if (!config.geminiApiKey || config.geminiApiKey === 'your_gemini_api_key_here') {
  console.warn('⚠️  GEMINI_API_KEY is not set. Quiz generation will not work until you add it to .env');
}

module.exports = config;
