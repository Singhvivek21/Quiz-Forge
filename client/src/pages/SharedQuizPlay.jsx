import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen, Clock, HelpCircle, CheckCircle2, AlertCircle,
  Play, Sparkles, User, ShieldCheck, School, ArrowRight,
  RefreshCw, Award
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TakeQuiz from '../components/ui/TakeQuiz';
import QuizResults from '../components/ui/QuizResults';
import { getSharedQuiz, submitSharedAttempt } from '../services/api';

export default function SharedQuizPlay() {
  const { shareCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);

  // Student Flow State: 'lobby' | 'playing' | 'results'
  const [stage, setStage] = useState('lobby');
  const [studentName, setStudentName] = useState('');
  const [scoreResult, setScoreResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      setError(null);
      try {
        const res = await getSharedQuiz(shareCode);
        if (res && res.data) {
          setQuiz(res.data);
        }
      } catch (err) {
        setError(err.message || 'Shared quiz not found or sharing has been disabled by the instructor.');
      } finally {
        setLoading(false);
      }
    }

    if (shareCode) loadQuiz();
  }, [shareCode]);

  const handleStart = (e) => {
    e.preventDefault();
    setStage('playing');
  };

  const handleQuizComplete = async (calculatedScore, timeTakenSeconds, detailedAnswers) => {
    setScoreResult(calculatedScore);
    setSubmitting(true);

    try {
      const payload = {
        studentName: studentName.trim() || 'Anonymous Student',
        score: calculatedScore.correctCount,
        totalQuestions: calculatedScore.totalQuestions,
        percentage: calculatedScore.percentage,
        correctCount: calculatedScore.correctCount,
        incorrectCount: calculatedScore.incorrectCount,
        unansweredCount: calculatedScore.unansweredCount,
        timeTaken: timeTakenSeconds,
        answers: detailedAnswers,
      };

      await submitSharedAttempt(shareCode, payload);
    } catch (err) {
      console.error('Failed to record shared attempt:', err);
    } finally {
      setSubmitting(false);
      setStage('results');
    }
  };

  const handleRetry = () => {
    setScoreResult(null);
    setStage('playing');
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Connecting to Shared Quiz…</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <Card className="p-8 max-w-md w-full text-center space-y-4 border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Quiz Unavailable</h2>
            <p className="text-xs text-slate-500 mt-1">{error || 'This quiz link is invalid or has expired.'}</p>
          </div>
          <Button as={Link} to="/" className="w-full">
            Return to Homepage
          </Button>
        </Card>
      </div>
    );
  }

  // 1. Lobby / Welcome Screen
  if (stage === 'lobby') {
    const timeLimitStr = quiz.timeLimit ? `${Math.round(quiz.timeLimit / 60)} minutes` : 'No time limit';

    return (
      <div className="page-container max-w-xl mx-auto py-8">
        <Card className="p-6 sm:p-8 space-y-6 border border-slate-200 shadow-md">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <School size={13} /> Classroom Assessment
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{quiz.title}</h1>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Badge variant="secondary">{quiz.subject}</Badge>
              {quiz.topic && <span>• {quiz.topic}</span>}
              <span className="capitalize">• {quiz.difficulty}</span>
            </div>
          </div>

          {/* Quiz Details Badge Row */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Questions</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{quiz.questionCount}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Timer</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{timeLimitStr}</p>
            </div>
          </div>

          {/* Student Name Input Form */}
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Full Name or Student ID (Optional)
              </label>
              <div className="relative">
                <Input
                  placeholder="e.g. Alex Mercer (or leave blank to submit anonymously)"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  icon={User}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-600" />
                Your private email is never collected or shared.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base py-3">
              <Play size={18} /> Start Quiz Now
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // 2. Active Quiz Playing Session
  if (stage === 'playing') {
    return (
      <div className="page-container py-4">
        <TakeQuiz
          quiz={quiz}
          onComplete={handleQuizComplete}
          onCancel={() => setStage('lobby')}
        />
      </div>
    );
  }

  // 3. Quiz Results Review
  if (stage === 'results' && scoreResult) {
    return (
      <div className="page-container py-4">
        <QuizResults
          scoreResult={scoreResult}
          quiz={quiz}
          onRetry={handleRetry}
          onExit={() => navigate('/')}
        />
      </div>
    );
  }

  return null;
}
