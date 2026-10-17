// scoring.test.js — standalone test suite for calculateQuizScore
const { calculateQuizScore, formatDuration } = require('./scoring-node.js');

function createMockQuestions(count) {
  const questions = [];
  for (let i = 1; i <= count; i++) {
    questions.push({
      id: `q${i}`,
      question: `Question ${i}?`,
      options: [
        { id: 'A', text: `Option A for Q${i}` },
        { id: 'B', text: `Option B for Q${i}` },
        { id: 'C', text: `Option C for Q${i}` },
        { id: 'D', text: `Option D for Q${i}` },
      ],
      correctAnswer: 'A',
      explanation: `Explanation for Q${i}`,
      hint: `Hint for Q${i}`,
      concept: `Concept ${((i - 1) % 3) + 1}`,
      difficulty: 'medium',
    });
  }
  return questions;
}

function runTests() {
  console.log('=== Running QuizForge Scoring Test Suite ===\n');
  let passed = 0;
  let total = 0;

  function assert(name, condition, details = '') {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${name} — ${details}`);
    }
  }

  // ── TEST 1: 100% Score (10/10 correct) ──────────────────────────────────
  const q10 = createMockQuestions(10);
  const answers100 = {
    q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A',
    q6: 'A', q7: 'A', q8: 'A', q9: 'A', q10: 'A',
  };
  const res100 = calculateQuizScore(q10, answers100, 120);
  assert('100% Score - percentage', res100.percentage === 100, `Got ${res100.percentage}%`);
  assert('100% Score - correct count', res100.correctCount === 10, `Got ${res100.correctCount}`);
  assert('100% Score - incorrect count', res100.incorrectCount === 0, `Got ${res100.incorrectCount}`);
  assert('100% Score - unanswered count', res100.unansweredCount === 0, `Got ${res100.unansweredCount}`);
  assert('100% Score - score fraction', res100.scoreFraction === '10/10', `Got ${res100.scoreFraction}`);
  assert('100% Score - weak concepts empty', res100.weakConcepts.length === 0, `Got ${res100.weakConcepts.length}`);

  // ── TEST 2: 0% Score (all incorrect) ────────────────────────────────────
  const answers0 = {
    q1: 'B', q2: 'B', q3: 'B', q4: 'B', q5: 'B',
    q6: 'B', q7: 'B', q8: 'B', q9: 'B', q10: 'B',
  };
  const res0 = calculateQuizScore(q10, answers0, 85);
  assert('0% Score (All Wrong) - percentage', res0.percentage === 0, `Got ${res0.percentage}%`);
  assert('0% Score (All Wrong) - correct count', res0.correctCount === 0, `Got ${res0.correctCount}`);
  assert('0% Score (All Wrong) - incorrect count', res0.incorrectCount === 10, `Got ${res0.incorrectCount}`);
  assert('0% Score (All Wrong) - unanswered count', res0.unansweredCount === 0, `Got ${res0.unansweredCount}`);
  assert('0% Score (All Wrong) - score fraction', res0.scoreFraction === '0/10', `Got ${res0.scoreFraction}`);

  // ── TEST 3: 0% Score (All Unanswered) ──────────────────────────────────
  const resUnansweredAll = calculateQuizScore(q10, {}, 0);
  assert('0% Score (All Unanswered) - percentage', resUnansweredAll.percentage === 0, `Got ${resUnansweredAll.percentage}%`);
  assert('0% Score (All Unanswered) - unanswered count', resUnansweredAll.unansweredCount === 10, `Got ${resUnansweredAll.unansweredCount}`);
  assert('0% Score (All Unanswered) - correct count', resUnansweredAll.correctCount === 0, `Got ${resUnansweredAll.correctCount}`);
  assert('0% Score (All Unanswered) - incorrect count', resUnansweredAll.incorrectCount === 0, `Got ${resUnansweredAll.incorrectCount}`);

  // ── TEST 4: Partial Score (7/10 = 70%) ──────────────────────────────────
  // 7 correct ('A'), 2 incorrect ('B'), 1 unanswered (omitted)
  const answers70 = {
    q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A', q6: 'A', q7: 'A',
    q8: 'B', q9: 'B',
    // q10 omitted (unanswered)
  };
  const res70 = calculateQuizScore(q10, answers70, 165);
  assert('Partial Score (7/10) - percentage', res70.percentage === 70, `Got ${res70.percentage}%`);
  assert('Partial Score (7/10) - correct count', res70.correctCount === 7, `Got ${res70.correctCount}`);
  assert('Partial Score (7/10) - incorrect count', res70.incorrectCount === 2, `Got ${res70.incorrectCount}`);
  assert('Partial Score (7/10) - unanswered count', res70.unansweredCount === 1, `Got ${res70.unansweredCount}`);
  assert('Partial Score (7/10) - score fraction', res70.scoreFraction === '7/10', `Got ${res70.scoreFraction}`);
  assert('Partial Score (7/10) - total questions', res70.totalQuestions === 10, `Got ${res70.totalQuestions}`);
  assert('Partial Score (7/10) - formatted time', res70.formattedTime === '2m 45s', `Got ${res70.formattedTime}`);

  // ── TEST 5: Timer auto-submission scenario ──────────────────────────────
  // User was halfway through a 5-question quiz when timer expired
  const q5 = createMockQuestions(5);
  const timerAnswers = {
    q1: 'A', // correct
    q2: 'C', // incorrect
    // q3, q4, q5 unanswered
  };
  const resTimer = calculateQuizScore(q5, timerAnswers, 300);
  assert('Timer Submission - correct count', resTimer.correctCount === 1, `Got ${resTimer.correctCount}`);
  assert('Timer Submission - incorrect count', resTimer.incorrectCount === 1, `Got ${resTimer.incorrectCount}`);
  assert('Timer Submission - unanswered count', resTimer.unansweredCount === 3, `Got ${resTimer.unansweredCount}`);
  assert('Timer Submission - percentage', resTimer.percentage === 20, `Got ${resTimer.percentage}% (1/5)`);
  assert('Timer Submission - score fraction', resTimer.scoreFraction === '1/5', `Got ${resTimer.scoreFraction}`);
  assert('Timer Submission - formatted time', resTimer.formattedTime === '5m', `Got ${resTimer.formattedTime}`);

  // ── TEST 6: Single Question Quiz (1 question) ───────────────────────────
  const q1 = createMockQuestions(1);
  const resSingleCorrect = calculateQuizScore(q1, { q1: 'A' }, 10);
  assert('Single Question (Correct) - percentage', resSingleCorrect.percentage === 100, `Got ${resSingleCorrect.percentage}%`);
  assert('Single Question (Correct) - fraction', resSingleCorrect.scoreFraction === '1/1', `Got ${resSingleCorrect.scoreFraction}`);

  const resSingleWrong = calculateQuizScore(q1, { q1: 'D' }, 10);
  assert('Single Question (Wrong) - percentage', resSingleWrong.percentage === 0, `Got ${resSingleWrong.percentage}%`);
  assert('Single Question (Wrong) - fraction', resSingleWrong.scoreFraction === '0/1', `Got ${resSingleWrong.scoreFraction}`);

  // ── TEST 7: Large Quiz (25 questions) ───────────────────────────────────
  const q25 = createMockQuestions(25);
  const answers25 = {};
  // Answer 20 correct, 3 wrong, 2 unanswered
  for (let i = 1; i <= 20; i++) answers25[`q${i}`] = 'A';
  for (let i = 21; i <= 23; i++) answers25[`q${i}`] = 'C';
  // q24, q25 unanswered
  const res25 = calculateQuizScore(q25, answers25, 450);
  assert('25-Question Quiz - correct count', res25.correctCount === 20, `Got ${res25.correctCount}`);
  assert('25-Question Quiz - incorrect count', res25.incorrectCount === 3, `Got ${res25.incorrectCount}`);
  assert('25-Question Quiz - unanswered count', res25.unansweredCount === 2, `Got ${res25.unansweredCount}`);
  assert('25-Question Quiz - percentage', res25.percentage === 80, `Got ${res25.percentage}% (20/25)`);
  assert('25-Question Quiz - fraction', res25.scoreFraction === '20/25', `Got ${res25.scoreFraction}`);

  // ── TEST 8: Question Details verification ──────────────────────────────
  const firstDetail = res70.questionDetails[0];
  assert('Question Detail - question text', firstDetail.question === 'Question 1?', `Got ${firstDetail.question}`);
  assert('Question Detail - isCorrect', firstDetail.isCorrect === true, `Got ${firstDetail.isCorrect}`);
  assert('Question Detail - selectedAnswer', firstDetail.selectedAnswer === 'A', `Got ${firstDetail.selectedAnswer}`);
  assert('Question Detail - correctAnswer', firstDetail.correctAnswer === 'A', `Got ${firstDetail.correctAnswer}`);
  assert('Question Detail - explanation', Boolean(firstDetail.explanation), `Missing explanation`);
  assert('Question Detail - concept', Boolean(firstDetail.concept), `Missing concept`);

  const eighthDetail = res70.questionDetails[7]; // q8 answered B, correct is A
  assert('Question Detail Wrong - isIncorrect', eighthDetail.isIncorrect === true, `Got ${eighthDetail.isIncorrect}`);
  assert('Question Detail Wrong - isCorrect', eighthDetail.isCorrect === false, `Got ${eighthDetail.isCorrect}`);

  const tenthDetail = res70.questionDetails[9]; // q10 unanswered
  assert('Question Detail Unanswered - isUnanswered', tenthDetail.isUnanswered === true, `Got ${tenthDetail.isUnanswered}`);

  console.log(`\n=============================================`);
  console.log(`Results: ${passed} / ${total} tests passed.`);
  console.log(`=============================================\n`);
}

runTests();
