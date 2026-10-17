const { Router } = require('express');
const quizRoutes     = require('./quiz.routes');
const attemptRoutes  = require('./attempt.routes');
const progressRoutes = require('./progress.routes');
const geminiRoutes   = require('./gemini.routes');
const teacherRoutes  = require('./teacher.routes');
const sharedRoutes   = require('./shared.routes');
const { getStats }   = require('../controllers/quiz.controller');

const router = Router();

router.use('/quizzes',  quizRoutes);
router.use('/attempts', attemptRoutes);
router.use('/progress', progressRoutes);
router.use('/gemini',   geminiRoutes);
router.use('/teacher',  teacherRoutes);
router.use('/shared',   sharedRoutes);
router.get('/stats',    getStats);

module.exports = router;
