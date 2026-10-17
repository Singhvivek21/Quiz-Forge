import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, ChevronRight, Search,
  Trash2, Play, Sparkles, Loader2, RefreshCw
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { EmptyState } from '../components/ui/Feedback';
import { getQuizzes, deleteQuiz } from '../services/api';

const difficultyColour = {
  Easy: 'green', easy: 'green',
  Medium: 'yellow', medium: 'yellow',
  Hard: 'red', hard: 'red',
  Mixed: 'blue', mixed: 'blue'
};

export default function MyQuizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

  const fetchQuizList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getQuizzes();
      if (res && res.data) {
        setQuizzes(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizList();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      alert('Failed to delete quiz: ' + err.message);
    }
  };

  const handleStartQuiz = (id) => {
    navigate(`/create?quizId=${id}`);
  };

  const subjects = ['All', ...new Set(quizzes.map((q) => q.subject).filter(Boolean))];

  const filtered = quizzes.filter((q) => {
    const matchesQuery =
      q.title.toLowerCase().includes(query.toLowerCase()) ||
      q.subject.toLowerCase().includes(query.toLowerCase()) ||
      (q.topic && q.topic.toLowerCase().includes(query.toLowerCase()));

    const matchesSubject = selectedSubject === 'All' || q.subject === selectedSubject;
    return matchesQuery && matchesSubject;
  });

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">My Quizzes</h1>
          <p className="section-subtitle">
            {quizzes.length} saved {quizzes.length === 1 ? 'quiz' : 'quizzes'} in your SQLite database
          </p>
        </div>
        <Button as={Link} to="/create">
          <Plus size={16} />
          New Quiz
        </Button>
      </div>

      {/* Search & filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search quizzes by title, subject, or topic…"
            icon={Search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {subjects.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {subjects.map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedSubject === subj
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={32} className="text-brand-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading your saved quizzes…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card className="border-red-200 bg-red-50 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to load quizzes</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchQuizList}>
            <RefreshCw size={14} /> Retry
          </Button>
        </Card>
      )}

      {/* Quiz cards */}
      {!loading && !error && filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={quizzes.length === 0 ? 'No quizzes saved yet' : 'No matching quizzes'}
          description={
            quizzes.length === 0
              ? 'Generate your first AI-powered quiz and it will be stored here automatically.'
              : 'Try a different search term or subject filter.'
          }
          action={
            <Button as={Link} to="/create">
              <Plus size={16} />
              Create Quiz
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {!loading &&
            filtered.map((quiz) => {
              const hasScore = quiz.latestPercentage !== null && quiz.latestPercentage !== undefined;
              return (
                <Card
                  key={quiz.id}
                  hover
                  padding={false}
                  className="flex flex-col overflow-hidden group cursor-pointer"
                  onClick={() => handleStartQuiz(quiz.id)}
                >
                  {/* Top colour bar */}
                  <div
                    className={`h-1.5 w-full ${
                      quiz.isAdaptive
                        ? 'bg-amber-500'
                        : quiz.status === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-brand-500'
                    }`}
                  />
                  <div className="p-5 flex flex-col gap-4 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                          {quiz.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {quiz.subject} · {quiz.topic}
                        </p>
                      </div>
                      <Badge colour={difficultyColour[quiz.difficulty] ?? 'default'}>
                        {quiz.difficulty}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{quiz.questionCount} questions</span>
                      <span>·</span>
                      <span>
                        {new Date(quiz.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      {quiz.isAdaptive && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          <Sparkles size={10} /> Adaptive
                        </span>
                      )}
                    </div>

                    {/* Score bar */}
                    {hasScore && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">Latest Score</span>
                          <span
                            className={`font-semibold ${
                              quiz.latestPercentage >= 80
                                ? 'text-emerald-600'
                                : quiz.latestPercentage >= 60
                                ? 'text-amber-600'
                                : 'text-red-500'
                            }`}
                          >
                            {Math.round(quiz.latestPercentage)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              quiz.latestPercentage >= 80
                                ? 'bg-emerald-400'
                                : quiz.latestPercentage >= 60
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            }`}
                            style={{ width: `${quiz.latestPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100">
                      <Badge colour={quiz.status === 'completed' ? 'green' : 'brand'} dot>
                        {quiz.status === 'completed' ? 'Attempted' : 'Ready'}
                      </Badge>

                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, quiz.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Quiz"
                        >
                          <Trash2 size={14} />
                        </button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartQuiz(quiz.id);
                          }}
                        >
                          <Play size={13} />
                          {quiz.status === 'completed' ? 'Retake' : 'Start'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
