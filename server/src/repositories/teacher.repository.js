/**
 * teacher.repository.js
 *
 * Dedicated Repository for Teacher Mode: Class Analytics, Question Performance,
 * Weak Topics, and Privacy-Safe Student Attempt Auditing.
 */

const { run, all, get } = require('../db');
const QuizRepository = require('./quiz.repository');

class TeacherRepository {
  /**
   * Retrieves aggregated analytics for the Teacher Dashboard.
   * @param {string} teacherId
   * @returns {Object}
   */
  static getTeacherDashboardStats(teacherId = 'default_teacher') {
    // 1. Quizzes count
    const quizCountRow = get(
      'SELECT COUNT(*) as count FROM quizzes WHERE user_id = ? OR created_by_role = \'teacher\'',
      [teacherId]
    ) || { count: 0 };
    const totalQuizzes = quizCountRow.count;

    // 2. Attempts across all teacher quizzes
    const attemptsSummary = get(`
      SELECT
        COUNT(a.id) as total_attempts,
        AVG(a.percentage) as avg_percentage,
        SUM(CASE WHEN a.percentage >= 60 THEN 1 ELSE 0 END) as passed_count,
        AVG(a.time_taken) as avg_time_taken,
        SUM(a.total_questions) as total_questions_tested,
        SUM(a.correct_count) as total_correct_answered
      FROM attempts a
      JOIN quizzes q ON a.quiz_id = q.id
      WHERE q.user_id = ? OR q.created_by_role = 'teacher'
    `, [teacherId]) || {};

    const totalAttempts = attemptsSummary.total_attempts || 0;
    const avgScore = totalAttempts > 0 ? Math.round(attemptsSummary.avg_percentage || 0) : 0;
    const passRate = totalAttempts > 0 ? Math.round(((attemptsSummary.passed_count || 0) / totalAttempts) * 100) : 0;
    const avgTime = totalAttempts > 0 ? Math.round(attemptsSummary.avg_time_taken || 0) : 0;

    // 3. Question Performance across teacher quizzes
    const questionStatsRows = all(`
      SELECT
        q.id as question_id,
        q.quiz_id,
        qz.title as quiz_title,
        q.question,
        q.type,
        q.concept,
        q.difficulty,
        COUNT(ans.id) as times_answered,
        SUM(ans.is_correct) as correct_count,
        AVG(ans.is_correct) * 100 as accuracy
      FROM questions q
      JOIN quizzes qz ON q.quiz_id = qz.id
      LEFT JOIN answers ans ON ans.question_id = q.id
      WHERE qz.user_id = ? OR qz.created_by_role = 'teacher'
      GROUP BY q.id
      HAVING times_answered > 0
      ORDER BY accuracy ASC
      LIMIT 10
    `, [teacherId]);

    const questionPerformance = questionStatsRows.map((q) => ({
      questionId: q.question_id,
      quizTitle: q.quiz_title,
      question: q.question,
      type: q.type || 'mcq',
      concept: q.concept || 'General',
      difficulty: q.difficulty || 'medium',
      timesAnswered: q.times_answered,
      correctCount: q.correct_count || 0,
      accuracy: Math.round(q.accuracy || 0)
    }));

    // 4. Class Weak Topics (< 70% accuracy across teacher quizzes)
    const weakTopicsRows = all(`
      SELECT
        q.concept,
        qz.subject,
        qz.topic,
        COUNT(ans.id) as total_questions,
        SUM(ans.is_correct) as correct_count,
        (CAST(SUM(ans.is_correct) AS REAL) / COUNT(ans.id)) * 100 as accuracy
      FROM answers ans
      JOIN questions q ON ans.question_id = q.id
      JOIN quizzes qz ON q.quiz_id = qz.id
      WHERE qz.user_id = ? OR qz.created_by_role = 'teacher'
      GROUP BY q.concept
      HAVING total_questions >= 2 AND accuracy < 70
      ORDER BY accuracy ASC
      LIMIT 6
    `, [teacherId]);

    const weakTopics = weakTopicsRows.map((t) => ({
      concept: t.concept,
      subject: t.subject,
      topic: t.topic,
      totalTested: t.total_questions,
      correctCount: t.correct_count,
      accuracy: Math.round(t.accuracy)
    }));

    // 5. Difficulty Performance
    const diffRows = all(`
      SELECT
        q.difficulty,
        COUNT(ans.id) as total_answers,
        SUM(ans.is_correct) as correct_count,
        AVG(ans.is_correct) * 100 as accuracy
      FROM answers ans
      JOIN questions q ON ans.question_id = q.id
      JOIN quizzes qz ON q.quiz_id = qz.id
      WHERE qz.user_id = ? OR qz.created_by_role = 'teacher'
      GROUP BY q.difficulty
    `, [teacherId]);

    const difficultyPerformance = {
      easy: 0,
      medium: 0,
      hard: 0,
      easyTotal: 0,
      mediumTotal: 0,
      hardTotal: 0
    };

    diffRows.forEach((r) => {
      const diff = (r.difficulty || 'medium').toLowerCase();
      if (diff === 'easy') {
        difficultyPerformance.easy = Math.round(r.accuracy || 0);
        difficultyPerformance.easyTotal = r.total_answers;
      } else if (diff === 'hard') {
        difficultyPerformance.hard = Math.round(r.accuracy || 0);
        difficultyPerformance.hardTotal = r.total_answers;
      } else {
        difficultyPerformance.medium = Math.round(r.accuracy || 0);
        difficultyPerformance.mediumTotal = r.total_answers;
      }
    });

    const quizzes = QuizRepository.findAll({ userId: null });

    return {
      totalQuizzes,
      totalAttempts,
      averageScore: avgScore,
      passRate,
      averageDuration: avgTime,
      summary: {
        totalQuizzes,
        totalAttempts,
        averageScore: avgScore,
        passRate,
        averageDuration: avgTime
      },
      quizzes,
      questionPerformance,
      weakTopics,
      difficultyPerformance
    };
  }

  /**
   * Retrieves detailed, privacy-safe analytics for a specific quiz.
   * @param {string} quizId
   * @returns {Object|null}
   */
  static getTeacherQuizAnalytics(quizId) {
    const quiz = get('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) return null;

    // 1. Overall quiz summary
    const summary = get(`
      SELECT
        COUNT(id) as total_attempts,
        AVG(percentage) as avg_percentage,
        MAX(percentage) as best_percentage,
        MIN(percentage) as lowest_percentage,
        SUM(CASE WHEN percentage >= 60 THEN 1 ELSE 0 END) as passed_count,
        AVG(time_taken) as avg_time_taken
      FROM attempts
      WHERE quiz_id = ?
    `, [quizId]) || {};

    const totalAttempts = summary.total_attempts || 0;
    const avgPercentage = totalAttempts > 0 ? Math.round(summary.avg_percentage || 0) : 0;
    const passRate = totalAttempts > 0 ? Math.round(((summary.passed_count || 0) / totalAttempts) * 100) : 0;

    // 2. Question-by-question performance breakdown
    const questions = all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC', [quizId]);
    const questionAnalysis = questions.map((q, idx) => {
      let options = [];
      try {
        options = JSON.parse(q.options);
      } catch (e) {
        options = [];
      }

      const answers = all('SELECT selected_answer, is_correct, time_taken FROM answers WHERE question_id = ?', [q.id]);
      const answeredCount = answers.length;
      const correctCount = answers.filter((a) => a.is_correct).length;
      const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

      // Calculate distribution of selected options (A, B, C, D)
      const distribution = {};
      options.forEach((opt) => {
        distribution[opt.id] = 0;
      });
      answers.forEach((ans) => {
        if (ans.selected_answer && distribution[ans.selected_answer] !== undefined) {
          distribution[ans.selected_answer]++;
        }
      });

      return {
        id: q.id,
        position: idx + 1,
        question: q.question,
        type: q.type || 'mcq',
        context: q.context,
        correctAnswer: q.correct_answer,
        concept: q.concept,
        difficulty: q.difficulty,
        options,
        answeredCount,
        correctCount,
        accuracy,
        distribution,
        explanation: q.explanation,
        hint: q.hint
      };
    });

    // 3. Privacy-Safe Student Attempts (anonymized display names, NO private emails or credentials exposed)
    const rawAttempts = all(`
      SELECT
        id,
        user_id,
        student_name,
        score,
        total_questions,
        percentage,
        correct_count,
        incorrect_count,
        unanswered_count,
        time_taken,
        completed_at
      FROM attempts
      WHERE quiz_id = ?
      ORDER BY completed_at DESC
      LIMIT 100
    `, [quizId]);

    const studentAttempts = rawAttempts.map((att, idx) => {
      const mins = Math.floor(att.time_taken / 60);
      const secs = att.time_taken % 60;
      const durationStr = mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;

      // Safe Display Name: e.g. "Sarah M." or "Student #3"
      const displayName = att.student_name && att.student_name !== 'Anonymous Student'
        ? att.student_name
        : `Student #${rawAttempts.length - idx}`;

      return {
        id: att.id,
        studentName: displayName,
        score: att.score,
        totalQuestions: att.total_questions,
        percentage: Math.round(att.percentage),
        status: att.percentage >= 60 ? 'passed' : 'failed',
        timeTaken: att.time_taken,
        duration: durationStr,
        completedAt: att.completed_at
      };
    });

    // 4. Identified Weak Concepts for this Quiz
    const weakConcepts = questionAnalysis
      .filter((q) => q.answeredCount >= 1 && q.accuracy < 70)
      .map((q) => ({
        concept: q.concept,
        accuracy: q.accuracy,
        questionText: q.question
      }));

    return {
      quizId: quiz.id,
      title: quiz.title,
      subject: quiz.subject,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      isShared: Boolean(quiz.is_shared),
      shareCode: quiz.share_code,
      questionCount: questions.length,
      timeLimit: quiz.time_limit,
      totalAttempts,
      averageScore: avgPercentage,
      passRate,
      bestScore: Math.round(summary.best_percentage || 0),
      lowestScore: Math.round(summary.lowest_percentage || 0),
      averageDuration: Math.round(summary.avg_time_taken || 0),
      questions: questionAnalysis,
      studentAttempts,
      weakConcepts
    };
  }
}

module.exports = TeacherRepository;
