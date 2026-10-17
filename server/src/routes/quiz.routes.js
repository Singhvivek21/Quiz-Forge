const { Router } = require('express');
const {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  deleteQuiz,
  getStats
} = require('../controllers/quiz.controller');

const router = Router();

// /api/v1/quizzes
router.get('/stats', getStats);
router.get('/', getAllQuizzes);
router.get('/:id', getQuizById);
router.post('/', createQuiz);
router.post('/save', createQuiz);
router.delete('/:id', deleteQuiz);

module.exports = router;
