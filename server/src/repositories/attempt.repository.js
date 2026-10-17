const { run, all, get, transaction } = require('../db');
const { v4: uuidv4 } = require('uuid');
const GamificationService = require('../services/gamification.service');

function sanitizeStr(val, maxLen = 200, fallback = '') {
  if (val === null || val === undefined) return fallback;
  return String(val)
    .replace(/<[^>]*>?/gm, '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLen) || fallback;
}

/**
 * Attempt Repository
 * Handles persistent storage and retrieval of quiz attempts and individual question answers,
 * and deterministic gamification tracking (XP, Levels, Streaks, Achievements).
 */
class AttemptRepository {
  /**
   * Helper to ensure user exists and retrieve current gamification state.
   */
  static getUser(userId = 'default_user') {
    const safeUserId = sanitizeStr(userId, 64, 'default_user');
    let user = get('SELECT * FROM users WHERE id = ?', [safeUserId]);
    if (!user) {
      const email = safeUserId === 'default_user' ? 'student@quizforge.local' : `${safeUserId}@quizforge.local`;
      run(
        "INSERT OR IGNORE INTO users (id, name, email, xp, level, streak, best_streak, created_at) VALUES (?, 'Student', ?, 0, 1, 0, 0, datetime('now'))",
        [safeUserId, email]
      );
      user = get('SELECT * FROM users WHERE id = ?', [safeUserId]);
    }
    return user;
  }

  /**
   * Record a quiz attempt, question answers, and deterministic gamification progress.
   * @param {Object} data
   * @returns {Object} Full attempt object with gamification results.
   */
  static create(data = {}) {
    const attemptId = uuidv4();
    const userId = sanitizeStr(data.userId, 64, 'default_user');
    let quizId = data.quizId ? sanitizeStr(data.quizId, 64, null) : null;

    // Verify that quizId actually exists in quizzes table to prevent FOREIGN KEY constraint crashes
    let quiz = quizId ? get('SELECT * FROM quizzes WHERE id = ?', [quizId]) : null;
    if (!quiz) {
      const existingQuiz = get('SELECT * FROM quizzes LIMIT 1');
      if (existingQuiz) {
        quiz = existingQuiz;
        quizId = existingQuiz.id;
      } else {
        quizId = uuidv4();
        run(
          "INSERT INTO quizzes (id, user_id, title, subject, topic, difficulty, question_count, status, created_at, updated_at) VALUES (?, ?, 'Practice Quiz', 'General', 'Practice', 'medium', ?, 'ready', datetime('now'), datetime('now'))",
          [quizId, userId, Math.max(1, Math.min(50, parseInt(data.totalQuestions, 10) || 5))]
        );
        quiz = get('SELECT * FROM quizzes WHERE id = ?', [quizId]);
      }
    }

    const score = Math.max(0, Math.min(1000, parseInt(data.score, 10) || 0));
    const totalQuestions = Math.max(0, Math.min(200, parseInt(data.totalQuestions, 10) || 0));
    const percentage = Math.max(0, Math.min(100, parseFloat(data.percentage) || 0.0));
    const correctCount = Math.max(0, Math.min(200, parseInt(data.correctCount, 10) || 0));
    const incorrectCount = Math.max(0, Math.min(200, parseInt(data.incorrectCount, 10) || 0));
    const unansweredCount = Math.max(0, Math.min(200, parseInt(data.unansweredCount, 10) || 0));
    const timeTaken = Math.max(0, Math.min(86400, parseInt(data.timeTaken, 10) || 0)); // max 24h in seconds

    // 1. Fetch user & quiz metadata
    const user = this.getUser(userId);
    const isAdaptive = Boolean(data.isAdaptive || quiz?.is_adaptive);
    const difficulty = sanitizeStr(data.difficulty || quiz?.difficulty || 'medium', 20, 'medium').toLowerCase();

    const safeAnswers = Array.isArray(data.answers) ? data.answers.slice(0, 100) : [];

    // Check if questions include numerical type
    const hasNumerical = safeAnswers.some((a) => a && a.type === 'numerical');

    // 2. Calculate Date-Based Streak
    const streakResult = GamificationService.calculateDateStreak(
      user.last_active_date,
      new Date(),
      user.streak || 0,
      user.best_streak || 0
    );

    // 3. Deterministically Calculate Earned XP
    const xpResult = GamificationService.calculateEarnedXp({
      totalQuestions,
      correctCount,
      difficulty,
      isAdaptive,
      percentage,
      currentStreak: streakResult.currentStreak,
      answers: safeAnswers
    });

    const xpEarned = xpResult.totalXp;
    const newTotalXp = (user.xp || 0) + xpEarned;
    const levelProgress = GamificationService.calculateLevelProgress(newTotalXp);

    // Build set of valid question IDs in the database to prevent FOREIGN KEY constraint crashes
    const validQuestionRows = all('SELECT id FROM questions WHERE quiz_id = ?', [quizId]);
    const validQuestionIds = new Set(validQuestionRows.map((r) => r.id));

    const studentName = sanitizeStr(data.studentName, 80, 'Anonymous Student');

    transaction(() => {
      // 4. Update User Row
      run(
        `UPDATE users
         SET xp = ?, level = ?, streak = ?, best_streak = ?, last_active_date = ?
         WHERE id = ?`,
        [newTotalXp, levelProgress.level, streakResult.currentStreak, streakResult.bestStreak, streakResult.lastActiveDate, userId]
      );

      // 5. Insert Attempt
      run(
        `INSERT INTO attempts (
          id, quiz_id, user_id, student_name, score, total_questions, percentage,
          correct_count, incorrect_count, unanswered_count, time_taken, xp_earned, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          attemptId, quizId, userId, studentName, score, totalQuestions, percentage,
          correctCount, incorrectCount, unansweredCount, timeTaken, xpEarned
        ]
      );

      // 6. Insert Answers (with verified question_id foreign key)
      safeAnswers.forEach((ans) => {
        if (!ans || typeof ans !== 'object') return;
        const answerId = uuidv4();
        let resolvedQuestionId = null;
        if (ans.questionId && typeof ans.questionId === 'string') {
          if (validQuestionIds.has(ans.questionId)) {
            resolvedQuestionId = ans.questionId;
          } else {
            const existsAny = get('SELECT id FROM questions WHERE id = ?', [ans.questionId]);
            if (existsAny) resolvedQuestionId = ans.questionId;
          }
        }

        run(
          `INSERT INTO answers (
            id, attempt_id, question_id, selected_answer, is_correct, time_taken
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            answerId,
            attemptId,
            resolvedQuestionId,
            ans.selectedAnswer !== undefined && ans.selectedAnswer !== null
              ? sanitizeStr(ans.selectedAnswer, 500, '')
              : null,
            ans.isCorrect ? 1 : 0,
            Math.max(0, Math.min(3600, parseInt(ans.timeTaken, 10) || 0))
          ]
        );
      });
    });

    // 7. Evaluate and Unlock Achievements
    const stats = this.getStats(userId);
    const existingBadges = all('SELECT badge_id FROM achievements WHERE user_id = ?', [userId]);
    const existingBadgeIds = existingBadges.map((b) => b.badge_id);

    const attemptContext = {
      percentage,
      timeTaken,
      isAdaptive,
      hasNumerical
    };

    const achievementEval = GamificationService.evaluateAchievements(stats, attemptContext, existingBadgeIds);

    // Record newly unlocked badges in DB
    if (achievementEval.newlyUnlocked.length > 0) {
      transaction(() => {
        achievementEval.newlyUnlocked.forEach((badge) => {
          run(
            'INSERT OR IGNORE INTO achievements (id, user_id, badge_id, unlocked_at) VALUES (?, ?, ?, datetime(\'now\'))',
            [uuidv4(), userId, badge.id]
          );
        });
      });
    }

    const savedAttempt = this.findById(attemptId);
    return {
      ...savedAttempt,
      xpEarned,
      xpBreakdown: xpResult.breakdown,
      levelProgress,
      streakInfo: streakResult,
      newAchievements: achievementEval.newlyUnlocked
    };
  }

  /**
   * Find an attempt by ID with full question-level review breakdown.
   * @param {string} id
   * @returns {Object|null}
   */
  static findById(id) {
    const attempt = get(`
      SELECT a.*, q.title as quiz_title, q.subject, q.topic, q.difficulty, q.is_adaptive
      FROM attempts a
      LEFT JOIN quizzes q ON a.quiz_id = q.id
      WHERE a.id = ?
    `, [id]);

    if (!attempt) return null;

    const rawAnswers = all(`
      SELECT ans.*, q.type as question_type, q.question as question_text, q.options, q.correct_answer,
             q.unit, q.numeric_answer, q.tolerance, q.explanation, q.hint, q.concept, q.difficulty as question_difficulty
      FROM answers ans
      LEFT JOIN questions q ON ans.question_id = q.id
      WHERE ans.attempt_id = ?
    `, [id]);

    const answers = rawAnswers.map((ans) => {
      let parsedOptions = [];
      try {
        parsedOptions = typeof ans.options === 'string' ? JSON.parse(ans.options) : (ans.options || []);
      } catch (e) {
        parsedOptions = [];
      }

      return {
        id: ans.id,
        attemptId: ans.attempt_id,
        questionId: ans.question_id,
        type: ans.question_type || 'mcq',
        question: ans.question_text,
        options: parsedOptions,
        selectedAnswer: ans.selected_answer,
        correctAnswer: ans.correct_answer,
        unit: ans.unit,
        numericAnswer: ans.numeric_answer,
        tolerance: ans.tolerance,
        isCorrect: Boolean(ans.is_correct),
        explanation: ans.explanation,
        hint: ans.hint,
        concept: ans.concept,
        difficulty: ans.question_difficulty,
        timeTaken: ans.time_taken
      };
    });

    return {
      id: attempt.id,
      quizId: attempt.quiz_id,
      userId: attempt.user_id,
      quizTitle: attempt.quiz_title || 'Quiz Attempt',
      subject: attempt.subject || 'General',
      topic: attempt.topic || 'General',
      difficulty: attempt.difficulty || 'medium',
      isAdaptive: Boolean(attempt.is_adaptive),
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      percentage: Math.round(attempt.percentage),
      correctCount: attempt.correct_count,
      incorrectCount: attempt.incorrect_count,
      unansweredCount: attempt.unanswered_count,
      timeTaken: attempt.time_taken,
      xpEarned: attempt.xp_earned || 0,
      completedAt: attempt.completed_at,
      answers
    };
  }

  /**
   * Find all attempts for a user with quiz details.
   * @param {Object} filter
   * @returns {Array}
   */
  static findAll({ userId = 'default_user', quizId, limit = 50 } = {}) {
    let sql = `
      SELECT a.*, q.title as quiz_title, q.subject, q.topic, q.difficulty, q.is_adaptive
      FROM attempts a
      LEFT JOIN quizzes q ON a.quiz_id = q.id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      sql += ' AND (a.user_id = ? OR a.user_id IS NULL)';
      params.push(userId);
    }

    if (quizId) {
      sql += ' AND a.quiz_id = ?';
      params.push(quizId);
    }

    sql += ' ORDER BY a.completed_at DESC LIMIT ?';
    params.push(limit);

    const rows = all(sql, params);
    return rows.map((r) => {
      const mins = Math.floor(r.time_taken / 60);
      const secs = r.time_taken % 60;
      const durationStr = mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;

      return {
        id: r.id,
        quizId: r.quiz_id,
        userId: r.user_id,
        quizTitle: r.quiz_title || 'Quiz Attempt',
        subject: r.subject || 'General',
        topic: r.topic || 'General',
        difficulty: r.difficulty || 'medium',
        isAdaptive: Boolean(r.is_adaptive),
        score: r.score,
        total: r.total_questions,
        totalQuestions: r.total_questions,
        correct: r.correct_count,
        correctCount: r.correct_count,
        incorrect: r.incorrect_count,
        unanswered: r.unanswered_count,
        percentage: Math.round(r.percentage),
        timeTaken: r.time_taken,
        xpEarned: r.xp_earned || 0,
        duration: durationStr,
        status: r.percentage >= 60 ? 'passed' : 'failed',
        completedAt: r.completed_at,
        date: r.completed_at
      };
    });
  }

  /**
   * Compute aggregated statistics and full gamification status for the dashboard.
   * @param {string} userId
   * @returns {Object}
   */
  static getStats(userId = 'default_user') {
    const user = this.getUser(userId);
    const totalQuizzesRow = get('SELECT COUNT(*) as count FROM quizzes WHERE user_id = ? OR user_id IS NULL', [userId]) || { count: 0 };
    const attemptsSummary = get(`
      SELECT
        COUNT(*) as total_attempts,
        AVG(percentage) as avg_percentage,
        MAX(percentage) as best_percentage,
        SUM(total_questions) as total_questions_answered,
        SUM(correct_count) as total_correct_answered
      FROM attempts
      WHERE user_id = ? OR user_id IS NULL
    `, [userId]) || {};

    const totalAttempts = attemptsSummary.total_attempts || 0;
    const avgScore = totalAttempts > 0 ? Math.round(attemptsSummary.avg_percentage || 0) : 0;
    const bestScore = totalAttempts > 0 ? Math.round(attemptsSummary.best_percentage || 0) : 0;
    const questionsAnswered = attemptsSummary.total_questions_answered || 0;
    const correctAnswers = attemptsSummary.total_correct_answered || 0;

    // Count adaptive attempts
    const adaptiveSummary = get(`
      SELECT COUNT(*) as count
      FROM attempts a
      JOIN quizzes q ON a.quiz_id = q.id
      WHERE (a.user_id = ? OR a.user_id IS NULL) AND q.is_adaptive = 1
    `, [userId]) || { count: 0 };

    // Count speedy attempts (>=80% score in <= 60s)
    const speedySummary = get(`
      SELECT COUNT(*) as count
      FROM attempts
      WHERE (user_id = ? OR user_id IS NULL) AND percentage >= 80 AND time_taken > 0 AND time_taken <= 60
    `, [userId]) || { count: 0 };

    // Count numerical perfect attempts
    const numericalSummary = get(`
      SELECT COUNT(DISTINCT a.id) as count
      FROM attempts a
      JOIN answers ans ON ans.attempt_id = a.id
      JOIN questions q ON ans.question_id = q.id
      WHERE (a.user_id = ? OR a.user_id IS NULL) AND q.type = 'numerical' AND a.percentage = 100
    `, [userId]) || { count: 0 };

    // Fetch user unlocked badge IDs
    const unlockedRows = all('SELECT badge_id, unlocked_at FROM achievements WHERE user_id = ?', [userId]);
    const unlockedMap = new Map(unlockedRows.map((r) => [r.badge_id, r.unlocked_at]));

    // Level progression
    const totalXp = user.xp || 0;
    const levelProgress = GamificationService.calculateLevelProgress(totalXp);

    const statsPayload = {
      totalAttempts,
      quizzesCompleted: totalAttempts,
      totalQuizzes: totalQuizzesRow.count,
      averageScore: avgScore,
      bestScore: bestScore,
      questionsAnswered,
      correctAnswers,
      currentStreak: user.streak || (totalAttempts > 0 ? 1 : 0),
      bestStreak: user.best_streak || (totalAttempts > 0 ? 1 : 0),
      level: levelProgress.level,
      adaptiveAttempts: adaptiveSummary.count,
      speedyAttempts: speedySummary.count,
      numericalPerfect: numericalSummary.count
    };

    const achievementEval = GamificationService.evaluateAchievements(
      statsPayload,
      null,
      Array.from(unlockedMap.keys())
    );

    // Merge actual unlocked_at timestamp if present
    const badgesWithTimestamps = achievementEval.badges.map((b) => ({
      ...b,
      unlockedAt: unlockedMap.get(b.id) || b.unlockedAt
    }));

    return {
      ...statsPayload,
      xp: totalXp,
      levelProgress,
      achievements: badgesWithTimestamps,
      unlockedCount: badgesWithTimestamps.filter((b) => b.isUnlocked).length,
      totalAchievementsCount: badgesWithTimestamps.length
    };
  }
}

module.exports = AttemptRepository;
