/**
 * test-gamification.js
 *
 * Automated verification test suite for AI QuizForge Step 15 Gamification System.
 * Tests:
 *  1. Deterministic XP calculations (verifying strictly no fake activity rewards)
 *  2. Level & threshold progressions
 *  3. Streak engine with strict date calculations & edge cases (consecutive, same-day, skipped, month/year crossings)
 *  4. Achievement & milestone evaluation triggers
 */

const assert = require('assert');
const GamificationService = require('./src/services/gamification.service');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

console.log('🧪 Running Gamification Engine Automated Test Suite...\n');

// ── 1. DETERMINISTIC XP CALCULATION TESTS ─────────────────────────────────
console.log('--- 1. Deterministic XP Calculations ---');

test('No questions or empty activity returns 0 XP (no fake rewards)', () => {
  const xp0 = GamificationService.calculateEarnedXp({ totalQuestions: 0, correctCount: 0, percentage: 0 });
  assert.strictEqual(xp0.totalXp, 0);

  const xpEmpty = GamificationService.calculateEarnedXp({ totalQuestions: 5, correctCount: 0, percentage: 0, answers: [] });
  assert.strictEqual(xpEmpty.totalXp, 0);
});

test('Base completed quiz with answers earns deterministic XP', () => {
  // 5 questions, 3 correct, medium difficulty
  // Base (20) + 3 * 15 (45) = 65 XP
  const res = GamificationService.calculateEarnedXp({
    totalQuestions: 5,
    correctCount: 3,
    difficulty: 'medium',
    percentage: 60,
    answers: [{ selectedAnswer: 'A' }]
  });
  assert.strictEqual(res.totalXp, 65);
  assert.strictEqual(res.breakdown.base, 20);
  assert.strictEqual(res.breakdown.correct, 45);
});

test('Difficulty multiplier scales XP per correct answer (Easy: 10, Medium: 15, Hard: 25)', () => {
  const easy = GamificationService.calculateEarnedXp({ totalQuestions: 4, correctCount: 4, difficulty: 'easy', percentage: 100 });
  // Base (20) + 4 * 10 (40) + Perfect (50) = 110 XP
  assert.strictEqual(easy.totalXp, 110);

  const hard = GamificationService.calculateEarnedXp({ totalQuestions: 4, correctCount: 4, difficulty: 'hard', percentage: 100 });
  // Base (20) + 4 * 25 (100) + Perfect (50) = 170 XP
  assert.strictEqual(hard.totalXp, 170);
});

test('Adaptive Practice Bonus awards +30 XP', () => {
  const normal = GamificationService.calculateEarnedXp({ totalQuestions: 5, correctCount: 5, difficulty: 'medium', percentage: 100, isAdaptive: false });
  const adaptive = GamificationService.calculateEarnedXp({ totalQuestions: 5, correctCount: 5, difficulty: 'medium', percentage: 100, isAdaptive: true });
  assert.strictEqual(adaptive.totalXp - normal.totalXp, 30);
  assert.strictEqual(adaptive.breakdown.adaptiveBonus, 30);
});

test('Streak bonus awards 5 XP per consecutive day up to 50 XP max', () => {
  const streak3 = GamificationService.calculateEarnedXp({ totalQuestions: 5, correctCount: 3, difficulty: 'medium', currentStreak: 3, answers: [{ selectedAnswer: 'A' }] });
  assert.strictEqual(streak3.breakdown.streakBonus, 15);

  const streak15 = GamificationService.calculateEarnedXp({ totalQuestions: 5, correctCount: 3, difficulty: 'medium', currentStreak: 15, answers: [{ selectedAnswer: 'A' }] });
  assert.strictEqual(streak15.breakdown.streakBonus, 50); // Capped at 50 XP
});

// ── 2. LEVEL & BRACKET PROGRESSION TESTS ─────────────────────────────────
console.log('\n--- 2. Level Progression & Thresholds ---');

test('Level 1 bracket: 0 - 99 XP', () => {
  const lvl0 = GamificationService.calculateLevelProgress(0);
  assert.strictEqual(lvl0.level, 1);
  assert.strictEqual(lvl0.title, 'Apprentice Scholar');
  assert.strictEqual(lvl0.xpInLevel, 0);
  assert.strictEqual(lvl0.xpNeeded, 100);
  assert.strictEqual(lvl0.progressPercent, 0);

  const lvl50 = GamificationService.calculateLevelProgress(50);
  assert.strictEqual(lvl50.level, 1);
  assert.strictEqual(lvl50.xpInLevel, 50);
  assert.strictEqual(lvl50.xpNeeded, 50);
  assert.strictEqual(lvl50.progressPercent, 50);
});

test('Level 2 bracket: 100 - 399 XP', () => {
  const lvl100 = GamificationService.calculateLevelProgress(100);
  assert.strictEqual(lvl100.level, 2);
  assert.strictEqual(lvl100.title, 'Knowledge Seeker');
  assert.strictEqual(lvl100.currentLevelBase, 100);
  assert.strictEqual(lvl100.nextLevelThreshold, 400);
  assert.strictEqual(lvl100.xpInLevel, 0);
  assert.strictEqual(lvl100.xpNeeded, 300);
  assert.strictEqual(lvl100.progressPercent, 0);

  const lvl250 = GamificationService.calculateLevelProgress(250);
  assert.strictEqual(lvl250.level, 2);
  assert.strictEqual(lvl250.xpInLevel, 150);
  assert.strictEqual(lvl250.progressPercent, 50);
});

test('Level 3 bracket (400 XP) and Level 5 bracket (1600 XP)', () => {
  const lvl400 = GamificationService.calculateLevelProgress(400);
  assert.strictEqual(lvl400.level, 3);
  assert.strictEqual(lvl400.title, 'Quiz Novice');

  const lvl1600 = GamificationService.calculateLevelProgress(1600);
  assert.strictEqual(lvl1600.level, 5);
  assert.strictEqual(lvl1600.title, 'Master Mind');

  const lvl2500 = GamificationService.calculateLevelProgress(2500);
  assert.strictEqual(lvl2500.level, 6);
  assert.strictEqual(lvl2500.title, 'Grandmaster Sage');
});

// ── 3. DATE-BASED STREAK CALCULATION & EDGE CASES ────────────────────────
console.log('\n--- 3. Streak Calculations & Calendar Edge Cases ---');

test('First ever attempt sets streak = 1', () => {
  const res = GamificationService.calculateDateStreak(null, '2026-09-27', 0, 0);
  assert.strictEqual(res.currentStreak, 1);
  assert.strictEqual(res.bestStreak, 1);
  assert.strictEqual(res.lastActiveDate, '2026-09-27');
});

test('Multiple attempts on the SAME calendar day maintain the same streak', () => {
  const res1 = GamificationService.calculateDateStreak('2026-09-27', '2026-09-27', 3, 5);
  assert.strictEqual(res1.currentStreak, 3);
  assert.strictEqual(res1.bestStreak, 5);
});

test('Consecutive day attempt increments streak by 1', () => {
  const res = GamificationService.calculateDateStreak('2026-09-26', '2026-09-27', 4, 4);
  assert.strictEqual(res.currentStreak, 5);
  assert.strictEqual(res.bestStreak, 5);
  assert.strictEqual(res.lastActiveDate, '2026-09-27');
});

test('Gap of 2 or more days resets streak to 1', () => {
  const res = GamificationService.calculateDateStreak('2026-09-24', '2026-09-27', 6, 8);
  assert.strictEqual(res.currentStreak, 1);
  assert.strictEqual(res.bestStreak, 8); // Best streak preserved!
});

test('Month transition: consecutive days across month boundary increment streak', () => {
  const janToFeb = GamificationService.calculateDateStreak('2026-01-31', '2026-02-01', 5, 5);
  assert.strictEqual(janToFeb.currentStreak, 6);

  const marToApr = GamificationService.calculateDateStreak('2026-03-31', '2026-04-01', 10, 10);
  assert.strictEqual(marToApr.currentStreak, 11);
});

test('Leap year transition: Feb 28 -> Feb 29 -> March 1 (in leap year 2024)', () => {
  const leapDay1 = GamificationService.calculateDateStreak('2024-02-28', '2024-02-29', 2, 2);
  assert.strictEqual(leapDay1.currentStreak, 3);

  const leapDay2 = GamificationService.calculateDateStreak('2024-02-29', '2024-03-01', 3, 3);
  assert.strictEqual(leapDay2.currentStreak, 4);
});

test('Year transition: Dec 31 to Jan 01 increments streak', () => {
  const yearCross = GamificationService.calculateDateStreak('2026-12-31', '2027-01-01', 14, 14);
  assert.strictEqual(yearCross.currentStreak, 15);
  assert.strictEqual(yearCross.bestStreak, 15);
});

// ── 4. ACHIEVEMENTS & MILESTONES EVALUATION TESTS ─────────────────────────
console.log('\n--- 4. Achievements & Milestones ---');

test('First Quiz badge unlocks on 1st completed attempt', () => {
  const stats = { totalAttempts: 1, bestScore: 70, questionsAnswered: 10, currentStreak: 1 };
  const res = GamificationService.evaluateAchievements(stats, { percentage: 70 }, []);
  const firstQuizBadge = res.badges.find(b => b.id === 'first_quiz');
  assert.strictEqual(firstQuizBadge.isUnlocked, true);
  assert.strictEqual(res.newlyUnlocked.some(b => b.id === 'first_quiz'), true);
});

test('Perfect Score badge unlocks when scoring 100%', () => {
  const stats = { totalAttempts: 2, bestScore: 100, questionsAnswered: 20, currentStreak: 1 };
  const res = GamificationService.evaluateAchievements(stats, { percentage: 100 }, ['first_quiz']);
  const perfectBadge = res.badges.find(b => b.id === 'perfect_score');
  assert.strictEqual(perfectBadge.isUnlocked, true);
  assert.strictEqual(res.newlyUnlocked.some(b => b.id === 'perfect_score'), true);
});

test('7-Day Streak badge unlocks when streak reaches 7', () => {
  const stats = { totalAttempts: 7, currentStreak: 7, bestStreak: 7, questionsAnswered: 70 };
  const res = GamificationService.evaluateAchievements(stats, null, ['first_quiz']);
  const streakBadge = res.badges.find(b => b.id === 'seven_day_streak');
  assert.strictEqual(streakBadge.isUnlocked, true);
  assert.strictEqual(streakBadge.progressPercent, 100);
});

test('Adaptive Learner badge unlocks on completing adaptive practice', () => {
  const stats = { totalAttempts: 3, adaptiveAttempts: 1 };
  const res = GamificationService.evaluateAchievements(stats, { isAdaptive: true }, ['first_quiz']);
  const adaptiveBadge = res.badges.find(b => b.id === 'adaptive_learner');
  assert.strictEqual(adaptiveBadge.isUnlocked, true);
});

test('Quick Thinker (speed demon) unlocks with score >= 80% and time <= 60s', () => {
  const stats = { totalAttempts: 3 };
  const res = GamificationService.evaluateAchievements(stats, { percentage: 85, timeTaken: 45 }, []);
  const speedBadge = res.badges.find(b => b.id === 'speed_demon');
  assert.strictEqual(speedBadge.isUnlocked, true);
});

test('Math Magician unlocks on 100% score with numerical questions', () => {
  const stats = { totalAttempts: 4 };
  const res = GamificationService.evaluateAchievements(stats, { hasNumerical: true, percentage: 100 }, []);
  const mathBadge = res.badges.find(b => b.id === 'calculation_guru');
  assert.strictEqual(mathBadge.isUnlocked, true);
});

test('Ascended Scholar unlocks at Level 5', () => {
  const statsLvl4 = { totalAttempts: 15, level: 4 };
  const res4 = GamificationService.evaluateAchievements(statsLvl4, null, []);
  assert.strictEqual(res4.badges.find(b => b.id === 'master_level').isUnlocked, false);

  const statsLvl5 = { totalAttempts: 25, level: 5 };
  const res5 = GamificationService.evaluateAchievements(statsLvl5, null, []);
  assert.strictEqual(res5.badges.find(b => b.id === 'master_level').isUnlocked, true);
});

console.log(`\n========================================`);
console.log(`Gamification Test Summary: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
