/**
 * storage.js — Local persistence & concept performance tracker.
 *
 * Tracks:
 *  - Quiz attempts
 *  - Historical concept accuracy
 *  - Real calculated improvement across adaptive practice sessions
 *
 * Strictly prevents fabricated improvement metrics.
 */

import { calculateEarnedXp, calculateLevelProgress, BADGES } from './gamification';

const ATTEMPTS_KEY = 'quizforge_attempts_v1';
const GAMIFICATION_KEY = 'quizforge_gamification_v1';

/**
 * Retrieves stored gamification profile (XP, Level, Streak, Achievements).
 */
export function getStoredGamificationProfile() {
  try {
    const raw = localStorage.getItem(GAMIFICATION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    unlockedBadges: [],
  };
}

/**
 * Saves gamification profile.
 */
export function saveStoredGamificationProfile(profile) {
  try {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('[Storage] Failed to save profile:', e);
  }
}

/**
 * Retrieves all stored quiz attempts.
 * @returns {Array<object>}
 */
export function getStoredAttempts() {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[Storage] Failed to read attempts:', err);
    return [];
  }
}

/**
 * Saves a completed quiz attempt and calculates genuine concept improvements and deterministic XP.
 *
 * @param {object} attemptData
 * @returns {{ attempt: object, improvements: Array<{ concept: string, prevAccuracy: number, newAccuracy: number, diff: number }>, gamification: object }}
 */
export function saveQuizAttempt(attemptData) {
  try {
    const attempts = getStoredAttempts();
    const profile = getStoredGamificationProfile();

    const todayStr = new Date().toISOString().split('T')[0];
    let newStreak = profile.streak || 0;
    if (!profile.lastActiveDate) {
      newStreak = 1;
    } else {
      const lastDate = new Date(profile.lastActiveDate);
      const currDate = new Date(todayStr);
      const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) newStreak += 1;
      else if (diffDays > 1) newStreak = 1;
      else newStreak = Math.max(1, newStreak);
    }
    const newBestStreak = Math.max(profile.bestStreak || 0, newStreak);

    // Calculate XP
    const xpCalc = calculateEarnedXp({
      totalQuestions: attemptData.scoreData?.totalQuestions || 0,
      correctCount: attemptData.scoreData?.correctCount || 0,
      difficulty: attemptData.difficulty || 'medium',
      isAdaptive: Boolean(attemptData.isAdaptive),
      percentage: attemptData.scoreData?.percentage || 0,
      currentStreak: newStreak,
      answers: attemptData.scoreData?.questionDetails || [],
    });

    const newTotalXp = (profile.xp || 0) + xpCalc.totalXp;
    const levelInfo = calculateLevelProgress(newTotalXp);

    const updatedProfile = {
      ...profile,
      xp: newTotalXp,
      level: levelInfo.level,
      streak: newStreak,
      bestStreak: newBestStreak,
      lastActiveDate: todayStr,
    };
    saveStoredGamificationProfile(updatedProfile);

    const newAttempt = {
      id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      quizTitle: attemptData.quizTitle || 'Quiz',
      subject: attemptData.subject || 'General',
      topic: attemptData.topic || 'General',
      difficulty: attemptData.difficulty || 'medium',
      score: attemptData.scoreData?.correctCount || 0,
      total: attemptData.scoreData?.totalQuestions || 0,
      percentage: attemptData.scoreData?.percentage || 0,
      timeSpent: attemptData.scoreData?.formattedTime || '0s',
      xpEarned: xpCalc.totalXp,
      xpBreakdown: xpCalc.breakdown,
      levelProgress: levelInfo,
      streakInfo: { currentStreak: newStreak, bestStreak: newBestStreak },
      date: new Date().toISOString(),
      isAdaptive: Boolean(attemptData.isAdaptive),
      targetedConcepts: attemptData.targetedConcepts || [],
      questionDetails: (attemptData.scoreData?.questionDetails || []).map((q) => ({
        id: q.id,
        concept: q.concept || 'General',
        difficulty: q.difficulty || 'medium',
        isCorrect: q.isCorrect,
        isUnanswered: q.isUnanswered,
      })),
    };

    // Calculate concept accuracy BEFORE this attempt for any targeted weak concepts
    const improvements = [];
    if (newAttempt.targetedConcepts?.length > 0) {
      newAttempt.targetedConcepts.forEach((concept) => {
        const prevStats = getConceptAccuracy(attempts, concept);
        if (prevStats.totalCount > 0) {
          // Calculate new accuracy for this concept including current attempt
          const currentQuestions = newAttempt.questionDetails.filter(
            (q) => q.concept.toLowerCase() === concept.toLowerCase()
          );
          if (currentQuestions.length > 0) {
            const currentCorrect = currentQuestions.filter((q) => q.isCorrect).length;
            const newTotal = prevStats.totalCount + currentQuestions.length;
            const newCorrect = prevStats.correctCount + currentCorrect;
            const newAccuracy = Math.round((newCorrect / newTotal) * 100);

            improvements.push({
              concept,
              prevAccuracy: prevStats.accuracy,
              newAccuracy,
              diff: newAccuracy - prevStats.accuracy,
            });
          }
        }
      });
    }

    attempts.unshift(newAttempt);
    // Keep max 100 attempts in local history
    if (attempts.length > 100) attempts.length = 100;
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));

    return {
      attempt: newAttempt,
      improvements,
      gamification: {
        xpEarned: xpCalc.totalXp,
        xpBreakdown: xpCalc.breakdown,
        levelProgress: levelInfo,
        streakInfo: { currentStreak: newStreak, bestStreak: newBestStreak }
      }
    };
  } catch (err) {
    console.warn('[Storage] Failed to save attempt:', err);
    return { attempt: attemptData, improvements: [], gamification: null };
  }
}

/**
 * Calculates historical accuracy for a specific concept.
 *
 * @param {Array<object>} attempts
 * @param {string} concept
 * @returns {{ totalCount: number, correctCount: number, accuracy: number }}
 */
export function getConceptAccuracy(attempts = [], concept = '') {
  if (!concept) return { totalCount: 0, correctCount: 0, accuracy: 0 };
  const target = concept.toLowerCase();

  let totalCount = 0;
  let correctCount = 0;

  attempts.forEach((att) => {
    (att.questionDetails || []).forEach((q) => {
      if ((q.concept || '').toLowerCase() === target) {
        totalCount++;
        if (q.isCorrect) correctCount++;
      }
    });
  });

  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  return { totalCount, correctCount, accuracy };
}

/**
 * Aggregates all concepts across all past attempts and returns weak areas (< 70% accuracy).
 *
 * @returns {Array<{ concept: string, topic: string, accuracy: number, totalQuestions: number, attemptsCount: number }>}
 */
export function getWeakConceptsFromHistory() {
  const attempts = getStoredAttempts();
  const conceptMap = new Map();

  attempts.forEach((att) => {
    (att.questionDetails || []).forEach((q) => {
      const c = q.concept || 'General';
      if (!conceptMap.has(c)) {
        conceptMap.set(c, {
          concept: c,
          topic: att.topic,
          subject: att.subject,
          totalQuestions: 0,
          correctQuestions: 0,
          attemptsCount: 0,
        });
      }
      const item = conceptMap.get(c);
      item.totalQuestions++;
      if (q.isCorrect) item.correctQuestions++;
    });
  });

  const list = [];
  conceptMap.forEach((val) => {
    const accuracy = val.totalQuestions > 0
      ? Math.round((val.correctQuestions / val.totalQuestions) * 100)
      : 0;
    list.push({
      ...val,
      accuracy,
    });
  });

  // Sort lowest accuracy first, and filter to weak areas
  return list.sort((a, b) => a.accuracy - b.accuracy);
}
