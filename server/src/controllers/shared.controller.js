/**
 * shared.controller.js
 *
 * Public / Student Interface for Shared Quizzes.
 * Allows students to access and submit attempts for quizzes shared by teachers.
 */

const QuizRepository = require('../repositories/quiz.repository');
const QuizService = require('../services/quiz.service');

const getSharedQuiz = async (req, res, next) => {
  try {
    const rawCode = String(req.params.shareCode || '').trim();
    if (!rawCode || rawCode.length > 40 || !/^[A-Za-z0-9-]+$/.test(rawCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid share code format.',
        code: 'INVALID_SHARE_CODE'
      });
    }

    const quiz = QuizRepository.findByShareCode(rawCode);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Shared quiz not found or sharing has been disabled.',
        code: 'SHARED_QUIZ_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        id: quiz.id,
        title: quiz.title,
        subject: quiz.subject,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        questionCount: quiz.questions ? quiz.questions.length : 0,
        timeLimit: quiz.timeLimit,
        enableHints: quiz.enableHints,
        enableExplanations: quiz.enableExplanations,
        shareCode: quiz.shareCode,
        questions: quiz.questions
      }
    });
  } catch (err) {
    next(err);
  }
};

const submitSharedAttempt = async (req, res, next) => {
  try {
    const rawCode = String(req.params.shareCode || '').trim();
    if (!rawCode || rawCode.length > 40 || !/^[A-Za-z0-9-]+$/.test(rawCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid share code format.',
        code: 'INVALID_SHARE_CODE'
      });
    }

    const quiz = QuizRepository.findByShareCode(rawCode);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Shared quiz not found or sharing has been disabled.',
        code: 'SHARED_QUIZ_NOT_FOUND'
      });
    }

    const { studentName, score, totalQuestions, percentage, correctCount, incorrectCount, unansweredCount, timeTaken, answers } = req.body || {};

    // Sanitize student display name (strip HTML tags, cap to 50 chars)
    const cleanStudentName = studentName && typeof studentName === 'string'
      ? studentName.replace(/<[^>]*>/g, '').trim().slice(0, 50)
      : 'Anonymous Student';

    const safeScore = Math.max(0, parseInt(score !== undefined ? score : (correctCount || 0), 10) || 0);
    const safeTotal = Math.min(100, Math.max(1, parseInt(totalQuestions || (answers ? answers.length : 1), 10) || 1));
    const safePercentage = Math.min(100, Math.max(0, parseFloat(percentage !== undefined ? percentage : (safeScore / safeTotal) * 100) || 0));
    const safeTimeTaken = Math.min(86400, Math.max(0, parseInt(timeTaken, 10) || 0));

    const safeAnswers = Array.isArray(answers) ? answers.slice(0, 100) : [];

    const attemptPayload = {
      quizId: quiz.id,
      userId: 'default_user',
      studentName: cleanStudentName || 'Anonymous Student',
      score: safeScore,
      totalQuestions: safeTotal,
      percentage: safePercentage,
      correctCount: Math.max(0, parseInt(correctCount, 10) || safeScore),
      incorrectCount: Math.max(0, parseInt(incorrectCount, 10) || 0),
      unansweredCount: Math.max(0, parseInt(unansweredCount, 10) || 0),
      timeTaken: safeTimeTaken,
      subject: quiz.subject,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      isAdaptive: false,
      answers: safeAnswers
    };

    const savedAttempt = await QuizService.recordAttempt(attemptPayload, 'default_user');

    res.status(201).json({
      success: true,
      data: savedAttempt,
      message: 'Attempt submitted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSharedQuiz,
  submitSharedAttempt
};
