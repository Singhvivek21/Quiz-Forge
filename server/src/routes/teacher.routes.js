const { Router } = require('express');
const { requireTeacher } = require('../middleware/auth');
const {
  getTeacherDashboard,
  getTeacherQuizzes,
  getTeacherQuizAnalytics,
  updateTeacherQuiz,
  shareTeacherQuiz,
  deleteTeacherQuiz
} = require('../controllers/teacher.controller');

const router = Router();

// Enforce Teacher Authorization on all /api/v1/teacher routes
router.use(requireTeacher);

router.get('/dashboard', getTeacherDashboard);
router.get('/quizzes', getTeacherQuizzes);
router.get('/quizzes/:id/analytics', getTeacherQuizAnalytics);
router.put('/quizzes/:id', updateTeacherQuiz);
router.post('/quizzes/:id/share', shareTeacherQuiz);
router.delete('/quizzes/:id', deleteTeacherQuiz);

module.exports = router;
