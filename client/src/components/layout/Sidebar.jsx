import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, PlusCircle, BookOpen, Clock, LayoutDashboard,
  Library, Settings, X, Sparkles, School, GraduationCap,
  BarChart3, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const STUDENT_NAV = [
  { to: '/',             label: 'Home',          icon: Home },
  { to: '/create',       label: 'Create Quiz',   icon: PlusCircle },
  { to: '/my-quizzes',  label: 'My Quizzes',    icon: BookOpen },
  { to: '/history',     label: 'Quiz History',   icon: Clock },
  { to: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/question-bank', label: 'Question Bank', icon: Library },
  { to: '/settings',    label: 'Settings',       icon: Settings },
];

const TEACHER_NAV = [
  { to: '/teacher/dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
  { to: '/teacher/quizzes',   label: 'Manage Quizzes',    icon: BookOpen },
  { to: '/create',            label: 'Create Quiz',       icon: PlusCircle },
  { to: '/question-bank',     label: 'Question Bank',     icon: Library },
  { to: '/settings',          label: 'Settings',          icon: Settings },
];

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const isTeacher = state.userRole === 'teacher';
  const navItems = isTeacher ? TEACHER_NAV : STUDENT_NAV;

  // Close sidebar on Escape key when open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && state.sidebarOpen) {
        dispatch({ type: 'SET_SIDEBAR', payload: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.sidebarOpen, dispatch]);

  return (
    <>
      {/* Mobile overlay */}
      {state.sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => dispatch({ type: 'SET_SIDEBAR', payload: false })}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 flex flex-col w-60 bg-white border-r border-slate-200/80',
          'transition-transform duration-200 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          state.sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg text-white shadow-2xs ${isTeacher ? 'bg-emerald-600' : 'bg-brand-600'}`}>
              <Sparkles size={16} />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-none block">
                Quiz<span className={isTeacher ? 'text-emerald-600' : 'text-brand-600'}>Forge</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5 block">
                {isTeacher ? 'Teacher Mode' : 'Student Portal'}
              </span>
            </div>
          </div>
          {/* Mobile close */}
          <button
            className="lg:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
            onClick={() => dispatch({ type: 'SET_SIDEBAR', payload: false })}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Role Mode Quick Pill in Sidebar */}
        <div className="px-3 py-2.5 border-b border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
            <div className="flex items-center gap-1.5">
              {isTeacher ? (
                <School size={13} className="text-emerald-600" />
              ) : (
                <GraduationCap size={13} className="text-brand-600" />
              )}
              <span className="font-bold text-slate-800">{isTeacher ? 'Educator' : 'Student'}</span>
            </div>
            <button
              onClick={() => dispatch({ type: 'SET_USER_ROLE', payload: isTeacher ? 'student' : 'teacher' })}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 underline cursor-pointer"
            >
              Switch mode
            </button>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/teacher/dashboard'}
              className={({ isActive }) =>
                ['nav-link', isActive ? 'active' : ''].join(' ')
              }
              onClick={() => {
                if (window.innerWidth < 1024) dispatch({ type: 'SET_SIDEBAR', payload: false });
              }}
            >
              <Icon size={16} className="flex-shrink-0 text-slate-400 group-hover:text-slate-700" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer info card */}
        <div className="p-3 border-t border-slate-100">
          <div className="rounded-lg p-2.5 bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SQLite Online
              </span>
              <span className="text-[10px] text-slate-400 font-mono">v2.0</span>
            </div>
            <p className="text-slate-500 text-[10px] leading-tight">
              Deterministic scoring • Zero data leaks
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

