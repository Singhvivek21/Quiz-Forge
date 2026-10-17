/**
 * teacher.controller.js
 *
 * REST Controller for Teacher Mode: Dashboard Analytics, Quiz Editing,
 * Safe Sharing, and Student Performance Tracking.
 */

const TeacherRepository = require('../repositories/teacher.repository');
const QuizRepository = require('../repositories/quiz.repository');
const SharingService = require('../services/sharing.service');

const getTeacherDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user?.id || 'default_teacher';
    const stats = TeacherRepository.getTeacherDashboardStats(teacherId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

const getTeacherQuizzes = async (req, res, next) => {
  try {
    const teacherId = req.user?.id || 'default_teacher';
    const quizzes = QuizRepository.findAll({ userId: teacherId });
    res.json({ success: true, data: quizzes });
  } catch (err) {
    next(err);
  }
};

const getTeacherQuizAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.length > 64) {
      return res.status(400).json({ success: false, error: 'Invalid quiz ID.' });
    }
    const analytics = TeacherRepository.getTeacherQuizAnalytics(id);
    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
};

const updateTeacherQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.length > 64) {
      return res.status(400).json({ success: false, error: 'Invalid quiz ID.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid quiz update payload.' });
    }
    const updated = QuizRepository.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    res.json({ success: true, data: updated, message: 'Quiz updated successfully' });
  } catch (err) {
    next(err);
  }
};

const shareTeacherQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.length > 64) {
      return res.status(400).json({ success: false, error: 'Invalid quiz ID.' });
    }
    const { isShared } = req.body || {};

    const quiz = QuizRepository.findById(id);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    let shareCode = quiz.shareCode;
    const shouldShare = isShared !== undefined ? Boolean(isShared) : !quiz.isShared;

    if (shouldShare && !shareCode) {
      shareCode = SharingService.generateShareCode(quiz.topic);
    }

    const updated = QuizRepository.setSharing(id, shouldShare, shouldShare ? shareCode : null);

    res.json({
      success: true,
      data: {
        id: updated.id,
        isShared: updated.isShared,
        shareCode: updated.shareCode,
        shareUrl: updated.shareCode ? `/share/${updated.shareCode}` : null
      },
      message: shouldShare ? `Quiz published with Share Code ${updated.shareCode}` : 'Quiz sharing deactivated'
    });
  } catch (err) {
    next(err);
  }
};

const deleteTeacherQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.length > 64) {
      return res.status(400).json({ success: false, error: 'Invalid quiz ID.' });
    }
    const deleted = QuizRepository.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTeacherDashboard,
  getTeacherQuizzes,
  getTeacherQuizAnalytics,
  updateTeacherQuiz,
  shareTeacherQuiz,
  deleteTeacherQuiz
};
