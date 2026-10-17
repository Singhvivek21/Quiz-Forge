const { run, all, get, transaction } = require('../db');
const { v4: uuidv4 } = require('uuid');

const MAX_QUIZ_QUESTIONS = 50;

function sanitizeText(val, maxLen = 500, fallback = '') {
  if (val === null || val === undefined) return fallback;
  const cleaned = String(val)
    .replace(/<[^>]*>/g, '')
    .replace(/\0/g, '')
    .trim();
  return (cleaned || fallback).slice(0, maxLen);
}

function sanitizeOptions(rawOptions) {
  let arr = [];
  if (typeof rawOptions === 'string') {
    try {
      arr = JSON.parse(rawOptions);
    } catch {
      arr = [];
    }
  } else if (Array.isArray(rawOptions)) {
    arr = rawOptions;
  }
  if (!Array.isArray(arr)) return '[]';

  const sanitized = arr.slice(0, 6).map((opt, idx) => {
    if (typeof opt === 'string') {
      return { id: String.fromCharCode(65 + idx), text: sanitizeText(opt, 500, '') };
    }
    if (opt && typeof opt === 'object') {
      return {
        id: sanitizeText(opt.id, 16, String.fromCharCode(65 + idx)),
        text: sanitizeText(opt.text, 500, ''),
      };
    }
    return { id: String.fromCharCode(65 + idx), text: '' };
  });

  return JSON.stringify(sanitized);
}

/**
 * Quiz Repository
 * Handles all CRUD database interactions for quizzes, questions, editing, and safe quiz sharing.
 */
class QuizRepository {
  /**
   * Create a quiz with its questions.
   * @param {Object} data
   * @returns {Object} Saved quiz with parsed questions.
   */
  static create(data = {}) {
    let quizId = uuidv4();
    if (data.id && typeof data.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(data.id.trim())) {
      const existing = get('SELECT id FROM quizzes WHERE id = ?', [data.id.trim()]);
      if (!existing) {
        quizId = data.id.trim();
      }
    }

    const userId = sanitizeText(data.userId, 64, 'default_user');
    const title = sanitizeText(data.title, 200, 'Untitled Quiz');
    const subject = sanitizeText(data.subject, 100, 'General');
    const topic = sanitizeText(data.topic, 200, 'General');
    const difficulty = sanitizeText(data.difficulty, 20, 'medium').toLowerCase();
    const questionsList = Array.isArray(data.questions) ? data.questions.slice(0, MAX_QUIZ_QUESTIONS) : [];
    const questionCount = questionsList.length > 0 ? questionsList.length : (Math.min(MAX_QUIZ_QUESTIONS, Math.max(0, parseInt(data.questionCount, 10) || 0)));
    const language = sanitizeText(data.language, 40, 'English');
    const timeLimit = data.timeLimit ? Math.min(86400, Math.max(0, parseInt(data.timeLimit, 10) || 0)) || null : null;
    const enableHints = data.enableHints !== false ? 1 : 0;
    const enableExplanations = data.enableExplanations !== false ? 1 : 0;
    const hasSourceMaterial = data.hasSourceMaterial || (typeof data.sourceMaterial === 'string' && data.sourceMaterial.trim().length > 0) ? 1 : 0;
    const sourceMaterial = typeof data.sourceMaterial === 'string' && data.sourceMaterial.trim() ? sanitizeText(data.sourceMaterial, 50000, '') : null;
    const isAdaptive = data.isAdaptive ? 1 : 0;
    const status = sanitizeText(data.status, 20, 'ready');
    const isShared = data.isShared ? 1 : 0;
    const shareCode = data.shareCode ? sanitizeText(data.shareCode, 40, null) : null;
    const createdByRole = data.createdByRole === 'teacher' || userId === 'default_teacher' ? 'teacher' : 'student';
    const allowAnonymousAttempts = data.allowAnonymousAttempts !== false ? 1 : 0;

    transaction(() => {
      // 1. Insert Quiz
      run(
        `INSERT INTO quizzes (
          id, user_id, title, subject, topic, difficulty, question_count,
          language, time_limit, enable_hints, enable_explanations, is_adaptive,
          has_source_material, source_material, status, is_shared, share_code,
          created_by_role, allow_anonymous_attempts, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          quizId, userId, title, subject, topic, difficulty, questionCount,
          language, timeLimit, enableHints, enableExplanations, isAdaptive,
          hasSourceMaterial, sourceMaterial, status, isShared, shareCode,
          createdByRole, allowAnonymousAttempts
        ]
      );

      // 2. Insert Questions
      questionsList.forEach((q, idx) => {
        if (!q || typeof q !== 'object') return;
        const questionId = uuidv4();
        const optionsJson = sanitizeOptions(q.options);
        const questionType = sanitizeText(q.type || data.questionType, 30, 'mcq').toLowerCase();
        const numericAnswer = q.numericAnswer !== undefined && q.numericAnswer !== null && !isNaN(Number(q.numericAnswer))
          ? Number(q.numericAnswer)
          : null;
        const tolerance = q.tolerance !== undefined && q.tolerance !== null && !isNaN(Number(q.tolerance))
          ? Number(q.tolerance)
          : 0.01;
        const rawContext = q.context || q.scenarioContext || q.caseContext || null;

        run(
          `INSERT INTO questions (
            id, quiz_id, type, context, question, options, correct_answer, unit, numeric_answer, tolerance,
            explanation, hint, concept, difficulty, source_reference, position, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            questionId,
            quizId,
            questionType,
            rawContext ? sanitizeText(rawContext, 2000, null) : null,
            sanitizeText(q.question, 1000, ''),
            optionsJson,
            sanitizeText(q.correctAnswer || q.answer, 100, ''),
            q.unit ? sanitizeText(q.unit, 50, null) : null,
            numericAnswer,
            tolerance,
            sanitizeText(q.explanation, 2000, ''),
            sanitizeText(q.hint, 500, ''),
            sanitizeText(q.concept, 150, topic),
            sanitizeText(q.difficulty || difficulty, 20, 'medium').toLowerCase(),
            q.sourceReference ? sanitizeText(q.sourceReference, 300, null) : null,
            idx
          ]
        );
      });
    });

    return this.findById(quizId);
  }

  /**
   * Update an existing quiz and its questions (Teacher Mode Edit).
   * @param {string} id
   * @param {Object} data
   * @returns {Object|null}
   */
  static update(id, data = {}) {
    const existing = this.findById(id);
    if (!existing) return null;

    const title = data.title !== undefined ? sanitizeText(data.title, 200, existing.title) : existing.title;
    const subject = data.subject !== undefined ? sanitizeText(data.subject, 100, existing.subject) : existing.subject;
    const topic = data.topic !== undefined ? sanitizeText(data.topic, 200, existing.topic) : existing.topic;
    const difficulty = data.difficulty !== undefined ? sanitizeText(data.difficulty, 20, existing.difficulty).toLowerCase() : existing.difficulty.toLowerCase();
    const timeLimit = data.timeLimit !== undefined ? (Math.min(86400, Math.max(0, parseInt(data.timeLimit, 10) || 0)) || null) : existing.timeLimit;
    const enableHints = data.enableHints !== undefined ? (data.enableHints ? 1 : 0) : (existing.enableHints ? 1 : 0);
    const enableExplanations = data.enableExplanations !== undefined ? (data.enableExplanations ? 1 : 0) : (existing.enableExplanations ? 1 : 0);
    const isShared = data.isShared !== undefined ? (data.isShared ? 1 : 0) : (existing.isShared ? 1 : 0);
    const shareCode = data.shareCode !== undefined ? (data.shareCode ? sanitizeText(data.shareCode, 40, null) : null) : existing.shareCode;
    const allowAnonymousAttempts = data.allowAnonymousAttempts !== undefined ? (data.allowAnonymousAttempts ? 1 : 0) : (existing.allowAnonymousAttempts ? 1 : 0);

    const questionsArray = Array.isArray(data.questions)
      ? data.questions.slice(0, MAX_QUIZ_QUESTIONS)
      : existing.questions;
    const questionCount = questionsArray.length;

    transaction(() => {
      // 1. Update Quiz Table
      run(
        `UPDATE quizzes
         SET title = ?, subject = ?, topic = ?, difficulty = ?, question_count = ?,
             time_limit = ?, enable_hints = ?, enable_explanations = ?, is_shared = ?,
             share_code = ?, allow_anonymous_attempts = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [
          title, subject, topic, difficulty, questionCount,
          timeLimit, enableHints, enableExplanations, isShared,
          shareCode, allowAnonymousAttempts, id
        ]
      );

      // 2. If questions provided, replace all questions for this quiz
      if (Array.isArray(data.questions)) {
        run('DELETE FROM questions WHERE quiz_id = ?', [id]);

        questionsArray.forEach((q, idx) => {
          if (!q || typeof q !== 'object') return;
          const questionId = uuidv4();
          const optionsJson = sanitizeOptions(q.options);
          const questionType = sanitizeText(q.type, 30, 'mcq').toLowerCase();
          const numericAnswer = q.numericAnswer !== undefined && q.numericAnswer !== null && q.numericAnswer !== '' && !isNaN(Number(q.numericAnswer))
            ? Number(q.numericAnswer)
            : null;
          const tolerance = q.tolerance !== undefined && q.tolerance !== null && !isNaN(Number(q.tolerance))
            ? Number(q.tolerance)
            : 0.01;
          const rawContext = q.context || q.scenarioContext || q.caseContext || null;

          run(
            `INSERT INTO questions (
              id, quiz_id, type, context, question, options, correct_answer, unit, numeric_answer, tolerance,
              explanation, hint, concept, difficulty, source_reference, position, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              questionId,
              id,
              questionType,
              rawContext ? sanitizeText(rawContext, 2000, null) : null,
              sanitizeText(q.question, 1000, ''),
              optionsJson,
              sanitizeText(q.correctAnswer || q.answer, 100, ''),
              q.unit ? sanitizeText(q.unit, 50, null) : null,
              numericAnswer,
              tolerance,
              sanitizeText(q.explanation, 2000, ''),
              sanitizeText(q.hint, 500, ''),
              sanitizeText(q.concept, 150, topic),
              sanitizeText(q.difficulty || difficulty, 20, 'medium').toLowerCase(),
              q.sourceReference ? sanitizeText(q.sourceReference, 300, null) : null,
              idx
            ]
          );
        });
      }
    });

    return this.findById(id);
  }

  /**
   * Toggle or set sharing state and code for a quiz.
   */
  static setSharing(id, isShared, shareCode) {
    run(
      'UPDATE quizzes SET is_shared = ?, share_code = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [isShared ? 1 : 0, shareCode || null, id]
    );
    return this.findById(id);
  }

  /**
   * Find a shared quiz by its unique share code (Public / Student Access).
   */
  static findByShareCode(shareCode) {
    if (!shareCode) return null;
    const quiz = get('SELECT * FROM quizzes WHERE UPPER(share_code) = UPPER(?) AND is_shared = 1', [shareCode.trim()]);
    if (!quiz) return null;

    return this.findById(quiz.id);
  }

  /**
   * Find a quiz by ID including all its questions formatted for client.
   * @param {string} id
   * @returns {Object|null}
   */
  static findById(id) {
    const quiz = get('SELECT * FROM quizzes WHERE id = ?', [id]);
    if (!quiz) return null;

    const rawQuestions = all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC', [id]);
    const questions = rawQuestions.map((q) => {
      let parsedOptions = [];
      try {
        parsedOptions = JSON.parse(q.options);
      } catch (e) {
        parsedOptions = [];
      }
      return {
        id: q.id,
        quizId: q.quiz_id,
        type: q.type || 'mcq',
        context: q.context || null,
        question: q.question,
        options: parsedOptions,
        correctAnswer: q.correct_answer,
        unit: q.unit || null,
        numericAnswer: q.numeric_answer !== null && q.numeric_answer !== undefined ? Number(q.numeric_answer) : null,
        tolerance: q.tolerance !== null && q.tolerance !== undefined ? Number(q.tolerance) : 0.01,
        explanation: q.explanation,
        hint: q.hint,
        concept: q.concept,
        difficulty: q.difficulty,
        sourceReference: q.source_reference,
        position: q.position,
        createdAt: q.created_at
      };
    });

    return {
      id: quiz.id,
      userId: quiz.user_id,
      title: quiz.title,
      subject: quiz.subject,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      questionCount: quiz.question_count,
      language: quiz.language,
      timeLimit: quiz.time_limit,
      enableHints: Boolean(quiz.enable_hints),
      enableExplanations: Boolean(quiz.enable_explanations),
      isAdaptive: Boolean(quiz.is_adaptive),
      hasSourceMaterial: Boolean(quiz.has_source_material),
      sourceMaterial: quiz.source_material,
      isShared: Boolean(quiz.is_shared),
      shareCode: quiz.share_code,
      createdByRole: quiz.created_by_role || 'student',
      allowAnonymousAttempts: Boolean(quiz.allow_anonymous_attempts !== 0),
      status: quiz.status,
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at,
      questions
    };
  }

  /**
   * Find all quizzes, optionally filtered by search, subject, or role.
   * @param {Object} filter
   * @returns {Array}
   */
  static findAll({ search, subject, difficulty, userId = 'default_user', role, isShared } = {}) {
    let sql = `
      SELECT q.*,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as actual_question_count,
        (SELECT score FROM attempts WHERE quiz_id = q.id ORDER BY completed_at DESC LIMIT 1) as latest_score,
        (SELECT percentage FROM attempts WHERE quiz_id = q.id ORDER BY completed_at DESC LIMIT 1) as latest_percentage,
        (SELECT AVG(percentage) FROM attempts WHERE quiz_id = q.id) as average_percentage,
        (SELECT completed_at FROM attempts WHERE quiz_id = q.id ORDER BY completed_at DESC LIMIT 1) as last_attempt_at,
        (SELECT COUNT(*) FROM attempts WHERE quiz_id = q.id) as total_attempts
      FROM quizzes q
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      sql += ' AND (q.user_id = ? OR q.user_id IS NULL)';
      params.push(userId);
    }

    if (role) {
      sql += ' AND q.created_by_role = ?';
      params.push(role);
    }

    if (isShared !== undefined) {
      sql += ' AND q.is_shared = ?';
      params.push(isShared ? 1 : 0);
    }

    if (search) {
      sql += ' AND (q.title LIKE ? OR q.subject LIKE ? OR q.topic LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (subject && subject !== 'All') {
      sql += ' AND q.subject = ?';
      params.push(subject);
    }

    if (difficulty && difficulty !== 'All') {
      sql += ' AND q.difficulty = ?';
      params.push(difficulty.toLowerCase());
    }

    sql += ' ORDER BY q.created_at DESC';

    const rows = all(sql, params);
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      subject: r.subject,
      topic: r.topic,
      difficulty: r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1),
      questionCount: r.actual_question_count || r.question_count,
      question_count: r.actual_question_count || r.question_count,
      language: r.language,
      timeLimit: r.time_limit,
      enableHints: Boolean(r.enable_hints),
      enableExplanations: Boolean(r.enable_explanations),
      isAdaptive: Boolean(r.is_adaptive),
      isShared: Boolean(r.is_shared),
      is_shared: Boolean(r.is_shared),
      shareCode: r.share_code,
      share_code: r.share_code,
      createdByRole: r.created_by_role || 'student',
      allowAnonymousAttempts: Boolean(r.allow_anonymous_attempts !== 0),
      status: r.total_attempts > 0 ? 'completed' : 'ready',
      latestScore: r.latest_score !== null && r.latest_score !== undefined ? r.latest_score : null,
      latestPercentage: r.latest_percentage !== null && r.latest_percentage !== undefined ? r.latest_percentage : null,
      averagePercentage: r.average_percentage !== null && r.average_percentage !== undefined ? Math.round(r.average_percentage) : null,
      avg_score: r.average_percentage !== null && r.average_percentage !== undefined ? Math.round(r.average_percentage) : 0,
      lastAttemptAt: r.last_attempt_at,
      totalAttempts: r.total_attempts,
      attempts_count: r.total_attempts || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  /**
   * Delete a quiz by ID (cascades to questions and attempts in SQLite).
   * @param {string} id
   * @returns {boolean}
   */
  static delete(id) {
    const existing = get('SELECT id FROM quizzes WHERE id = ?', [id]);
    if (!existing) return false;
    run('DELETE FROM quizzes WHERE id = ?', [id]);
    return true;
  }
}

module.exports = QuizRepository;
