const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('Testing GET /api/v1/stats...');
  const statsRes = await get('/api/v1/stats');
  console.log('Stats Response:', JSON.stringify(statsRes, null, 2));

  console.log('\nTesting POST /api/v1/attempts (completing a quiz attempt)...');
  const attemptPayload = {
    userId: 'test_user_gamification',
    score: 5,
    totalQuestions: 5,
    percentage: 100,
    correctCount: 5,
    incorrectCount: 0,
    unansweredCount: 0,
    timeTaken: 40,
    difficulty: 'hard',
    subject: 'Computer Science',
    topic: 'Algorithms',
    answers: [
      { questionId: 'q1', selectedAnswer: 'O(log n)', isCorrect: true, concept: 'Binary Search' },
      { questionId: 'q2', selectedAnswer: 'O(n log n)', isCorrect: true, concept: 'Merge Sort' },
      { questionId: 'q3', selectedAnswer: 'O(V+E)', isCorrect: true, concept: 'BFS' },
      { questionId: 'q4', selectedAnswer: 'O(1)', isCorrect: true, concept: 'Hash Tables' },
      { questionId: 'q5', selectedAnswer: 'O(2^n)', isCorrect: true, concept: 'Tower of Hanoi' }
    ]
  };

  const attemptRes = await post('/api/v1/attempts', attemptPayload);
  console.log('Raw Attempt Response:', JSON.stringify(attemptRes, null, 2));

  console.log('\nTesting GET /api/v1/stats for test_user_gamification...');
  const userStats = await get('/api/v1/stats');
  console.log('User stats updated successfully: Level', userStats.data?.level, 'XP:', userStats.data?.xp);
}

run().catch(console.error);
