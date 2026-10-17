import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import CreateQuiz from './pages/CreateQuiz';
import MyQuizzes from './pages/MyQuizzes';
import QuizHistory from './pages/QuizHistory';
import Dashboard from './pages/Dashboard';
import QuestionBank from './pages/QuestionBank';
import Settings from './pages/Settings';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherQuizzes from './pages/TeacherQuizzes';
import TeacherQuizEditor from './pages/TeacherQuizEditor';
import TeacherQuizAnalytics from './pages/TeacherQuizAnalytics';
import SharedQuizPlay from './pages/SharedQuizPlay';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Student Shared Quiz Play Route (Uses Layout) */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateQuiz />} />
            <Route path="/my-quizzes" element={<MyQuizzes />} />
            <Route path="/history" element={<QuizHistory />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/question-bank" element={<QuestionBank />} />
            <Route path="/settings" element={<Settings />} />

            {/* Teacher Mode Protected Routes */}
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
            <Route path="/teacher/quiz/:id/edit" element={<TeacherQuizEditor />} />
            <Route path="/teacher/quiz/:id/analytics" element={<TeacherQuizAnalytics />} />

            {/* Public Student Quiz Route */}
            <Route path="/share/:shareCode" element={<SharedQuizPlay />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
