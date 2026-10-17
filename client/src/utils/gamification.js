/**
 * gamification.js
 *
 * Client-side Gamification utility mirroring backend deterministic calculations.
 * Supports XP, Levels, Streaks, Achievements, and Milestones.
 */

export const LEVEL_TITLES = {
  1: 'Apprentice Scholar',
  2: 'Knowledge Seeker',
  3: 'Quiz Novice',
  4: 'Adept Forger',
  5: 'Master Mind',
  6: 'Grandmaster Sage',
  7: 'Legendary Luminary',
  8: 'Mythic Polymath',
};

export const BADGES = [
  {
    id: 'first_quiz',
    title: 'First Forge',
    description: 'Completed your first quiz attempt',
    icon: 'Trophy',
    category: 'Milestone',
    color: 'amber',
    target: 1,
  },
  {
    id: 'perfect_score',
    title: 'Perfectionist',
    description: 'Scored 100% on any quiz attempt',
    icon: 'Sparkles',
    category: 'Mastery',
    color: 'emerald',
    target: 100,
  },
  {
    id: 'ten_quizzes',
    title: 'Quiz Veteran',
    description: 'Completed 10 total quizzes',
    icon: 'Award',
    category: 'Milestone',
    color: 'blue',
    target: 10,
  },
  {
    id: 'hundred_questions',
    title: 'Century Scholar',
    description: 'Answered 100 total questions',
    icon: 'BookOpen',
    category: 'Milestone',
    color: 'purple',
    target: 100,
  },
  {
    id: 'seven_day_streak',
    title: 'Dedication Master',
    description: 'Maintained a 7-day study streak',
    icon: 'Flame',
    category: 'Streak',
    color: 'red',
    target: 7,
  },
  {
    id: 'adaptive_learner',
    title: 'Adaptive Mind',
    description: 'Completed an adaptive practice session',
    icon: 'Zap',
    category: 'Learning',
    color: 'indigo',
    target: 1,
  },
  {
    id: 'speed_demon',
    title: 'Quick Thinker',
    description: 'Scored ≥80% on a quiz in under 60 seconds',
    icon: 'Clock',
    category: 'Speed',
    color: 'cyan',
    target: 1,
  },
  {
    id: 'calculation_guru',
    title: 'Math Magician',
    description: 'Scored 100% on a Numerical/Calculation quiz',
    icon: 'Target',
    category: 'Mastery',
    color: 'teal',
    target: 1,
  },
  {
    id: 'master_level',
    title: 'Ascended Scholar',
    description: 'Reached Level 5 or higher',
    icon: 'Crown',
    category: 'Level',
    color: 'yellow',
    target: 5,
  },
];

/**
 * Calculates deterministic level progression from total XP.
 */
export function calculateLevelProgress(totalXp = 0) {
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
    progressPercent,
  };
}

/**
 * Deterministically calculate XP earned from a quiz attempt.
 */
export function calculateEarnedXp({
  totalQuestions = 0,
  correctCount = 0,
  difficulty = 'medium',
  isAdaptive = false,
  percentage = 0,
  currentStreak = 0,
  answers = [],
} = {}) {
  if (totalQuestions <= 0) {
    return {
      totalXp: 0,
      breakdown: { base: 0, correct: 0, difficultyBonus: 0, perfectBonus: 0, adaptiveBonus: 0, streakBonus: 0 },
    };
  }

  const hasActivity = correctCount > 0 || (Array.isArray(answers) && answers.some((a) => a.selectedAnswer !== null && a.selectedAnswer !== undefined));
  if (!hasActivity && percentage === 0) {
    return {
      totalXp: 0,
      breakdown: { base: 0, correct: 0, difficultyBonus: 0, perfectBonus: 0, adaptiveBonus: 0, streakBonus: 0 },
    };
  }

  const base = 20;

  let perCorrect = 15;
  const diff = (difficulty || 'medium').toLowerCase();
  if (diff === 'easy') perCorrect = 10;
  else if (diff === 'hard') perCorrect = 25;
  else perCorrect = 15;

  const correctXp = correctCount * perCorrect;
  const perfectBonus = percentage === 100 && totalQuestions >= 3 ? 50 : 0;
  const adaptiveBonus = isAdaptive ? 30 : 0;
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
      streakBonus,
    },
  };
}
