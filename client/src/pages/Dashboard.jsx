import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart2, Trophy, Target, Layers, Flame,
  TrendingUp, AlertTriangle, ArrowRight, Plus,
  Zap, Sparkles, BookOpen, CheckCircle2, Clock, Loader2,
  Award, Crown, Shield, Lock, Check
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { getStats, getAttempts, getWeakConcepts } from '../services/api';
import { getStoredAttempts, getWeakConceptsFromHistory, getStoredGamificationProfile } from '../utils/storage';
import { calculateLevelProgress, BADGES } from '../utils/gamification';

function MiniBar({ value, max = 100, colour = 'bg-brand-500' }) {
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${colour}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

function Sparkline({ data = [] }) {
  if (!data || data.length === 0) return null;
  const pts = data.length > 1 ? data : [data[0], data[0]];
  const max = Math.max(...pts, 100);
  const min = Math.min(...pts, 0);
  const h = 48, w = 120;
  const x = (i) => (i / Math.max(1, pts.length - 1)) * w;
  const y = (v) => h - ((v - min) / Math.max(1, max - min)) * h;
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12 overflow-visible">
      <path d={d} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#6366f1" />
      ))}
    </svg>
  );
}

const BADGE_ICONS = {
  Trophy: Trophy,
  Sparkles: Sparkles,
  Award: Award,
  BookOpen: BookOpen,
  Flame: Flame,
  Zap: Zap,
  Clock: Clock,
  Target: Target,
  Crown: Crown
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [weakList, setWeakList] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [achievementFilter, setAchievementFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsRes, attemptsRes, weakRes] = await Promise.allSettled([
          getStats(),
          getAttempts({ limit: 10 }),
          getWeakConcepts(5)
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          setDbStats(statsRes.value.data);
        }

        let fetchedAttempts = [];
        if (attemptsRes.status === 'fulfilled' && Array.isArray(attemptsRes.value?.data)) {
          fetchedAttempts = attemptsRes.value.data;
          setAttempts(fetchedAttempts);
        } else {
          fetchedAttempts = getStoredAttempts() || [];
          setAttempts(fetchedAttempts);
        }

        if (weakRes.status === 'fulfilled' && Array.isArray(weakRes.value?.data) && weakRes.value.data.length > 0) {
          setWeakList(weakRes.value.data);
        } else {
          const localWeak = getWeakConceptsFromHistory() || [];
          setWeakList(localWeak);
        }
      } catch (err) {
        console.warn('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Compute live summary metrics strictly from actual data
  const totalCompleted = dbStats?.quizzesCompleted ?? attempts.length;
  const avgScore = totalCompleted > 0
    ? (dbStats?.averageScore ?? Math.round(attempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / totalCompleted))
    : 0;
  const bestScore = totalCompleted > 0
    ? (dbStats?.bestScore ?? Math.max(...attempts.map((a) => a.percentage || 0)))
    : 0;
  const totalQuestionsAnswered = totalCompleted > 0
    ? (dbStats?.questionsAnswered ?? attempts.reduce((acc, a) => acc + (a.totalQuestions || a.total || 0), 0))
    : 0;
  const streakDays = dbStats?.currentStreak ?? (totalCompleted > 0 ? 1 : 0);

  // Level & XP progression
  const localProfile = getStoredGamificationProfile();
  const totalXp = dbStats?.xp ?? localProfile?.xp ?? 0;
  const levelInfo = dbStats?.levelProgress || calculateLevelProgress(totalXp);

  // Achievements
  const achievements = dbStats?.achievements || BADGES.map((b) => ({
    ...b,
    isUnlocked: totalCompleted >= 1 && (b.id === 'first_quiz' || (b.id === 'perfect_score' && bestScore >= 100)),
    currentProgress: b.id === 'first_quiz' ? Math.min(1, totalCompleted) : (b.id === 'ten_quizzes' ? Math.min(10, totalCompleted) : 0),
    progressPercent: b.id === 'first_quiz' && totalCompleted >= 1 ? 100 : 0
  }));

  const filteredAchievements = achievements.filter((a) => {
    if (achievementFilter === 'unlocked') return a.isUnlocked;
    if (achievementFilter === 'locked') return !a.isUnlocked;
    return true;
  });

  const stats = [
    { label: 'Quizzes Completed', value: totalCompleted || 0, icon: BarChart2, colour: 'brand' },
    { label: 'Average Score', value: totalCompleted > 0 ? `${avgScore}%` : '—', icon: Target, colour: 'green' },
    { label: 'Best Score', value: totalCompleted > 0 ? `${bestScore}%` : '—', icon: Trophy, colour: 'amber' },
    { label: 'Questions Answered', value: totalQuestionsAnswered, icon: Layers, colour: 'blue' },
    { label: 'Current Streak', value: `${streakDays} days`, icon: Flame, colour: 'red' },
  ];

  const recentQuizzes = attempts.slice(0, 4);

  const trendScores = attempts.length > 0
    ? attempts.slice(0, 7).map((a) => a.percentage || 0).reverse()
    : [];

  const handleStartAdaptive = (item) => {
    navigate(`/create?topic=${encodeURIComponent(item.topic || 'General')}&subject=${encodeURIComponent(item.subject || 'General')}&concepts=${encodeURIComponent(item.concept)}`);
  };

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Your learning progress, deterministic XP milestones, and mastery achievements.</p>
        </div>
        <Button as={Link} to="/create">
          <Plus size={16} />
          New Quiz
        </Button>
      </div>

      {/* ── 👑 GAMIFICATION LEVEL & XP PROGRESSION BANNER ─────────────────── */}
      <Card className="p-6 border-indigo-200 bg-gradient-to-r from-indigo-900 via-slate-900 to-brand-950 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/10">
                <Crown size={14} /> Level {levelInfo.level} • {levelInfo.title}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold border border-orange-500/20">
                <Flame size={13} /> {streakDays}-Day Streak
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              {totalXp} <span className="text-base font-medium text-slate-300">Total XP</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-lg">
              Earn XP by answering quiz questions correctly and keeping up your daily study streak.
            </p>
          </div>

          <div className="md:w-72 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">Progress to Level {levelInfo.level + 1}</span>
              <span className="font-bold text-amber-300">{levelInfo.progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full bg-black/30 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{levelInfo.xpInLevel} XP in level</span>
              <span>{levelInfo.xpNeeded} XP needed</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── 🏆 ACHIEVEMENTS & MASTERY BADGES ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              Achievements & Milestones
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {achievements.filter((a) => a.isUnlocked).length} / {achievements.length} Unlocked
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Deterministic recognition earned through actual quizzes and mastery.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setAchievementFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                achievementFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({achievements.length})
            </button>
            <button
              onClick={() => setAchievementFilter('unlocked')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                achievementFilter === 'unlocked' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Unlocked ({achievements.filter((a) => a.isUnlocked).length})
            </button>
            <button
              onClick={() => setAchievementFilter('locked')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                achievementFilter === 'locked' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              In Progress ({achievements.filter((a) => !a.isUnlocked).length})
            </button>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((badge) => {
            const IconComponent = BADGE_ICONS[badge.icon] || Trophy;
            return (
              <Card
                key={badge.id}
                className={`p-4 transition-all duration-200 ${
                  badge.isUnlocked
                    ? 'border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 shadow-sm hover:shadow'
                    : 'border-slate-200 bg-slate-50/50 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      badge.isUnlocked
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {badge.isUnlocked ? (
                      <IconComponent size={22} />
                    ) : (
                      <Lock size={20} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {badge.title}
                      </h3>
                      {badge.isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <Check size={11} /> Unlocked
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {badge.progressPercent || 0}%
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {badge.description}
                    </p>

                    {!badge.isUnlocked && (
                      <div className="pt-1.5 space-y-1">
                        <MiniBar value={badge.progressPercent || 0} max={100} colour="bg-slate-400" />
                        <span className="text-[10px] text-slate-400 block text-right">
                          {badge.currentProgress || 0} / {badge.target} target
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── ⚡ ADAPTIVE PRACTICE HERO SECTION ────────────────────────────── */}
      <Card className="p-6 border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              <Zap size={13} className="text-amber-600" />
              Adaptive Practice System
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Target Your Identified Weak Concepts
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              AI QuizForge monitors your question accuracy to build fresh, targeted practice sessions that avoid previous questions and step up difficulty as you master each topic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {weakList.slice(0, 2).map((item) => (
              <Button
                key={item.concept}
                size="sm"
                variant="primary"
                onClick={() => handleStartAdaptive(item)}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                <Zap size={14} /> Practice {item.concept}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Middle row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent quizzes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent Quizzes & Attempts</h2>
            <Link to="/history" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentQuizzes.length === 0 ? (
              <Card className="p-8 text-center space-y-3 border-dashed border-slate-300 bg-slate-50/50">
                <BookOpen size={28} className="text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No quizzes completed yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create and submit your first quiz to track your history, view question reviews, and identify weak concepts.
                </p>
                <Button as={Link} to="/create" size="sm" className="mt-2">
                  <Plus size={14} /> Start a Quiz
                </Button>
              </Card>
            ) : (
              recentQuizzes.map((q, idx) => (
                <Card
                  key={q.id || idx}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:border-brand-300 transition-colors"
                  onClick={() => navigate(q.id ? `/history` : '/create')}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      q.percentage >= 80
                        ? 'bg-emerald-100 text-emerald-700'
                        : q.percentage >= 60
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {q.percentage}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {q.quizTitle || q.title}
                      </p>
                      {q.isAdaptive && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          Adaptive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {q.subject} • {q.topic || 'General'}
                    </p>
                  </div>
                  <Badge
                    colour={
                      q.difficulty === 'Easy' || q.difficulty === 'easy'
                        ? 'green'
                        : q.difficulty === 'Hard' || q.difficulty === 'hard'
                        ? 'red'
                        : 'yellow'
                    }
                  >
                    {q.difficulty}
                  </Badge>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Weak Concepts Card */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" /> Weak Concepts ({weakList.length})
          </h2>
          <Card>
            {weakList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                No weak concepts identified yet! Keep practicing.
              </div>
            ) : (
              <div className="space-y-4">
                {weakList.map((item) => (
                  <div key={item.concept} className="space-y-1.5">
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <span className="font-semibold text-slate-800 block truncate max-w-[170px]">
                          {item.concept}
                        </span>
                        <span className="text-[11px] text-slate-400">{item.topic || 'General'}</span>
                      </div>
                      <span className="text-red-600 font-bold flex-shrink-0 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        {item.accuracy}% Accuracy
                      </span>
                    </div>
                    <MiniBar value={item.accuracy} colour="bg-red-500" />
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[11px] text-slate-400">
                        {item.totalQuestions || 3} questions tested
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartAdaptive(item)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        Practice <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {weakList[0] && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-5 border-amber-400 text-amber-900 hover:bg-amber-50"
                onClick={() => handleStartAdaptive(weakList[0])}
              >
                <Zap size={14} /> Practice All Weak Areas
              </Button>
            )}
          </Card>
        </div>
      </div>

      {/* Performance trend */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-600" />
            Performance Trend
          </h2>
          <Badge colour="green" dot>Active Progress</Badge>
        </div>
        <div className="px-2">
          {trendScores.length > 0 ? (
            <>
              <Sparkline data={trendScores} />
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                {trendScores.map((_, i) => (
                  <span key={i}>
                    {i === 0 ? 'First' : i === trendScores.length - 1 ? 'Latest' : `Attempt ${i + 1}`}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No performance trend data yet. Complete quizzes to visualize your learning progression over time.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
