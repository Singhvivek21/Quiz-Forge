/**
 * test-gemini-offline.js
 * 
 * Automates Gemini API integration testing IN OFFLINE MODE.
 * Mocks the GoogleGenerativeAI client to test validation, parsing, error handling,
 * and retry logic without using an actual API key or making network requests.
 */

'use strict';

const assert = require('assert');

// 1. Mock the client.js BEFORE requiring the main service
const clientModule = require('./src/services/gemini/client');
const { Errors, GeminiError } = require('./src/services/gemini/errors');
const { ERROR_CODES } = require('./src/services/gemini/constants');

const originalGetModel = clientModule.getGeminiModel;
const originalGetStatus = clientModule.getClientStatus;

let mockGenerateContent = async () => {};

// Replace the implementations
clientModule.getGeminiModel = () => ({
  generateContent: mockGenerateContent
});
clientModule.getClientStatus = () => ({ configured: true, model: 'mock-model' });

// 2. Now require the service (it will use the mocked client)
const geminiService = require('./src/services/gemini/index');

let passed = 0, failed = 0, total = 0;
const failures = [];

async function asyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ↳ ${err.message}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

function createMockResponse(text, finishReason = 'STOP') {
  return {
    response: {
      text: () => text,
      candidates: [{ finishReason }]
    }
  };
}

async function runTests() {
  console.log('\n─── Gemini API Integration (Offline Mocked) ───────────────────────────');

  // Test A: Successful mock parsing
  await asyncTest('Parses a successful, well-formed Gemini JSON response', async () => {
    mockGenerateContent = async () => createMockResponse(JSON.stringify({
      title: 'Mocked Quiz',
      subject: 'Math',
      topic: 'Algebra',
      difficulty: 'medium',
      questionType: 'mcq',
      questions: [
        {
          id: 'q1', type: 'mcq', question: '2+2?',
          options: [{id: 'A', text: '4'}, {id: 'B', text: '3'}, {id: 'C', text: '2'}, {id: 'D', text: '1'}],
          correctAnswer: 'A', explanation: 'Math', hint: 'Add', concept: 'Addition', difficulty: 'easy'
        }
      ]
    }));

    const result = await geminiService.generateQuiz({ subject: 'Math', topic: 'Algebra', questionCount: 1 });
    assert.strictEqual(result.title, 'Mocked Quiz');
    assert.strictEqual(result.questions.length, 1);
  });

  // Test B: Safety Block
  await asyncTest('Throws SAFETY_BLOCKED when finishReason is SAFETY', async () => {
    mockGenerateContent = async () => createMockResponse('', 'SAFETY');
    
    let threw = false;
    try {
      await geminiService.generateQuiz({ subject: 'Math', topic: 'Algebra', questionCount: 1 });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.code, ERROR_CODES.SAFETY_BLOCKED);
    }
    assert.ok(threw);
  });

  // Test C: Bad JSON formats
  await asyncTest('Throws INVALID_RESPONSE (service error on all fallbacks) for malformed JSON', async () => {
    mockGenerateContent = async () => createMockResponse('{ broken: "json" }');
    
    let threw = false;
    try {
      await geminiService.generateQuiz({ subject: 'Math', topic: 'Algebra', questionCount: 1 });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.code, ERROR_CODES.INVALID_RESPONSE);
    }
    assert.ok(threw);
  });

  // Test D: Rate Limiting & Retry behavior
  await asyncTest('Simulates 429 Rate Limit error gracefully', async () => {
    mockGenerateContent = async () => {
      const err = new Error('Resource has been exhausted (e.g. check quota).');
      err.status = 429;
      throw err;
    };
    
    let threw = false;
    try {
      await geminiService.generateQuiz({ subject: 'Math', topic: 'Algebra', questionCount: 1 });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.code, ERROR_CODES.QUOTA_EXCEEDED);
    }
    assert.ok(threw);
  });

  // Test E: Timeout simulation
  await asyncTest('Handles simulated timeout correctly', async () => {
    mockGenerateContent = async () => {
      // Simulate taking too long (the actual wrapper is testing for a rejection, so we can mock the timeout error)
      const err = new Error('timed out');
      throw err;
    };
    
    let threw = false;
    try {
      await geminiService.generateQuiz({ subject: 'Math', topic: 'Algebra', questionCount: 1 });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.code, ERROR_CODES.TIMEOUT);
    }
    assert.ok(threw);
  });

  // Restore originals (good practice)
  clientModule.getGeminiModel = originalGetModel;
  clientModule.getClientStatus = originalGetStatus;

  console.log(`\nGemini Offline Tests: ${passed}/${total} passed`);
  if (failed > 0) process.exit(1);
}

runTests();
