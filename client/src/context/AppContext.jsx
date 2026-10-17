import { createContext, useContext, useReducer } from 'react';

const AppContext = createContext(null);

function getSafeInitialRole() {
  try {
    const role = localStorage.getItem('qf_user_role');
    return role === 'teacher' ? 'teacher' : 'student';
  } catch {
    return 'student';
  }
}

const initialState = {
  theme: 'light',       // 'light' | 'dark'
  language: 'English',
  defaultDifficulty: 'medium',
  defaultQuestionCount: 10,
  sidebarOpen: false,
  userRole: getSafeInitialRole(), // 'student' | 'teacher'
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_DEFAULT_DIFFICULTY':
      return { ...state, defaultDifficulty: action.payload };
    case 'SET_DEFAULT_QUESTION_COUNT':
      return { ...state, defaultQuestionCount: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'SET_USER_ROLE':
      try {
        localStorage.setItem('qf_user_role', action.payload);
      } catch (e) {
        // ignore localStorage errors
      }
      return { ...state, userRole: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
