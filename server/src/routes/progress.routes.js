const { Router } = require('express');
const {
  getProgress,
  getWeakConcepts
} = require('../controllers/quiz.controller');

const router = Router();

// /api/v1/progress
router.get('/', getProgress);
router.get('/weak', getWeakConcepts);

module.exports = router;
