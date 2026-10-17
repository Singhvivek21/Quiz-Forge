const { Router } = require('express');
const {
  recordAttempt,
  getAllAttempts,
  getAttemptById
} = require('../controllers/quiz.controller');

const router = Router();

// /api/v1/attempts
router.get('/', getAllAttempts);
router.get('/:id', getAttemptById);
router.post('/', recordAttempt);

module.exports = router;
