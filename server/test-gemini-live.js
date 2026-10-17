/**
 * test-gemini-live.js
 * 
 * Automates OPTIONAL live Gemini API integration testing.
 * This runs against the real Google Gemini API using GEMINI_API_KEY from .env.
 * 
 * Requirements:
 * - MUST NOT be run in the default test suite to avoid unexpected billing/calls.
 * - MUST fail clearly if key is missing or invalid.
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const assert = require('assert');
const { getClientStatus } = require('./src/services/gemini/client');
const geminiService = require('./src/services/gemini/index');

async function runLiveTest() {
  console.log('\n─── Gemini API Integration (Live) ───────────────────────────');
  
  const status = getClientStatus();
  if (!status.configured) {
    console.error('❌ Live test skipped/failed: GEMINI_API_KEY is not configured in .env');
    process.exit(1);
  }

  console.log('API Key detected. Initiating live call to Gemini API...');
  
  try {
    // Generate a minimal quiz to save tokens and time
    const result = await geminiService.generateQuiz({
      subject: 'Geography',
      topic: 'Capitals of the World',
      questionCount: 1,
      difficulty: 'easy',
      questionType: 'mcq'
    });

    console.log('\n✅ Live response received and successfully validated against application schema:');
    console.log(`  - Title: ${result.title}`);
    console.log(`  - Questions generated: ${result.questions.length}`);
    console.log(`  - Sample Q: ${result.questions[0].question}`);
    console.log(`  - Concept: ${result.questions[0].concept}`);
    console.log(`  - Expected Type: mcq | Actual: ${result.questions[0].type}`);
    
    // Quick assertions
    assert.strictEqual(result.questions.length, 1);
    assert.strictEqual(result.questions[0].type, 'mcq');
    assert.ok(result.questions[0].options.length === 4);

    console.log('\n✅ Live Integration Test Passed.');
  } catch (err) {
    console.error('\n❌ Live Integration Test Failed:');
    console.error(`  Error Code: ${err.code || 'UNKNOWN'}`);
    console.error(`  Message: ${err.message}`);
    process.exit(1);
  }
}

runLiveTest();
