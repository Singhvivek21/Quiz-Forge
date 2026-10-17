require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { initDb } = require('./src/db');
const app = require('./app');

const PORT = process.env.PORT || 3001;

// Initialise DB before accepting connections
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 AI QuizForge server running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Gemini key  : ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? '✓ set' : '✗ NOT SET — add to .env'}\n`);
  });
}).catch((err) => {
  console.error('❌ Failed to initialise database:', err);
  process.exit(1);
});
