/**
 * test-teacher-mode.js
 *
 * Automated verification test suite for AI QuizForge Teacher Mode:
 *  1. Teacher vs Student Permissions & Authorization (403 Forbidden for students)
 *  2. Quiz Editing & Customization
 *  3. Safe Quiz-Sharing Mechanism (code generation & public student access)
 *  4. Student Attempt Submission & Privacy-Safe Auditing (no email exposure)
 *  5. Class Analytics, Question Performance & Weak Topics Aggregations
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const assert = require('assert');
const http = require('http');
const { initDb } = require('./src/db');
const QuizRepository = require('./src/repositories/quiz.repository');
const TeacherRepository = require('./src/repositories/teacher.repository');
const SharingService = require('./src/services/sharing.service');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

console.log('🧪 Running Teacher Mode & Safe Sharing Test Suite...\n');

const app = require('./app');
function ensureServer() {
  return new Promise((resolve) => {
    const srv = app.listen(3001, () => resolve(srv));
    srv.on('error', () => resolve(null));
  });
}

async function runAllTests() {
  await initDb();
  const srv = await ensureServer();

  // ── 1. AUTHORIZATION & ROLE ISOLATION TESTS ─────────────────────────────
  console.log('--- 1. Authorization & Role-Based Access Control ---');

  await asyncTest('Student role accessing /api/v1/teacher/dashboard is BLOCKED with 403 Forbidden', async () => {
    const res = await request('GET', '/api/v1/teacher/dashboard', null, {
      'x-user-role': 'student'
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'AUTH_TEACHER_REQUIRED');
  });

  await asyncTest('Default unauthorized request to /api/v1/teacher/quizzes is BLOCKED with 403 Forbidden', async () => {
    const res = await request('GET', '/api/v1/teacher/quizzes');
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await asyncTest('Teacher role accessing /api/v1/teacher/dashboard is GRANTED with 200 OK', async () => {
    const res = await request('GET', '/api/v1/teacher/dashboard', null, {
      'x-user-role': 'teacher',
      'x-user-id': 'default_teacher'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data !== undefined);
  });

  // ── 2. QUIZ EDITING & PERSISTENCE TESTS ──────────────────────────────────
  console.log('\n--- 2. Teacher Quiz Creation & In-Place Editing ---');

  let testQuizId = null;

  await asyncTest('Teacher creates a customized quiz via POST /api/v1/quizzes', async () => {
    const createPayload = {
      userId: 'default_teacher',
      title: 'Cellular Respiration Final Exam',
      subject: 'Biology',
      topic: 'Cellular Respiration',
      difficulty: 'hard',
      createdByRole: 'teacher',
      questions: [
        {
          type: 'mcq',
          question: 'What is the net gain of ATP molecules produced in glycolysis?',
          options: [{ id: 'A', text: '2 ATP' }, { id: 'B', text: '4 ATP' }, { id: 'C', text: '32 ATP' }, { id: 'D', text: '0 ATP' }],
          correctAnswer: 'A',
          explanation: 'Glycolysis consumes 2 ATP and produces 4 ATP, yielding a net gain of 2 ATP.',
          concept: 'Glycolysis ATP Yield',
          difficulty: 'hard'
        },
        {
          type: 'numerical',
          question: 'If a sample starts with 100g and has a half life of 5 days, how many grams remain after 15 days?',
          options: [{ id: 'A', text: '12.5 g' }, { id: 'B', text: '25 g' }, { id: 'C', text: '50 g' }, { id: 'D', text: '6.25 g' }],
          correctAnswer: 'A',
          unit: 'g',
          numericAnswer: 12.5,
          tolerance: 0.01,
          explanation: 'After 3 half-lives (15 days / 5), 100 * (1/2)^3 = 12.5g.',
          concept: 'Radioactive Decay',
          difficulty: 'hard'
        }
      ]
    };

    const res = await request('POST', '/api/v1/quizzes', createPayload, {
      'x-user-role': 'teacher'
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.title, 'Cellular Respiration Final Exam');
    testQuizId = res.body.data.id;
  });

  await asyncTest('Teacher edits quiz metadata and questions via PUT /api/v1/teacher/quizzes/:id', async () => {
    const updatePayload = {
      title: 'Cellular Respiration & Bioenergetics (Revised)',
      difficulty: 'medium',
      timeLimit: 600,
      questions: [
        {
          type: 'mcq',
          question: 'What is the net ATP gain in glycolysis per glucose molecule?',
          options: [{ id: 'A', text: '2 ATP' }, { id: 'B', text: '4 ATP' }, { id: 'C', text: '36 ATP' }, { id: 'D', text: '1 ATP' }],
          correctAnswer: 'A',
          explanation: 'Net gain is 2 ATP.',
          concept: 'Glycolysis ATP Yield',
          difficulty: 'medium'
        }
      ]
    };

    const res = await request('PUT', `/api/v1/teacher/quizzes/${testQuizId}`, updatePayload, {
      'x-user-role': 'teacher'
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.title, 'Cellular Respiration & Bioenergetics (Revised)');
    assert.strictEqual(res.body.data.timeLimit, 600);
    assert.strictEqual(res.body.data.questions.length, 1);
  });

  // ── 3. SAFE QUIZ SHARING MECHANISM TESTS ─────────────────────────────────
  console.log('\n--- 3. Safe Quiz Sharing Mechanism ---');

  let generatedShareCode = null;

  test('SharingService generates valid, collision-resistant share codes', () => {
    const code = SharingService.generateShareCode('Biology');
    assert.ok(code.startsWith('QF-'));
    assert.strictEqual(SharingService.isValidCode(code), true);
  });

  await asyncTest('Teacher publishes and generates share code via POST /api/v1/teacher/quizzes/:id/share', async () => {
    const res = await request('POST', `/api/v1/teacher/quizzes/${testQuizId}/share`, { isShared: true }, {
      'x-user-role': 'teacher'
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.isShared, true);
    assert.ok(res.body.data.shareCode);
    assert.ok(res.body.data.shareCode.startsWith('QF-'));
    generatedShareCode = res.body.data.shareCode;
  });

  await asyncTest('Student accesses shared quiz via public GET /api/v1/shared/:shareCode', async () => {
    const res = await request('GET', `/api/v1/shared/${generatedShareCode}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.title, 'Cellular Respiration & Bioenergetics (Revised)');
    assert.strictEqual(res.body.data.questions.length, 1);
  });

  // ── 4. STUDENT ATTEMPTS & PRIVACY-SAFE AUDITING ──────────────────────────
  console.log('\n--- 4. Student Attempt Submission & Privacy Safeguards ---');

  await asyncTest('Student submits attempt to shared quiz via POST /api/v1/shared/:shareCode/attempt', async () => {
    const attemptPayload = {
      studentName: 'Alex Mercer',
      score: 1,
      totalQuestions: 1,
      percentage: 100,
      correctCount: 1,
      incorrectCount: 0,
      unansweredCount: 0,
      timeTaken: 25,
      answers: [
        {
          selectedAnswer: 'A',
          isCorrect: true,
          timeTaken: 25
        }
      ]
    };

    const res = await request('POST', `/api/v1/shared/${generatedShareCode}/attempt`, attemptPayload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
  });

  await asyncTest('Teacher views analytics and student attempts WITHOUT exposing private emails', async () => {
    const res = await request('GET', `/api/v1/teacher/quizzes/${testQuizId}/analytics`, null, {
      'x-user-role': 'teacher'
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.totalAttempts, 1);
    assert.strictEqual(res.body.data.averageScore, 100);

    // Verify privacy: studentAttempts array contains studentName, but NO emails or sensitive passwords
    const student = res.body.data.studentAttempts[0];
    assert.ok(student);
    assert.strictEqual(student.studentName, 'Alex Mercer');
    assert.strictEqual(student.email, undefined);
    assert.strictEqual(student.password, undefined);
  });

  // ── 5. AGGREGATED TEACHER DASHBOARD METRICS ──────────────────────────────
  console.log('\n--- 5. Aggregated Class Analytics & Question Performance ---');

  await asyncTest('Teacher Dashboard aggregates total attempts, pass rate, and difficulty performance', async () => {
    const res = await request('GET', '/api/v1/teacher/dashboard', null, {
      'x-user-role': 'teacher'
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.totalQuizzes >= 1);
    assert.ok(res.body.data.totalAttempts >= 1);
    assert.ok(res.body.data.averageScore >= 0);
    assert.ok(res.body.data.difficultyPerformance !== undefined);
  });

  // Clean up test quiz
  QuizRepository.delete(testQuizId);
  if (srv) srv.close();

  console.log(`\n========================================`);
  console.log(`Teacher Mode Test Summary: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`========================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
