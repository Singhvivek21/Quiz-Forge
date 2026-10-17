/**
 * QuizResults.jsx
 *
 * Polished, comprehensive quiz results screen with AI-Powered Performance Analysis
 * and Adaptive Practice integration.
 *
 * Features:
 *  - 🏆 Final Score & Percentage (Application's authoritative calculation)
 *  - 📈 Adaptive Concept Improvement Banner (when backed by real stored history)
 *  - Breakdown: Correct, Incorrect, Unanswered, Time Spent
 *  - ✨ "AI Learning Analysis" Section:
 *      • Overall Assessment
 *      • Strong Areas
 *      • Needs Practice
 *      • Difficulty Level Insights
 *      • Recommended Next Steps & Difficulty
 *      • Concrete Actionable Study Suggestions
 *  - Action Buttons: "Try Again", "Practice My Weak Areas", "Back to Dashboard", "Review Answers"
 *  - Interactive Question-by-Question Review with filters (All, Incorrect, Unanswered, Correct)
 *  - Graceful AI fallback / retry state if network or API has transient issues
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, CheckCircle2, XCircle, HelpCircle, Clock,
  RotateCcw, Target, LayoutDashboard, ChevronDown, ChevronUp,
  Sparkles, BookOpen, AlertCircle, ArrowUpRight, Filter,
  Lightbulb, MessageSquare, Brain, Compass, ArrowRight,
  TrendingUp, RefreshCw, Layers, Zap, Flame, Award, Crown
} from 'lucide-react';
import Button from './Button';
import Card from './Card';
import Badge from './Badge';
import { analyzePerformance } from '../../services/api';

const DIFFICULTY_COLOURS = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
  mixed: 'brand',
};

export default function QuizResults({
  quiz,
  scoreData,
  scoreResult,
  improvements = [],
  gamification = null,
  onTryAgain,
  onRetry,
  onPracticeWeakAreas,
  onAdaptivePractice,
  onPracticeRecommendedTopic,
  isAdaptiveLoading = false,
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all' | 'incorrect' | 'unanswered' | 'correct'
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const reviewRef = useRef(null);

  // AI Learning Analysis states
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState(null);

  const activeScoreData = scoreData || scoreResult || {};
  const handleTryAgain = onTryAgain || onRetry;
  const handlePracticeWeak = onPracticeWeakAreas || onAdaptivePractice;

  const {
    percentage = 0,
    correctCount = 0,
    incorrectCount = 0,
    unansweredCount = 0,
    totalQuestions = quiz?.questions?.length || 0,
    scoreFraction = '0/0',
    formattedTime = '0:00',
    performanceTier = { title: 'Quiz Completed', subtitle: 'Great effort!', bannerBg: 'from-brand-600 to-indigo-700' },
    questionDetails = [],
    weakConcepts = [],
  } = activeScoreData;

  // ── Fetch AI Analysis on Mount ──────────────────────────────────────────
  const fetchAnalysis = async () => {
    if (!quiz || !activeScoreData || Object.keys(activeScoreData).length === 0) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const payload = {
        subject: quiz.subject,
        topic: quiz.topic,
        scoreData: activeScoreData,
        questions: quiz.questions,
      };
      const res = await analyzePerformance(payload);
      if (res.success && res.data) {
        setAnalysis(res.data);
      } else {
        throw new Error(res.error || 'Unable to retrieve AI analysis.');
      }
    } catch (err) {
      console.warn('[QuizResults] AI Analysis fetch warning:', err.message);
      setAnalysisError(err.message || 'AI analysis temporarily unavailable.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [quiz, scoreData, scoreResult]);

  const toggleExpand = (qid) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qid]: !prev[qid],
    }));
  };

  const scrollToReview = () => {
    if (reviewRef.current) {
      reviewRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter questions
  const filteredQuestions = questionDetails.filter((q) => {
    if (filter === 'incorrect') return q.isIncorrect;
    if (filter === 'unanswered') return q.isUnanswered;
    if (filter === 'correct') return q.isCorrect;
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* ── 🏆 HERO SCORE BANNER ─────────────────────────────────────────── */}
      <div
        className={`rounded-3xl bg-gradient-to-br ${performanceTier.bannerBg} text-white p-8 sm:p-10 shadow-xl relative overflow-hidden`}
      >
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          {/* Left: Summary Title */}
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
              <Sparkles size={13} />
              {quiz.isAdaptive ? '⚡ Adaptive Practice Completed' : 'Quiz Completed'} • {quiz.subject}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {performanceTier.title}
            </h1>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              {performanceTier.subtitle}
            </p>
            <p className="text-white/60 text-xs pt-1">
              Topic: <span className="text-white/90 font-medium">{quiz.topic}</span>
            </p>
          </div>

          {/* Right: Circular Score Display */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-inner min-w-[200px]">
            <span className="text-xs font-semibold tracking-wider uppercase text-white/70 mb-1">
              Final Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl sm:text-6xl font-black tracking-tight">{percentage}</span>
              <span className="text-2xl sm:text-3xl font-bold text-white/80">%</span>
            </div>
            <div className="mt-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold text-white">
              {scoreFraction} Correct
            </div>
          </div>
        </div>
      </div>

      {/* ── 📈 REAL ADAPTIVE IMPROVEMENT BANNER (if backed by historical data) ─ */}
      {improvements && improvements.length > 0 && (
        <Card className="p-5 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 shadow-sm animate-slide-up">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm flex-shrink-0 mt-0.5">
              <TrendingUp size={20} />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-emerald-950">
                  Concept Mastery Progression
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verified Data
                </span>
              </div>
              <div className="space-y-1.5">
                {improvements.map((imp) => (
                  <div
                    key={imp.concept}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-xl bg-white/90 border border-emerald-200 text-xs"
                  >
                    <span className="font-semibold text-slate-800 truncate">
                      {imp.concept}
                    </span>
                    <div className="flex items-center gap-2 font-bold flex-shrink-0">
                      <span className="text-slate-500 font-normal">
                        Your performance on this concept:
                      </span>
                      <span className="text-slate-600">{imp.prevAccuracy}%</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-emerald-700 font-extrabold text-sm">
                        {imp.newAccuracy}%
                      </span>
                      {imp.diff > 0 && (
                        <span className="text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                          +{imp.diff}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── 🏆 NEW ACHIEVEMENTS UNLOCKED BANNER ─────────────────────────── */}
      {gamification?.newAchievements && gamification.newAchievements.length > 0 && (
        <div className="space-y-3 animate-slide-up">
          {gamification.newAchievements.map((badge) => (
            <Card
              key={badge.id}
              className="p-5 border-amber-300 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl flex-shrink-0 shadow-inner">
                  <Award size={28} className="text-amber-100 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-1">
                    <Sparkles size={12} /> Achievement Unlocked!
                  </div>
                  <h3 className="text-lg font-black tracking-tight">{badge.title}</h3>
                  <p className="text-xs text-white/90">{badge.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── ⚡ GAMIFICATION XP & LEVEL PROGRESSION ───────────────────────── */}
      {gamification && (
        <Card className="p-6 border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 shadow-sm animate-slide-up">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: XP Earned & Breakdown */}
            <div className="space-y-3 max-w-md">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                  <Zap size={14} className="text-indigo-600" />
                  Activity Rewards
                </span>
                {gamification.streakInfo?.currentStreak > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold">
                    <Flame size={13} className="text-orange-600" />
                    {gamification.streakInfo.currentStreak}-Day Streak
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-950">+{gamification.xpEarned || 0}</span>
                  <span className="text-sm font-bold text-indigo-600">XP Earned</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculated deterministically from completed quiz questions and accuracy.
                </p>
              </div>

              {/* XP Breakdown Chips */}
              {gamification.xpBreakdown && (
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                  {gamification.xpBreakdown.base > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                      Base: +{gamification.xpBreakdown.base} XP
                    </span>
                  )}
                  {gamification.xpBreakdown.correct > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">
                      Correct Answers: +{gamification.xpBreakdown.correct} XP
                    </span>
                  )}
                  {gamification.xpBreakdown.perfectBonus > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                      🌟 Perfect Score: +{gamification.xpBreakdown.perfectBonus} XP
                    </span>
                  )}
                  {gamification.xpBreakdown.adaptiveBonus > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold">
                      ⚡ Adaptive Practice: +{gamification.xpBreakdown.adaptiveBonus} XP
                    </span>
                  )}
                  {gamification.xpBreakdown.streakBonus > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold">
                      🔥 Streak Bonus: +{gamification.xpBreakdown.streakBonus} XP
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Level Progression Bar */}
            {gamification.levelProgress && (
              <div className="lg:w-72 bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Crown size={16} className="text-amber-500" />
                    <span className="text-xs font-extrabold text-slate-900">
                      Level {gamification.levelProgress.level}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {gamification.levelProgress.title}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-brand-500 rounded-full transition-all duration-500"
                      style={{ width: `${gamification.levelProgress.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>{gamification.levelProgress.totalXp} Total XP</span>
                    <span>{gamification.levelProgress.xpNeeded} XP to Lvl {gamification.levelProgress.level + 1}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── 📊 METRIC CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Correct */}
        <Card className="flex items-center gap-3.5 p-4 border-emerald-100 bg-emerald-50/50">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Correct</p>
            <p className="text-xl font-bold text-emerald-700">{correctCount}</p>
          </div>
        </Card>

        {/* Incorrect */}
        <Card className="flex items-center gap-3.5 p-4 border-red-100 bg-red-50/50">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <XCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Incorrect</p>
            <p className="text-xl font-bold text-red-700">{incorrectCount}</p>
          </div>
        </Card>

        {/* Unanswered */}
        <Card className="flex items-center gap-3.5 p-4 border-amber-100 bg-amber-50/50">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <HelpCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Unanswered</p>
            <p className="text-xl font-bold text-amber-700">{unansweredCount}</p>
          </div>
        </Card>

        {/* Time Spent */}
        <Card className="flex items-center gap-3.5 p-4 border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Time Spent</p>
            <p className="text-xl font-bold text-slate-800">{formattedTime}</p>
          </div>
        </Card>
      </div>

      {/* ── ✨ AI LEARNING ANALYSIS SECTION ───────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-600 text-white shadow-sm">
              <Brain size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                AI Learning Analysis
                <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                  Gemini AI
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Personalized insights and pedagogical study suggestions based on your attempt.
              </p>
            </div>
          </div>

          {!analysisLoading && (
            <Button
              variant="ghost"
              size="xs"
              onClick={fetchAnalysis}
              className="text-slate-500 hover:text-brand-600"
            >
              <RefreshCw size={13} /> Refresh Analysis
            </Button>
          )}
        </div>

        {/* Loading state */}
        {analysisLoading && (
          <Card className="p-6 border-brand-100 bg-gradient-to-br from-brand-50/30 to-purple-50/20 animate-pulse space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-brand-500 animate-spin" />
              <p className="text-sm font-semibold text-brand-900">
                Analyzing your responses and formulating study advice…
              </p>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-brand-100/60 rounded-md w-3/4" />
              <div className="h-4 bg-brand-100/40 rounded-md w-1/2" />
            </div>
          </Card>
        )}

        {/* Error state */}
        {!analysisLoading && analysisError && (
          <Card className="p-5 border-amber-200 bg-amber-50/70">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2.5">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">AI Analysis Notice</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {analysisError} — You can still review your questions and practice weak areas below.
                  </p>
                </div>
              </div>
              <Button size="xs" variant="secondary" onClick={fetchAnalysis}>
                <RefreshCw size={12} /> Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Loaded Analysis Content */}
        {!analysisLoading && analysis && (
          <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
            {/* 1. Overall Assessment */}
            <Card className="md:col-span-2 p-6 border-brand-200/80 bg-gradient-to-br from-brand-50/40 via-white to-purple-50/30 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-brand-800 font-bold text-sm">
                <Sparkles size={16} className="text-brand-600" />
                <span>Overall Assessment</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-normal">
                {analysis.overallAssessment}
              </p>
            </Card>

            {/* 2. Strong Areas */}
            <Card className="p-5 border-emerald-200/70 bg-emerald-50/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Strong Areas</span>
              </div>
              {analysis.strongConcepts?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.strongConcepts.map((concept) => (
                    <span
                      key={concept}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs"
                    >
                      ✓ {concept}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Keep practicing to build consistent strength across core concepts.
                </p>
              )}
            </Card>

            {/* 3. Needs Practice / Weak Concepts */}
            <Card className="p-5 border-amber-200/70 bg-amber-50/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Target size={16} className="text-amber-600" />
                <span>Needs Practice</span>
              </div>
              {analysis.weakConcepts?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.weakConcepts.map((concept) => (
                    <span
                      key={concept}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                    >
                      ⚠️ {concept}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-700 font-medium">
                  🎉 Fantastic! No significant knowledge gaps detected on this attempt.
                </p>
              )}
            </Card>

            {/* 4. Actionable Study Suggestions */}
            {analysis.studyAdvice?.length > 0 && (
              <Card className="md:col-span-2 p-5 border-blue-100 bg-blue-50/20 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Lightbulb size={16} className="text-blue-600" />
                  <span>Study Suggestions & Next Steps</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  {analysis.studyAdvice.map((tip, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-blue-100 text-xs text-slate-700 leading-relaxed shadow-2xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 5. Recommended Next Step & Difficulty */}
            <Card className="md:col-span-2 p-5 border-purple-200 bg-gradient-to-r from-purple-50/50 to-brand-50/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Compass size={16} className="text-purple-600" />
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Recommended Next Topic
                    </span>
                    <Badge variant={DIFFICULTY_COLOURS[analysis.recommendedDifficulty] || 'brand'} size="sm">
                      Target: {analysis.recommendedDifficulty}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {analysis.recommendedTopics?.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() =>
                          onPracticeRecommendedTopic
                            ? onPracticeRecommendedTopic(topic, analysis.recommendedDifficulty)
                            : onPracticeWeakAreas([topic], analysis.recommendedDifficulty)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-purple-200 text-purple-900 hover:border-brand-400 hover:bg-brand-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        {topic} <ArrowRight size={12} className="text-purple-500" />
                      </button>
                    ))}
                  </div>
                </div>

                {analysis.recommendedTopics?.[0] && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      onPracticeRecommendedTopic
                        ? onPracticeRecommendedTopic(analysis.recommendedTopics[0], analysis.recommendedDifficulty)
                        : onPracticeWeakAreas([analysis.recommendedTopics[0]], analysis.recommendedDifficulty)
                    }
                    className="flex-shrink-0"
                  >
                    Practice &quot;{analysis.recommendedTopics[0]}&quot; <ArrowRight size={14} />
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── 🚀 ACTION BUTTONS ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Practice My Weak Areas (Primary Adaptive CTA) */}
          {weakConcepts.length > 0 ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => handlePracticeWeak && handlePracticeWeak(weakConcepts, analysis?.recommendedDifficulty || 'medium')}
              loading={isAdaptiveLoading}
              disabled={isAdaptiveLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              <Zap size={16} />
              Practice My Weak Areas ({weakConcepts.length})
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={handleTryAgain}>
              <RotateCcw size={16} />
              Try Again
            </Button>
          )}

          {/* Try Again button */}
          {weakConcepts.length > 0 && (
            <Button variant="secondary" size="md" onClick={handleTryAgain}>
              <RotateCcw size={16} />
              Try Again
            </Button>
          )}

          {/* Review Answers (Smooth Scroll) */}
          <Button variant="secondary" size="md" onClick={scrollToReview}>
            <BookOpen size={16} />
            Review Answers
          </Button>
        </div>

        {/* Back to Dashboard */}
        <Button variant="ghost" size="md" onClick={() => navigate('/dashboard')}>
          <LayoutDashboard size={16} />
          Back to Dashboard
        </Button>
      </div>

      {/* ── 📝 QUESTION-BY-QUESTION REVIEW ─────────────────────────────────── */}
      <div ref={reviewRef} className="space-y-5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Question-by-Question Review</h2>
            <p className="text-xs text-slate-500">
              Inspect your answers, correct solutions, and full explanations.
            </p>
          </div>

          {/* Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter questions by outcome"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium"
          >
            {[
              { key: 'all', label: `All (${totalQuestions})` },
              { key: 'incorrect', label: `Incorrect (${incorrectCount})`, highlight: incorrectCount > 0 ? 'text-red-700' : '' },
              { key: 'unanswered', label: `Unanswered (${unansweredCount})` },
              { key: 'correct', label: `Correct (${correctCount})` },
            ].map(({ key, label, highlight }) => (
              <button
                key={key}
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  filter === key
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                } ${highlight || ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtered Question List */}
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">
            No questions in this filter category.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const isExpanded = expandedQuestions[q.id] !== false; // expanded by default
              return (
                <Card
                  key={q.id}
                  className={`border transition-all ${
                    q.isCorrect
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : q.isIncorrect
                      ? 'border-red-200 hover:border-red-300'
                      : 'border-amber-200 hover:border-amber-300'
                  }`}
                >
                  {/* Question Item Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
                          q.isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.isIncorrect
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {q.index}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                            {q.concept}
                          </span>
                          <Badge variant={DIFFICULTY_COLOURS[q.difficulty] || 'brand'} size="sm">
                            {q.difficulty}
                          </Badge>
                          {q.type && q.type !== 'mcq' && (
                            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                              {q.type === 'true_false' && 'True / False'}
                              {q.type === 'scenario' && 'Scenario-Based'}
                              {q.type === 'case_based' && 'Case Study'}
                              {q.type === 'numerical' && 'Numerical Calculation'}
                            </span>
                          )}
                          {q.unit && (
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                              Unit: {q.unit}
                            </span>
                          )}
                          {q.sourceReference && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              📖 Source: {q.sourceReference}
                            </span>
                          )}
                        </div>

                        {q.context && (
                          <div className="mb-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            <span className="font-bold text-slate-900 block mb-0.5">
                              {q.type === 'case_based' ? 'Case Study Context:' : 'Scenario Context:'}
                            </span>
                            {q.context}
                          </div>
                        )}

                        <p className="text-sm font-semibold text-slate-900 leading-snug">
                          {q.question}
                        </p>
                      </div>
                    </div>

                    {/* Result Status Badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {q.isCorrect && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 size={13} /> Correct
                        </span>
                      )}
                      {q.isIncorrect && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                          <XCircle size={13} /> Incorrect
                        </span>
                      )}
                      {q.isUnanswered && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <HelpCircle size={13} /> Unanswered
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExpand(q.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for Question ${q.index}`}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Body: Options + Explanation */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
                      {/* Options breakdown */}
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const isThisCorrect = opt.id === q.correctAnswer;
                          const isThisSelected = opt.id === q.selectedAnswer;

                          let optionStyle = 'border-slate-200 bg-white text-slate-700';
                          let badgeStyle = 'border-slate-300 text-slate-500 bg-slate-50';

                          if (isThisCorrect) {
                            optionStyle = 'border-emerald-300 bg-emerald-50 text-emerald-950 font-medium';
                            badgeStyle = 'border-emerald-500 bg-emerald-500 text-white font-bold';
                          } else if (isThisSelected && !isThisCorrect) {
                            optionStyle = 'border-red-300 bg-red-50 text-red-950';
                            badgeStyle = 'border-red-500 bg-red-500 text-white font-bold';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors ${optionStyle}`}
                            >
                              <span
                                className={`flex-shrink-0 w-6 h-6 rounded-full border text-xs flex items-center justify-center ${badgeStyle}`}
                              >
                                {opt.id}
                              </span>
                              <span className="flex-1">{opt.text}</span>

                              {/* Label indicators */}
                              {isThisCorrect && (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 flex-shrink-0 bg-emerald-100/80 px-2 py-0.5 rounded">
                                  <CheckCircle2 size={13} /> Correct Answer
                                </span>
                              )}
                              {isThisSelected && !isThisCorrect && (
                                <span className="flex items-center gap-1 text-xs font-bold text-red-700 flex-shrink-0 bg-red-100/80 px-2 py-0.5 rounded">
                                  <XCircle size={13} /> Your Choice
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {q.explanation && (
                        <div className="flex gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-slate-700 leading-relaxed">
                          <MessageSquare size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-blue-900 block mb-0.5">Explanation:</span>
                            {q.explanation}
                          </div>
                        </div>
                      )}

                      {/* Hint box */}
                      {q.hint && (
                        <div className="flex gap-2.5 p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 text-xs text-amber-900">
                          <Lightbulb size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-amber-950">Hint: </span>
                            {q.hint}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
