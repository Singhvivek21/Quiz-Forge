const QuizRepository = require('../repositories/quiz.repository');
const AttemptRepository = require('../repositories/attempt.repository');
const ProgressRepository = require('../repositories/progress.repository');

/**
 * Quiz Service
 * Core business logic for saving quizzes, recording attempts, computing progress, and serving stats.
 */
class QuizService {
  /**
   * Save a newly generated or custom quiz to the database.
   */
  static async saveQuiz(quizData, userId = 'default_user') {
    if (!quizData) throw new Error('Quiz data is required');
    return QuizRepository.create({ ...quizData, userId });
  }

  /**
   * Get a quiz by ID with all questions.
   */
  static async getQuizById(id) {
    const quiz = QuizRepository.findById(id);
    if (!quiz) {
      const err = new Error('Quiz not found');
      err.status = 404;
      throw err;
    }
    return quiz;
  }

  /**
   * List all saved quizzes with filters and attempt summary.
   */
  static async listQuizzes(filter = {}) {
    return QuizRepository.findAll(filter);
  }

  /**
   * Delete a quiz.
   */
  static async deleteQuiz(id) {
    const success = QuizRepository.delete(id);
    if (!success) {
      const err = new Error('Quiz not found');
      err.status = 404;
      throw err;
    }
    return { success: true, message: 'Quiz deleted successfully' };
  }

  /**
   * Record a completed quiz attempt, deterministic gamification, and concept progress.
   */
  static async recordAttempt(attemptData, defaultUserId = 'default_user') {
    const {
      quizId,
      score,
      totalQuestions,
      percentage,
      correctCount,
      incorrectCount,
      unansweredCount,
      timeTaken,
      answers,
      subject,
      topic,
      difficulty,
      isAdaptive
    } = attemptData;

    const userId = attemptData.userId || defaultUserId;

    // Fetch quiz if subject/topic not provided
    let quizMeta = null;
    if (quizId) {
      quizMeta = QuizRepository.findById(quizId);
    }

    const effectiveSubject = subject || (quizMeta ? quizMeta.subject : 'General');
    const effectiveTopic = topic || (quizMeta ? quizMeta.topic : 'General');
    const effectiveDifficulty = difficulty || (quizMeta ? quizMeta.difficulty : 'medium');
    const effectiveIsAdaptive = Boolean(isAdaptive !== undefined ? isAdaptive : (quizMeta ? quizMeta.is_adaptive : false));

    // 1. Save attempt, update gamification and answer rows
    const savedAttempt = AttemptRepository.create({
      quizId,
      userId,
      studentName: attemptData.studentName,
      score: score !== undefined ? score : (correctCount || 0),
      totalQuestions: totalQuestions || (answers ? answers.length : 0),
      percentage: percentage !== undefined ? percentage : (totalQuestions > 0 ? (score / totalQuestions) * 100 : 0),
      correctCount: correctCount || 0,
      incorrectCount: incorrectCount || 0,
      unansweredCount: unansweredCount || 0,
      timeTaken: timeTaken || 0,
      difficulty: effectiveDifficulty,
      isAdaptive: effectiveIsAdaptive,
      answers: answers || []
    });

    // 2. Update concept progress in SQLite
    if (Array.isArray(answers) && answers.length > 0) {
      const progressItems = answers.map((ans) => ({
        concept: ans.concept || effectiveTopic,
        isCorrect: Boolean(ans.isCorrect),
        subject: effectiveSubject,
        topic: effectiveTopic
      }));
      ProgressRepository.recordAttemptProgress(userId, progressItems, effectiveSubject, effectiveTopic);
    }

    return savedAttempt;
  }

  /**
   * Retrieve an attempt with detailed question & answer review.
   */
  static async getAttemptReview(attemptId) {
    const attempt = AttemptRepository.findById(attemptId);
    if (!attempt) {
      const err = new Error('Attempt not found');
      err.status = 404;
      throw err;
    }
    return attempt;
  }

  /**
   * List attempts for quiz history.
   */
  static async listAttempts(filter = {}) {
    return AttemptRepository.findAll(filter);
  }

  /**
   * Get user concept progress.
   */
  static async getProgress(userId = 'default_user') {
    return ProgressRepository.getProgress(userId);
  }

  /**
   * Get weak concepts for adaptive practice.
   */
  static async getWeakConcepts(userId = 'default_user', limit = 5) {
    return ProgressRepository.getWeakConcepts(userId, limit);
  }

  /**
   * Get dashboard statistics.
   */
  static async getStats(userId = 'default_user') {
    return AttemptRepository.getStats(userId);
  }
}

module.exports = QuizService;
