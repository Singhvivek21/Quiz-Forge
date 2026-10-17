const { initDb } = require('./src/db');
const QuizService = require('./src/services/quiz.service');

async function testDatabase() {
  console.log('=== Testing Persistent Storage (Step 10) ===\n');

  // 1. Initialize DB
  console.log('1. Initializing SQLite Database...');
  await initDb();
  console.log('✓ Database initialized successfully.\n');

  // 2. Save a quiz with questions
  console.log('2. Testing Quiz & Question Insertion...');
  const sampleQuizData = {
    title: 'Photosynthesis Mastery Quiz',
    subject: 'Biology',
    topic: 'Photosynthesis',
    difficulty: 'medium',
    language: 'English',
    timeLimit: 10,
    enableHints: true,
    enableExplanations: true,
    questions: [
      {
        question: 'Which enzyme catalyzes the initial carbon fixation step in the Calvin cycle?',
        options: ['RuBisCO', 'ATP Synthase', 'DNA Polymerase', 'Amylase'],
        correctAnswer: 'A',
        explanation: 'RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase) catalyzes CO2 fixation.',
        hint: 'It is the most abundant enzyme on Earth.',
        concept: 'Carbon Fixation & RuBisCO',
        difficulty: 'medium'
      },
      {
        question: 'Where do the light-dependent reactions take place within chloroplasts?',
        options: ['Thylakoid membrane', 'Stroma', 'Outer membrane', 'Cristae'],
        correctAnswer: 'A',
        explanation: 'The light reactions take place across the thylakoid membranes.',
        hint: 'Think about where chlorophyll pigments are embedded.',
        concept: 'Chloroplast Anatomy & Light Reactions',
        difficulty: 'easy'
      }
    ]
  };

  const savedQuiz = await QuizService.saveQuiz(sampleQuizData, 'default_user');
  console.log(`✓ Quiz saved with ID: ${savedQuiz.id}`);
  console.log(`  Title: ${savedQuiz.title}`);
  console.log(`  Questions count: ${savedQuiz.questions.length}`);
  console.log(`  Sample Question 1: "${savedQuiz.questions[0].question}"`);
  console.log(`  Sample Options: ${JSON.stringify(savedQuiz.questions[0].options)}\n`);

  // 3. Test list quizzes
  console.log('3. Testing Quiz Retrieval & Listing...');
  const allQuizzes = await QuizService.listQuizzes();
  console.log(`✓ Total quizzes found: ${allQuizzes.length}`);
  const fetchedQuiz = await QuizService.getQuizById(savedQuiz.id);
  if (!fetchedQuiz || fetchedQuiz.questions.length !== 2) {
    throw new Error('Failed to retrieve quiz by ID with questions');
  }
  console.log(`✓ Retrieved single quiz: ${fetchedQuiz.title} with ${fetchedQuiz.questions.length} questions.\n`);

  // 4. Record an Attempt
  console.log('4. Testing Attempt & Answers Recording...');
  const attemptPayload = {
    quizId: savedQuiz.id,
    score: 1,
    totalQuestions: 2,
    percentage: 50.0,
    correctCount: 1,
    incorrectCount: 1,
    unansweredCount: 0,
    timeTaken: 45, // seconds
    subject: savedQuiz.subject,
    topic: savedQuiz.topic,
    answers: [
      {
        questionId: savedQuiz.questions[0].id,
        selectedAnswer: 'B', // incorrect
        isCorrect: false,
        concept: savedQuiz.questions[0].concept,
        timeTaken: 25
      },
      {
        questionId: savedQuiz.questions[1].id,
        selectedAnswer: 'A', // correct
        isCorrect: true,
        concept: savedQuiz.questions[1].concept,
        timeTaken: 20
      }
    ]
  };

  const savedAttempt = await QuizService.recordAttempt(attemptPayload, 'default_user');
  console.log(`✓ Attempt recorded with ID: ${savedAttempt.id}`);
  console.log(`  Score: ${savedAttempt.score}/${savedAttempt.totalQuestions} (${savedAttempt.percentage}%)`);
  console.log(`  Answers count: ${savedAttempt.answers.length}\n`);

  // 5. Test Attempt Review
  console.log('5. Testing Attempt Review Breakdown...');
  const attemptReview = await QuizService.getAttemptReview(savedAttempt.id);
  console.log(`✓ Attempt Review Title: ${attemptReview.quizTitle}`);
  attemptReview.answers.forEach((ans, i) => {
    console.log(`  [q${i+1}] Selected: ${ans.selectedAnswer}, Correct: ${ans.correctAnswer}, isCorrect: ${ans.isCorrect}, Concept: ${ans.concept}`);
  });
  console.log();

  // 6. Test Progress & Weak Concepts
  console.log('6. Testing Progress & Weak Concepts Tracking...');
  const progressList = await QuizService.getProgress('default_user');
  console.log(`✓ Total concepts tracked: ${progressList.length}`);
  progressList.forEach((p) => {
    console.log(`  • Concept: ${p.concept} — Accuracy: ${p.accuracy}% (${p.correctCount}/${p.totalQuestions} correct)`);
  });

  const weakConcepts = await QuizService.getWeakConcepts('default_user');
  console.log(`✓ Weak concepts detected: ${weakConcepts.map(w => `${w.concept} (${w.accuracy}%)`).join(', ')}\n`);

  // 7. Test Dashboard Stats
  console.log('7. Testing Aggregated Dashboard Stats...');
  const stats = await QuizService.getStats('default_user');
  console.log(`✓ Stats: Quizzes Completed = ${stats.quizzesCompleted}, Avg Score = ${stats.averageScore}%, Best Score = ${stats.bestScore}%, Total Qs = ${stats.questionsAnswered}, Streak = ${stats.currentStreak} days\n`);

  console.log('🎉 ALL DATABASE PERSISTENCE TESTS PASSED SUCCESSFULLY!');
}

testDatabase().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
