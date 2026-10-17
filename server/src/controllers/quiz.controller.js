const QuizService = require('../services/quiz.service');

// ── Quizzes ────────────────────────────────────────────────────────────────

const getAllQuizzes = async (req, res, next) => {
  try {
    const { search, subject, difficulty } = req.query;
    const safeSearch = search && typeof search === 'string' ? search.slice(0, 100) : undefined;
    const safeSubject = subject && typeof subject === 'string' ? subject.slice(0, 50) : undefined;
    const safeDifficulty = difficulty && typeof difficulty === 'string' ? difficulty.slice(0, 20) : undefined;

    const quizzes = await QuizService.listQuizzes({ search: safeSearch, subject: safeSubject, difficulty: safeDifficulty });
    res.json({ success: true, data: quizzes });
  } catch (err) {
    next(err);
  }
};

const getQuizById = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || id.length > 64) {
      return res.status(400).json({ success: false, error: 'Invalid quiz ID format' });
    }
    const quiz = await QuizService.getQuizById(id);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    res.json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
};

const createQuiz = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.title && (!body.questions || body.questions.length === 0)) {
      return res.status(400).json({ success: false, error: 'Quiz must contain at least a title or questions' });
    }
    const quiz = await QuizService.saveQuiz(body);
    res.status(201).json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
};

const deleteQuiz = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || id.length > 64) {
      return res.status(400).json({ success: false, error: 'Invalid quiz ID format' });
    }
    const result = await QuizService.deleteQuiz(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ── Attempts ───────────────────────────────────────────────────────────────

const recordAttempt = async (req, res, next) => {
  try {
    const body = req.body || {};

    // quizId is required — an attempt must belong to a specific quiz
    if (!body.quizId || typeof body.quizId !== 'string' || !body.quizId.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Attempt must include a valid quizId.',
        code: 'MISSING_QUIZ_ID',
      });
    }

    const safePayload = {
      ...body,
      quizId: body.quizId.trim().slice(0, 64),
      score: Math.max(0, parseInt(body.score, 10) || 0),
      totalQuestions: Math.min(100, Math.max(1, parseInt(body.totalQuestions || 1, 10) || 1)),
      percentage: Math.min(100, Math.max(0, parseFloat(body.percentage) || 0)),
      timeTaken: Math.min(86400, Math.max(0, parseInt(body.timeTaken, 10) || 0)),
      answers: Array.isArray(body.answers) ? body.answers.slice(0, 100) : [],
    };
    const attempt = await QuizService.recordAttempt(safePayload);
    res.status(201).json({ success: true, data: attempt });
  } catch (err) {
    next(err);
  }
};

const getAllAttempts = async (req, res, next) => {
  try {
    const { quizId, limit } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const safeQuizId = quizId && typeof quizId === 'string' ? quizId.slice(0, 64) : undefined;
    const attempts = await QuizService.listAttempts({ quizId: safeQuizId, limit: safeLimit });
    res.json({ success: true, data: attempts });
  } catch (err) {
    next(err);
  }
};

const getAttemptById = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || id.length > 64) {
      return res.status(400).json({ success: false, error: 'Invalid attempt ID format' });
    }
    const attempt = await QuizService.getAttemptReview(id);
    res.json({ success: true, data: attempt });
  } catch (err) {
    next(err);
  }
};

// ── Progress & Weak Concepts ───────────────────────────────────────────────

const getProgress = async (req, res, next) => {
  try {
    const progress = await QuizService.getProgress();
    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

const getWeakConcepts = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));
    const weakConcepts = await QuizService.getWeakConcepts('default_user', limit);
    res.json({ success: true, data: weakConcepts });
  } catch (err) {
    next(err);
  }
};

// ── Dashboard Stats ────────────────────────────────────────────────────────

const getStats = async (req, res, next) => {
  try {
    const stats = await QuizService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  deleteQuiz,
  recordAttempt,
  getAllAttempts,
  getAttemptById,
  getProgress,
  getWeakConcepts,
  getStats
};
