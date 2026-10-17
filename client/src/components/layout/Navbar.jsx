import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu, Bell, Search, Flame, Crown, GraduationCap,
  School, ShieldCheck, ChevronRight, Sparkles, Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getStats } from '../../services/api';
import { getStoredGamificationProfile } from '../../utils/storage';

const PAGE_BREADCRUMBS = {
  '/':                   ['App', 'Home'],
  '/create':             ['Quiz Forge', 'Create New Quiz'],
  '/my-quizzes':        ['Library', 'My Saved Quizzes'],
  '/history':            ['Analytics', 'Attempt History'],
  '/dashboard':          ['Analytics', 'Student Dashboard'],
  '/question-bank':      ['Repository', 'Question Bank'],
  '/settings':           ['Preferences', 'Settings'],
  '/teacher/dashboard':  ['Educator', 'Classroom Dashboard'],
  '/teacher/quizzes':    ['Educator', 'Manage Quizzes'],
};

export default function Navbar() {
  const { state, dispatch } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  let breadcrumbs = PAGE_BREADCRUMBS[pathname];
  if (!breadcrumbs) {
    if (pathname.includes('/teacher/quiz/') && pathname.includes('/edit')) {
      breadcrumbs = ['Educator', 'Quiz Editor'];
    } else if (pathname.includes('/teacher/quiz/') && pathname.includes('/analytics')) {
      breadcrumbs = ['Educator', 'Item Discrimination Analytics'];
    } else if (pathname.startsWith('/share/')) {
      breadcrumbs = ['Shared Session', 'Interactive Quiz'];
    } else {
      breadcrumbs = ['AI QuizForge', 'Session'];
    }
  }

  const [gamification, setGamification] = useState({
    level: 1,
    streak: 0,
    xp: 0,
  });

  const isTeacher = state.userRole === 'teacher';

  const handleToggleRole = (newRole) => {
    dispatch({ type: 'SET_USER_ROLE', payload: newRole });
    if (newRole === 'teacher') {
      navigate('/teacher/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const res = await getStats();
        if (isMounted && res && res.data) {
          setGamification({
            level: res.data.level || res.data.levelProgress?.level || 1,
            streak: res.data.currentStreak || 0,
            xp: res.data.xp || 0,
          });
        }
      } catch (err) {
        const local = getStoredGamificationProfile();
        if (isMounted) {
          setGamification({
            level: local.level || 1,
            streak: local.streak || 0,
            xp: local.xp || 0,
          });
        }
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-4 sm:px-6 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="lg:hidden text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          aria-label="Toggle navigation menu"
        >
          <Menu size={19} />
        </button>

        {/* Clean breadcrumb trail */}
        <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium hidden sm:inline">{breadcrumbs[0]}</span>
          <ChevronRight size={13} className="text-slate-300 hidden sm:inline" />
          <span className="font-bold text-slate-900 truncate">{breadcrumbs[1]}</span>
          {isTeacher && (
            <span className="hidden md:inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck size={12} /> Teacher Mode
            </span>
          )}
        </nav>
      </div>

      {/* Right actions: Quick Action + Role Segment + Stats + Profile */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Quick Create Button on Desktop */}
        <Link
          to="/create"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus size={13} />
          <span>New Quiz</span>
        </Link>

        {/* Role Switcher Pill */}
        <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/90 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleToggleRole('student')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              !isTeacher
                ? 'bg-white text-brand-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Switch to Student Mode"
          >
            <GraduationCap size={13} />
            <span className="hidden sm:inline">Student</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleRole('teacher')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              isTeacher
                ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Switch to Teacher Mode"
          >
            <School size={13} />
            <span className="hidden sm:inline">Teacher</span>
          </button>
        </div>

        {/* Gamification Indicator Pill */}
        {!isTeacher ? (
          <Link
            to="/dashboard"
            title={`Level ${gamification.level} • ${gamification.streak}-Day Study Streak (${gamification.xp} XP)`}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-xs font-bold text-slate-700 transition-colors shadow-2xs tabular-nums"
          >
            <span className="flex items-center gap-1 text-orange-600">
              <Flame size={13} className="fill-orange-500 text-orange-500" />
              <span>{gamification.streak}d</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-indigo-700">
              <Crown size={12} className="text-amber-500" />
              <span>Lvl {gamification.level}</span>
            </span>
          </Link>
        ) : (
          <Link
            to="/teacher/dashboard"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-xs font-bold text-emerald-800 transition-colors"
            title="Classroom Dashboard"
          >
            <School size={13} className="text-emerald-600" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>
        )}

        {/* Profile Token */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold select-none shadow-2xs ${
            isTeacher ? 'bg-emerald-700' : 'bg-brand-600'
          }`}
          title={isTeacher ? 'Teacher Account' : 'Student Account'}
        >
          {isTeacher ? 'T' : 'S'}
        </div>
      </div>
    </header>
  );
}

