const { run, all, get, transaction } = require('../db');
const { v4: uuidv4 } = require('uuid');

function sanitizeField(val, maxLen = 150, fallback = 'General') {
  if (val === null || val === undefined) return fallback;
  return String(val)
    .replace(/<[^>]*>?/gm, '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLen) || fallback;
}

/**
 * Progress Repository
 * Tracks user concept-level mastery, accuracy, attempts, and weak concepts for adaptive practice.
 */
class ProgressRepository {
  /**
   * Update progress records based on answered questions in an attempt.
   * @param {string} userId
   * @param {Array} items - Array of { concept, isCorrect, subject, topic }
   * @returns {Array} Updated progress rows
   */
  static recordAttemptProgress(userId = 'default_user', items = [], subject = 'General', topic = 'General') {
    if (!Array.isArray(items) || items.length === 0) return [];

    const safeUserId = sanitizeField(userId, 64, 'default_user');
    const safeSubject = sanitizeField(subject, 100, 'General');
    const safeTopic = sanitizeField(topic, 150, 'General');

    // Group incoming items by concept (cap at 100 items)
    const conceptMap = {};
    items.slice(0, 100).forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const conceptName = sanitizeField(item.concept || safeTopic, 150, 'General');
      if (!conceptMap[conceptName]) {
        conceptMap[conceptName] = {
          concept: conceptName,
          subject: sanitizeField(item.subject || safeSubject, 100, 'General'),
          topic: sanitizeField(item.topic || safeTopic, 150, 'General'),
          total: 0,
          correct: 0
        };
      }
      conceptMap[conceptName].total += 1;
      if (item.isCorrect) {
        conceptMap[conceptName].correct += 1;
      }
    });

    // Update or insert into progress table inside a transaction
    transaction(() => {
      Object.values(conceptMap).forEach((group) => {
        const existing = get(
          'SELECT * FROM progress WHERE user_id = ? AND concept = ?',
          [safeUserId, group.concept]
        );

        if (existing) {
          const newTotal = (existing.total_questions || 0) + group.total;
          const newCorrect = (existing.correct_count || 0) + group.correct;
          const newAccuracy = newTotal > 0 ? (newCorrect / newTotal) * 100 : 0.0;
          const newAttempts = (existing.attempts || 1) + 1;

          run(
            `UPDATE progress
             SET correct_count = ?, total_questions = ?, accuracy = ?, attempts = ?, last_practiced = datetime('now')
             WHERE id = ?`,
            [newCorrect, newTotal, Math.round(newAccuracy * 10) / 10, newAttempts, existing.id]
          );
        } else {
          const id = uuidv4();
          const accuracy = group.total > 0 ? (group.correct / group.total) * 100 : 0.0;
          run(
            `INSERT INTO progress (
              id, user_id, concept, subject, topic, correct_count, total_questions, accuracy, attempts, last_practiced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
            [
              id,
              safeUserId,
              group.concept,
              group.subject,
              group.topic,
              group.correct,
              group.total,
              Math.round(accuracy * 10) / 10
            ]
          );
        }
      });
    });

    return this.getProgress(safeUserId);
  }

  /**
   * Get all concept progress records for a user.
   * @param {string} userId
   * @returns {Array}
   */
  static getProgress(userId = 'default_user') {
    const rows = all(
      'SELECT * FROM progress WHERE user_id = ? ORDER BY last_practiced DESC',
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      concept: r.concept,
      subject: r.subject,
      topic: r.topic,
      correctCount: r.correct_count,
      totalQuestions: r.total_questions,
      accuracy: Math.round(r.accuracy),
      attempts: r.attempts,
      lastPracticed: r.last_practiced
    }));
  }

  /**
   * Get weak concepts (accuracy < 70% or lowest accuracy) for adaptive practice recommendations.
   * @param {string} userId
   * @param {number} limit
   * @returns {Array}
   */
  static getWeakConcepts(userId = 'default_user', limit = 5) {
    const rows = all(
      `SELECT * FROM progress
       WHERE user_id = ? AND accuracy < 75
       ORDER BY accuracy ASC, last_practiced DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows.map((r) => ({
      concept: r.concept,
      subject: r.subject || 'General',
      topic: r.topic || 'General',
      accuracy: Math.round(r.accuracy),
      totalQuestions: r.total_questions,
      attempts: r.attempts,
      lastPracticed: r.last_practiced
    }));
  }
}

module.exports = ProgressRepository;
