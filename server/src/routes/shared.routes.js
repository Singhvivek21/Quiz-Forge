const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const {
  getSharedQuiz,
  submitSharedAttempt
} = require('../controllers/shared.controller');

const router = Router();

const sharedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // max 60 attempts/lookups per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests to shared quizzes. Please wait a moment.',
    code: 'SHARED_RATE_LIMIT'
  }
});

// Public / Student access to shared quizzes via share code
router.get('/:shareCode', sharedLimiter, getSharedQuiz);
router.post('/:shareCode/attempt', sharedLimiter, submitSharedAttempt);

module.exports = router;
