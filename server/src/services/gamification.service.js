/**
 * gamification.service.js
 *
 * Deterministic Gamification Engine for AI QuizForge.
 *
 * Implements:
 *  - Deterministic XP Calculation (strictly no fake rewards)
 *  - Level Progression & Bracket Calculations
 *  - Timezone-safe & Calendar-accurate Streak Engine (handles leap years, month crossings, same-day & skipped-day edge cases)
 *  - Achievement Badges & Milestone Progress Evaluation
 */

const BADGES = [
  {
    id: 'first_quiz',
    title: 'First Forge',
    description: 'Completed your first quiz attempt',
    icon: 'Trophy',
    category: 'Milestone',
    color: 'amber',
    target: 1,
    getProgress: (stats) => Math.min(1, stats.totalAttempts || 0),
    isUnlocked: (stats) => (stats.totalAttempts || 0) >= 1
  },
  {
    id: 'perfect_score',
    title: 'Perfectionist',
    description: 'Scored 100% on any quiz attempt',
    icon: 'Sparkles',
    category: 'Mastery',
    color: 'emerald',
    target: 100,
    getProgress: (stats, attempt) => (attempt?.percentage === 100 || (stats.bestScore || 0) === 100) ? 100 : (stats.bestScore || 0),
    isUnlocked: (stats, attempt) => (attempt?.percentage === 100 || (stats.bestScore || 0) >= 100)
  },
  {
    id: 'ten_quizzes',
    title: 'Quiz Veteran',
    description: 'Completed 10 total quizzes',
    icon: 'Award',
    category: 'Milestone',
    color: 'blue',
    target: 10,
    getProgress: (stats) => Math.min(10, stats.totalAttempts || 0),
    isUnlocked: (stats) => (stats.totalAttempts || 0) >= 10
  },
  {
    id: 'hundred_questions',
    title: 'Century Scholar',
    description: 'Answered 100 total questions',
    icon: 'BookOpen',
    category: 'Milestone',
    color: 'purple',
    target: 100,
    getProgress: (stats) => Math.min(100, stats.questionsAnswered || 0),
    isUnlocked: (stats) => (stats.questionsAnswered || 0) >= 100
  },
  {
    id: 'seven_day_streak',
    title: 'Dedication Master',
    description: 'Maintained a 7-day study streak',
    icon: 'Flame',
    category: 'Streak',
    color: 'red',
    target: 7,
    getProgress: (stats) => Math.min(7, Math.max(stats.currentStreak || 0, stats.bestStreak || 0)),
    isUnlocked: (stats) => Math.max(stats.currentStreak || 0, stats.bestStreak || 0) >= 7
  },
  {
    id: 'adaptive_learner',
    title: 'Adaptive Mind',
    description: 'Completed an adaptive practice session',
    icon: 'Zap',
    category: 'Learning',
    color: 'indigo',
    target: 1,
    getProgress: (stats, attempt) => ((stats.adaptiveAttempts || 0) > 0 || Boolean(attempt?.isAdaptive)) ? 1 : 0,
    isUnlocked: (stats, attempt) => (stats.adaptiveAttempts || 0) >= 1 || Boolean(attempt?.isAdaptive)
  },
  {
    id: 'speed_demon',
    title: 'Quick Thinker',
    description: 'Scored ≥80% on a quiz in under 60 seconds',
    icon: 'Clock',
    category: 'Speed',
    color: 'cyan',
    target: 1,
    getProgress: (stats, attempt) => (attempt && attempt.percentage >= 80 && attempt.timeTaken > 0 && attempt.timeTaken <= 60) ? 1 : ((stats.speedyAttempts || 0) > 0 ? 1 : 0),
    isUnlocked: (stats, attempt) => (stats.speedyAttempts || 0) >= 1 || Boolean(attempt && attempt.percentage >= 80 && attempt.timeTaken > 0 && attempt.timeTaken <= 60)
  },
  {
    id: 'calculation_guru',
    title: 'Math Magician',
    description: 'Scored 100% on a Numerical/Calculation quiz',
    icon: 'Target',
    category: 'Mastery',
    color: 'teal',
    target: 1,
    getProgress: (stats, attempt) => (attempt?.hasNumerical && attempt?.percentage === 100) ? 1 : ((stats.numericalPerfect || 0) > 0 ? 1 : 0),
    isUnlocked: (stats, attempt) => (stats.numericalPerfect || 0) >= 1 || Boolean(attempt?.hasNumerical && attempt?.percentage === 100)
  },
  {
    id: 'master_level',
    title: 'Ascended Scholar',
    description: 'Reached Level 5 or higher',
    icon: 'Crown',
    category: 'Level',
    color: 'yellow',
    target: 5,
    getProgress: (stats) => Math.min(5, stats.level || 1),
    isUnlocked: (stats) => (stats.level || 1) >= 5
  }
];

const LEVEL_TITLES = {
  1: 'Apprentice Scholar',
  2: 'Knowledge Seeker',
  3: 'Quiz Novice',
  4: 'Adept Forger',
  5: 'Master Mind',
  6: 'Grandmaster Sage',
  7: 'Legendary Luminary',
  8: 'Mythic Polymath'
};

class GamificationService {
  /**
   * Deterministically calculate XP earned from a quiz attempt.
   * Strictly prevents rewarding empty or fake activity.
   */
  static calculateEarnedXp({
    totalQuestions = 0,
    correctCount = 0,
    difficulty = 'medium',
    isAdaptive = false,
    percentage = 0,
    currentStreak = 0,
    answers = []
  } = {}) {
    // If no questions were present, 0 XP
    if (totalQuestions <= 0) {
      return {
        totalXp: 0,
        breakdown: { base: 0, correct: 0, difficultyBonus: 0, perfectBonus: 0, adaptiveBonus: 0, streakBonus: 0 }
      };
    }

    // Verify activity: if correctCount is 0 and 0 answers were given
    const hasActivity = correctCount > 0 || (Array.isArray(answers) && answers.some(a => a.selectedAnswer !== null && a.selectedAnswer !== undefined));
    if (!hasActivity && percentage === 0) {
      return {
        totalXp: 0,
        breakdown: { base: 0, correct: 0, difficultyBonus: 0, perfectBonus: 0, adaptiveBonus: 0, streakBonus: 0 }
      };
    }

    // 1. Base completion XP for finishing a quiz
    const base = 20;

    // 2. XP per correct answer based on question difficulty
    let perCorrect = 15;
    const diff = (difficulty || 'medium').toLowerCase();
    if (diff === 'easy') perCorrect = 10;
    else if (diff === 'hard') perCorrect = 25;
    else perCorrect = 15;

    const correctXp = correctCount * perCorrect;

    // 3. Perfect score bonus
    const perfectBonus = percentage === 100 && totalQuestions >= 3 ? 50 : 0;

    // 4. Adaptive practice bonus
    const adaptiveBonus = isAdaptive ? 30 : 0;

    // 5. Active streak bonus (5 XP per consecutive streak day, max 50 XP)
    const streakBonus = Math.min(Math.max(0, currentStreak) * 5, 50);

    const totalXp = base + correctXp + perfectBonus + adaptiveBonus + streakBonus;

    return {
      totalXp,
      breakdown: {
        base,
        correct: correctXp,
        difficultyBonus: perCorrect,
        perfectBonus,
        adaptiveBonus,
        streakBonus
      }
    };
  }

  /**
   * Calculate level and bracket progression from total XP.
   * Level L = floor(sqrt(totalXp / 100)) + 1
   */
  static calculateLevelProgress(totalXp = 0) {
    const safeXp = Math.max(0, parseInt(totalXp, 10) || 0);
    const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;

    const currentLevelBase = Math.pow(level - 1, 2) * 100;
    const nextLevelThreshold = Math.pow(level, 2) * 100;
    const bracketSize = nextLevelThreshold - currentLevelBase;
    const xpInLevel = safeXp - currentLevelBase;
    const xpNeeded = Math.max(0, nextLevelThreshold - safeXp);
    const progressPercent = bracketSize > 0
      ? Math.min(100, Math.max(0, Math.round((xpInLevel / bracketSize) * 100)))
      : 100;

    const title = LEVEL_TITLES[level] || (level >= 8 ? LEVEL_TITLES[8] : LEVEL_TITLES[6]);

    return {
      level,
      title,
      totalXp: safeXp,
      currentLevelBase,
      nextLevelThreshold,
      xpInLevel,
      xpNeeded,
      progressPercent
    };
  }

  /**
   * Normalize any Date/string to a UTC calendar date string: 'YYYY-MM-DD'.
   */
  static toUtcDateString(dateInput) {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  /**
   * Calculate UTC calendar day difference between two date strings 'YYYY-MM-DD'.
   */
  static getDaysDifference(dateStrA, dateStrB) {
    const [y1, m1, d1] = dateStrA.split('-').map(Number);
    const [y2, m2, d2] = dateStrB.split('-').map(Number);

    const utcA = Date.UTC(y1, m1 - 1, d1);
    const utcB = Date.UTC(y2, m2 - 1, d2);

    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((utcB - utcA) / msPerDay);
  }

  /**
   * Calculate consecutive date-based streak.
   * Handles edge cases:
   *  - Same day attempt: streak unchanged
   *  - Next consecutive day (diff === 1): streak + 1
   *  - Skipped day (diff >= 2): streak resets to 1
   *  - Month boundaries, leap years, year boundaries
   */
  static calculateDateStreak(lastActiveDateInput, currentDateInput = new Date(), currentStreak = 0, bestStreak = 0) {
    const todayStr = this.toUtcDateString(currentDateInput);
    const lastActiveStr = this.toUtcDateString(lastActiveDateInput);

    let newStreak = currentStreak;
    let newBestStreak = bestStreak;

    if (!lastActiveStr) {
      newStreak = 1;
      newBestStreak = Math.max(bestStreak, 1);
    } else {
      const diff = this.getDaysDifference(lastActiveStr, todayStr);

      if (diff === 0) {
        // Same calendar day: keep existing streak, ensure at least 1
        newStreak = Math.max(1, currentStreak);
      } else if (diff === 1) {
        // Consecutive next day
        newStreak = (currentStreak > 0 ? currentStreak : 0) + 1;
      } else if (diff > 1) {
        // Gap of 2 or more days: reset to 1
        newStreak = 1;
      } else {
        // Activity from earlier date (e.g. past record): keep current streak
        newStreak = Math.max(1, currentStreak);
      }
      newBestStreak = Math.max(bestStreak, newStreak);
    }

    return {
      currentStreak: newStreak,
      bestStreak: newBestStreak,
      lastActiveDate: todayStr
    };
  }

  /**
   * Evaluate all achievements against user statistics and current attempt.
   * Returns list of all badges with unlock status, progress percent, and newly unlocked badges.
   */
  static evaluateAchievements(userStats = {}, currentAttempt = null, currentlyUnlockedIds = []) {
    const unlockedSet = new Set(currentlyUnlockedIds);
    const newUnlocked = [];

    const badgeResults = BADGES.map((b) => {
      const wasAlreadyUnlocked = unlockedSet.has(b.id);
      const conditionMet = b.isUnlocked(userStats, currentAttempt);
      const isUnlocked = wasAlreadyUnlocked || conditionMet;
      const currentProgressValue = b.getProgress(userStats, currentAttempt);
      const progressPercent = b.target > 0
        ? Math.min(100, Math.round((currentProgressValue / b.target) * 100))
        : (isUnlocked ? 100 : 0);

      if (conditionMet && !wasAlreadyUnlocked) {
        newUnlocked.push(b);
      }

      return {
        id: b.id,
        title: b.title,
        description: b.description,
        icon: b.icon,
        category: b.category,
        color: b.color,
        target: b.target,
        currentProgress: currentProgressValue,
        progressPercent,
        isUnlocked,
        unlockedAt: isUnlocked ? (wasAlreadyUnlocked ? null : new Date().toISOString()) : null
      };
    });

    return {
      badges: badgeResults,
      newlyUnlocked: newUnlocked
    };
  }

  static getAllBadgeDefinitions() {
    return BADGES;
  }
}

module.exports = GamificationService;
