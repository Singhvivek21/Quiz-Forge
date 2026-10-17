const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const geminiService = require('./src/services/gemini');
const { validateAdaptiveInput, validateGeminiOutput } = require('./src/services/gemini/validator');

async function testAdaptivePractice() {
  console.log('=== Testing Adaptive Practice System Integration ===\n');

  const mockPayload = {
    subject: 'Biology',
    topic: 'Photosynthesis',
    weakConcepts: ['Carbon Fixation & RuBisCO', 'Calvin Cycle Enzymology'],
    previousQuestions: [
      'What is the primary function of chlorophyll in plant cells?',
      'Where do the light-independent reactions take place?',
      'Which enzyme fixes CO2 in C3 photosynthesis?'
    ],
    previousScore: '2/3 (67%)',
    previousDifficulty: 'medium',
    targetDifficulty: 'medium',
    questionCount: 3,
    language: 'English',
    enableHints: true,
    enableExplanations: true,
  };

  // 1. Test Input Validation
  console.log('1. Testing adaptive input validation...');
  const sanitised = validateAdaptiveInput(mockPayload);
  console.log('✓ Input validation passed!');
  console.log('  Subject:', sanitised.subject);
  console.log('  Topic:', sanitised.topic);
  console.log('  Weak concepts:', sanitised.weakConcepts);
  console.log('  Questions to avoid count:', sanitised.previousQuestions.length);

  // 2. Test Live Gemini Adaptive Generation
  console.log('\n2. Testing live call to generateAdaptiveQuiz...');
  try {
    const quiz = await geminiService.generateAdaptiveQuiz(mockPayload);
    console.log('\n✓ ADAPTIVE QUIZ GENERATION SUCCEEDED!');
    console.log('Title:', quiz.title);
    console.log('Difficulty:', quiz.difficulty);
    console.log('Is Adaptive:', quiz.isAdaptive);
    console.log('Targeted Concepts:', quiz.targetedConcepts);
    console.log('Questions count:', quiz.questions.length);

    console.log('\nGenerated Questions Sample:');
    quiz.questions.forEach((q, i) => {
      console.log(`  [${q.id}] ${q.question}`);
      console.log(`      Concept: ${q.concept} (${q.difficulty})`);
      console.log(`      Correct Answer: ${q.correctAnswer}`);
    });

    // Verify none of previous questions were repeated verbatim
    const prevSet = new Set(mockPayload.previousQuestions.map((q) => q.toLowerCase().trim()));
    const repeated = quiz.questions.filter((q) => prevSet.has(q.question.toLowerCase().trim()));
    if (repeated.length === 0) {
      console.log('\n✓ ALL QUESTIONS ARE 100% FRESH (0 repeated questions from previous attempt)!');
    } else {
      console.warn('\n⚠️ Some questions matched previous attempt:', repeated.map((q) => q.question));
    }
  } catch (err) {
    console.error('✗ Adaptive generation error:', err.message);
  }
}

testAdaptivePractice();
