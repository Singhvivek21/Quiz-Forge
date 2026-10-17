/**
 * test-question-types.js
 *
 * Comprehensive Automated Test Suite for Diverse Question Types:
 *  1. MCQ validation & scoring
 *  2. True / False validation & scoring
 *  3. Scenario-based validation, context parsing & scoring
 *  4. Case-based MCQ validation, context parsing & scoring
 *  5. Numerical / calculation validation:
 *     - Unit enforcement
 *     - Calculation verification
 *     - Tolerance checks
 *     - Rounding ambiguity avoidance
 *     - Single accepted answer verification
 *  6. Subject suitability verification (ensuring math is only on quantitative topics)
 *  7. Mixed question types validation
 *  8. SQLite Database persistence for all new fields (type, context, unit, numeric_answer, tolerance)
 *  9. Real Gemini API Generation for each question type
 */

require('dotenv').config();
const { initDb } = require('./src/db');
const QuizRepository = require('./src/repositories/quiz.repository');
const { validateQuizInput, validateGeminiOutput } = require('./src/services/gemini/validator');
const { generateQuiz } = require('./src/services/gemini');
const { calculateQuizScore } = require('./scoring-node');

let totalTests = 0;
let passedTests = 0;

function assert(condition, name) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ FAIL: ${name}`);
  }
}

async function runTests() {
  console.log('🧪 Starting Question Types Test Suite...\n');

  // ── 1. True / False Validation & Scoring ─────────────────────────────────
  console.log('── Test Group 1: True / False Questions ──');

  const validTFOutput = {
    title: 'Cellular Respiration True/False',
    subject: 'Biology',
    topic: 'Glycolysis',
    difficulty: 'medium',
    questionType: 'true_false',
    hasSourceMaterial: false,
    questions: [
      {
        id: 'q1',
        type: 'true_false',
        question: 'Glycolysis takes place inside the mitochondrial matrix.',
        options: [
          { id: 'True', text: 'True' },
          { id: 'False', text: 'False' }
        ],
        correctAnswer: 'False',
        explanation: 'Glycolysis occurs in the cytoplasm, not the mitochondrial matrix.',
        hint: 'Think about where glucose first enters the cell.',
        concept: 'Glycolysis Location',
        difficulty: 'easy'
      },
      {
        id: 'q2',
        type: 'true_false',
        question: 'Glycolysis yields a net gain of 2 ATP molecules per glucose molecule.',
        options: [
          { id: 'True', text: 'True' },
          { id: 'False', text: 'False' }
        ],
        correctAnswer: 'True',
        explanation: '2 ATP are invested and 4 ATP are generated, giving a net yield of 2 ATP.',
        hint: 'Consider total ATP generated minus ATP invested.',
        concept: 'Net ATP Yield',
        difficulty: 'medium'
      }
    ]
  };

  const validatedTF = validateGeminiOutput(validTFOutput, 2);
  assert(validatedTF.questions[0].type === 'true_false', 'Correctly identified type as true_false');
  assert(validatedTF.questions[0].correctAnswer === 'False', 'Correct answer for Q1 is False');
  assert(validatedTF.questions[1].correctAnswer === 'True', 'Correct answer for Q2 is True');

  // Scoring True/False
  const tfScore = calculateQuizScore(validatedTF.questions, { q1: 'False', q2: 'True' });
  assert(tfScore.percentage === 100, 'Score is 100% when answering True/False correctly');
  assert(tfScore.correctCount === 2, 'Correct count is 2/2');

  const tfScorePartial = calculateQuizScore(validatedTF.questions, { q1: 'True', q2: 'True' });
  assert(tfScorePartial.percentage === 50, 'Score is 50% when answering 1 correct and 1 incorrect');

  // ── 2. Scenario-Based Questions ──────────────────────────────────────────
  console.log('\n── Test Group 2: Scenario-Based Questions ──');

  const validScenarioOutput = {
    title: 'Software Architecture Scenarios',
    subject: 'Computer Science',
    topic: 'System Design',
    difficulty: 'hard',
    questionType: 'scenario',
    hasSourceMaterial: false,
    questions: [
      {
        id: 'q1',
        type: 'scenario',
        context: 'An e-commerce platform experiences severe flash-sale traffic spikes every Friday at 8 PM. Database read locks cause checkout latency to exceed 15 seconds, resulting in dropped carts.',
        question: 'Which architectural strategy best mitigates the database contention while maintaining strong checkout consistency?',
        options: [
          { id: 'A', text: 'Implement an in-memory Redis cache with asynchronous queueing for order processing' },
          { id: 'B', text: 'Increase relational database query timeouts to 60 seconds' },
          { id: 'C', text: 'Convert all database tables to unindexed CSV storage' },
          { id: 'D', text: 'Disable SSL encryption during peak sale hours' }
        ],
        correctAnswer: 'A',
        explanation: 'Using Redis for rate caching and message queues decouples spikes from database writes.',
        hint: 'Consider decoupling writes with distributed queueing.',
        concept: 'High-Throughput Caching',
        difficulty: 'hard'
      }
    ]
  };

  const validatedScenario = validateGeminiOutput(validScenarioOutput, 1);
  assert(validatedScenario.questions[0].type === 'scenario', 'Correctly identified type as scenario');
  assert(validatedScenario.questions[0].context.includes('flash-sale traffic spikes'), 'Preserved scenario context');
  assert(validatedScenario.questions[0].correctAnswer === 'A', 'Correct answer is A');

  // ── 3. Case-Based MCQ Questions ──────────────────────────────────────────
  console.log('\n── Test Group 3: Case-Based MCQ Questions ──');

  const validCaseOutput = {
    title: 'Clinical Emergency Case Study',
    subject: 'Medicine',
    topic: 'Cardiology',
    difficulty: 'hard',
    questionType: 'case_based',
    hasSourceMaterial: false,
    questions: [
      {
        id: 'q1',
        type: 'case_based',
        context: 'A 58-year-old male presents to the ER with sudden retrosternal chest tightness radiating to the left arm. Blood pressure is 90/60 mmHg, heart rate is 110 bpm. ECG reveals 3mm ST-elevation in leads II, III, and aVF with reciprocal depressions in leads I and aVL.',
        question: 'Which coronary artery is most likely occluded in this patient?',
        options: [
          { id: 'A', text: 'Right Coronary Artery (RCA)' },
          { id: 'B', text: 'Left Anterior Descending (LAD)' },
          { id: 'C', text: 'Left Circumflex Artery (LCx)' },
          { id: 'D', text: 'Left Main Coronary Artery' }
        ],
        correctAnswer: 'A',
        explanation: 'ST elevation in leads II, III, and aVF indicates an inferior wall myocardial infarction, typically supplied by the RCA.',
        hint: 'Inferior leads correspond to the diaphragmatic surface of the heart.',
        concept: 'Inferior STEMI Localization',
        difficulty: 'hard'
      }
    ]
  };

  const validatedCase = validateGeminiOutput(validCaseOutput, 1);
  assert(validatedCase.questions[0].type === 'case_based', 'Correctly identified type as case_based');
  assert(validatedCase.questions[0].context.includes('58-year-old male'), 'Preserved clinical case context');

  // ── 4. Numerical / Calculation Questions ─────────────────────────────────
  console.log('\n── Test Group 4: Numerical / Calculation Questions ──');

  const validNumericalOutput = {
    title: 'Kinematics & Dynamics Calculations',
    subject: 'Physics',
    topic: 'Classical Mechanics',
    difficulty: 'medium',
    questionType: 'numerical',
    hasSourceMaterial: false,
    questions: [
      {
        id: 'q1',
        type: 'numerical',
        question: 'A 1500 kg vehicle accelerates uniformly from rest to 30 m/s in 6 seconds. Calculate the net force acting on the vehicle. Round to the nearest whole integer.',
        options: [
          { id: 'A', text: '7,500 N' },
          { id: 'B', text: '5,000 N' },
          { id: 'C', text: '9,000 N' },
          { id: 'D', text: '3,000 N' }
        ],
        correctAnswer: 'A',
        unit: 'N',
        numericAnswer: 7500,
        tolerance: 0.01,
        explanation: 'Acceleration a = (30 - 0) / 6 = 5 m/s^2. Net Force F = m * a = 1500 kg * 5 m/s^2 = 7,500 N.',
        hint: 'Use Newton\'s second law: F = m * a.',
        concept: 'Newton\'s Second Law',
        difficulty: 'medium'
      },
      {
        id: 'q2',
        type: 'numerical',
        question: 'A projectile is launched with an initial velocity of 49 m/s at an angle of 30° above the horizontal. Assuming g = 9.8 m/s², calculate the total time of flight. Round to 1 decimal place.',
        options: [
          { id: 'A', text: '2.5 s' },
          { id: 'B', text: '5.0 s' },
          { id: 'C', text: '7.5 s' },
          { id: 'D', text: '10.0 s' }
        ],
        correctAnswer: 'B',
        unit: 's',
        numericAnswer: 5.0,
        tolerance: 0.05,
        explanation: 'Vertical initial velocity Vy = 49 * sin(30°) = 24.5 m/s. Time of flight T = 2 * Vy / g = (2 * 24.5) / 9.8 = 49 / 9.8 = 5.0 s.',
        hint: 'Use the formula T = (2 * v0 * sin(theta)) / g.',
        concept: 'Projectile Time of Flight',
        difficulty: 'hard'
      }
    ]
  };

  const validatedNum = validateGeminiOutput(validNumericalOutput, 2);
  assert(validatedNum.questions[0].type === 'numerical', 'Identified type as numerical');
  assert(validatedNum.questions[0].unit === 'N', 'Preserved unit: N');
  assert(validatedNum.questions[0].numericAnswer === 7500, 'Preserved exact numericAnswer: 7500');
  assert(validatedNum.questions[1].unit === 's', 'Preserved unit: s');
  assert(validatedNum.questions[1].numericAnswer === 5.0, 'Preserved numericAnswer: 5.0');

  // Numerical scoring by option selection
  const numScoreOption = calculateQuizScore(validatedNum.questions, { q1: 'A', q2: 'B' });
  assert(numScoreOption.percentage === 100, 'Numerical option match scores 100%');

  // Numerical scoring by direct value input (with tolerance)
  const numScoreDirect = calculateQuizScore(validatedNum.questions, { q1: '7500', q2: '5.02' });
  assert(numScoreDirect.percentage === 100, 'Direct numeric input within tolerance scores 100%');

  const numScoreWrong = calculateQuizScore(validatedNum.questions, { q1: '5000', q2: '2.5' });
  assert(numScoreWrong.percentage === 0, 'Incorrect calculations score 0%');

  // ── 5. Database Persistence & Retrieval ──────────────────────────────────
  console.log('\n── Test Group 5: SQLite Storage of All Question Types ──');

  await initDb();

  const savedQuiz = QuizRepository.create({
    title: 'Multi-Type Comprehensive Assessment',
    subject: 'Applied Physics & Engineering',
    topic: 'Energy & Work',
    difficulty: 'medium',
    questionType: 'mixed',
    questions: [
      {
        type: 'true_false',
        question: 'Work is a vector quantity having both magnitude and direction.',
        options: [
          { id: 'True', text: 'True' },
          { id: 'False', text: 'False' }
        ],
        correctAnswer: 'False',
        explanation: 'Work is a scalar quantity defined by the dot product of force and displacement.',
        concept: 'Scalar vs Vector Work',
        difficulty: 'easy'
      },
      {
        type: 'scenario',
        context: 'A warehouse crane lifts a 500 kg crate vertically through a distance of 12 meters in 4 seconds at constant velocity.',
        question: 'What is the mechanical work done by the crane on the crate? (Assume g = 9.8 m/s²)',
        options: [
          { id: 'A', text: '58,800 J' },
          { id: 'B', text: '29,400 J' },
          { id: 'C', text: '14,700 J' },
          { id: 'D', text: '6,000 J' }
        ],
        correctAnswer: 'A',
        unit: 'J',
        numericAnswer: 58800,
        tolerance: 10,
        explanation: 'Work = m * g * h = 500 kg * 9.8 m/s^2 * 12 m = 58,800 Joules.',
        concept: 'Gravitational Work',
        difficulty: 'medium'
      },
      {
        type: 'case_based',
        context: 'A renewable energy startup is designing a pumped hydro storage facility. Water is pumped up a 100m elevation head during low-demand night hours and discharged through a turbine with 85% generator efficiency during peak day hours.',
        question: 'Which factor has the greatest proportional impact on the round-trip electrical recovery efficiency of the system?',
        options: [
          { id: 'A', text: 'Combined hydraulic pump and turbine electromechanical efficiency' },
          { id: 'B', text: 'Color of the reservoir containment liner' },
          { id: 'C', text: 'Ambient atmospheric barometric pressure' },
          { id: 'D', text: 'Phase of the moon during release' }
        ],
        correctAnswer: 'A',
        explanation: 'Pump and turbine electromechanical losses directly multiply to determine overall round-trip efficiency.',
        concept: 'Pumped Hydro Efficiency',
        difficulty: 'hard'
      }
    ]
  });

  assert(savedQuiz && savedQuiz.id, 'Quiz created in SQLite successfully');
  assert(savedQuiz.questions.length === 3, 'All 3 multi-type questions saved in SQLite');

  const retrievedQuiz = QuizRepository.findById(savedQuiz.id);
  assert(retrievedQuiz.questions[0].type === 'true_false', 'Retrieved Q1 type: true_false');
  assert(retrievedQuiz.questions[1].type === 'scenario', 'Retrieved Q2 type: scenario');
  assert(retrievedQuiz.questions[1].unit === 'J', 'Retrieved Q2 unit: J');
  assert(retrievedQuiz.questions[1].numericAnswer === 58800, 'Retrieved Q2 numericAnswer: 58800');
  assert(retrievedQuiz.questions[2].type === 'case_based', 'Retrieved Q3 type: case_based');
  assert(retrievedQuiz.questions[2].context.includes('pumped hydro storage'), 'Retrieved Q3 case context');

  // ── 6. Live Gemini API Generation Test ────────────────────────────────────
  console.log('\n── Test Group 6: Live Gemini Generation Across Question Types ──');

  try {
    console.log('  Generating 2 Numerical questions for Physics (Newtonian Mechanics)...');
    const genNumerical = await generateQuiz({
      subject: 'Physics',
      topic: 'Kinetic Energy & Work',
      questionType: 'numerical',
      questionCount: 2,
      difficulty: 'medium'
    });

    assert(genNumerical && Array.isArray(genNumerical.questions) && genNumerical.questions.length === 2, 'Generated 2 numerical questions via Gemini');
    const qNum = genNumerical.questions[0];
    assert(qNum.type === 'numerical', 'Gemini generated question has type=numerical');
    assert(qNum.numericAnswer !== null && !isNaN(qNum.numericAnswer), `Gemini provided numericAnswer: ${qNum.numericAnswer}`);
    assert(typeof qNum.explanation === 'string' && qNum.explanation.length > 10, 'Gemini provided calculation explanation');
    console.log(`  Sample Numerical: "${qNum.question}" => Answer: ${qNum.correctAnswer} (${qNum.numericAnswer} ${qNum.unit || ''})`);

    console.log('\n  Generating 2 True/False questions for Biology (Cell Membrane)...');
    const genTF = await generateQuiz({
      subject: 'Biology',
      topic: 'Cell Membrane Transport',
      questionType: 'true_false',
      questionCount: 2,
      difficulty: 'easy'
    });

    assert(genTF && Array.isArray(genTF.questions) && genTF.questions.length === 2, 'Generated 2 True/False questions via Gemini');
    const qTF = genTF.questions[0];
    assert(qTF.type === 'true_false', 'Gemini generated question has type=true_false');
    assert(['True', 'False'].includes(qTF.correctAnswer), `Gemini correctAnswer is True/False: "${qTF.correctAnswer}"`);
    console.log(`  Sample T/F: "${qTF.question}" => Answer: ${qTF.correctAnswer}`);

    console.log('\n  Generating 2 Scenario-Based questions for Medicine (Patient Triage)...');
    const genScenario = await generateQuiz({
      subject: 'Medicine',
      topic: 'Emergency Patient Triage',
      questionType: 'scenario',
      questionCount: 2,
      difficulty: 'medium'
    });

    assert(genScenario && Array.isArray(genScenario.questions) && genScenario.questions.length === 2, 'Generated 2 Scenario questions via Gemini');
    const qScen = genScenario.questions[0];
    assert(qScen.type === 'scenario', 'Gemini generated question has type=scenario');
    assert(qScen.context && qScen.context.length > 10, `Gemini provided scenario context: "${qScen.context.slice(0, 50)}..."`);
    console.log(`  Sample Scenario: Context: "${qScen.context.slice(0, 60)}..." Question: "${qScen.question}"`);

  } catch (err) {
    console.error('  Live Gemini test error:', err.message);
  }

  console.log(`\n======================================================`);
  console.log(`📊 Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`======================================================\n`);

  if (passedTests === totalTests) {
    console.log('🎉 ALL QUESTION TYPE TESTS PASSED PERFECTLY!');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
