import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Trash2, Edit3, BarChart2,
  Share2, Eye, Play, Users, Sparkles, RefreshCw,
  ExternalLink, Copy, Check, School, ShieldCheck
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ShareModal from '../components/ui/ShareModal';
import { EmptyState } from '../components/ui/Feedback';
import { getTeacherQuizzes, deleteTeacherQuiz } from '../services/api';

export default function TeacherQuizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Share modal state
  const [shareModalQuiz, setShareModalQuiz] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const fetchQuizzes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTeacherQuizzes();
      if (res && res.data) {
        setQuizzes(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load teacher quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleOpenShare = (quiz) => {
    setShareModalQuiz(quiz);
    setShareModalOpen(true);
  };

  const handleShareUpdated = (quizId, isShared, shareCode) => {
    setQuizzes((prev) =>
      prev.map((q) =>
        q.id === quizId ? { ...q, is_shared: isShared ? 1 : 0, isShared, share_code: shareCode, shareCode } : q
      )
    );
    setShareModalQuiz((prev) =>
      prev ? { ...prev, is_shared: isShared ? 1 : 0, isShared, share_code: shareCode, shareCode } : null
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quiz? Student attempts will also be removed.')) return;
    try {
      await deleteTeacherQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      alert('Failed to delete quiz: ' + err.message);
    }
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
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
              <School size={12} /> Teacher Quiz Manager
            </span>
          </div>
          <h1 className="section-title mt-1">Class Quizzes & Curricula</h1>
          <p className="section-subtitle">
            {quizzes.length} author-curated {quizzes.length === 1 ? 'quiz' : 'quizzes'} available for distribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button as={Link} to="/create">
            <Plus size={16} />
            Create Quiz
          </Button>
        </div>
      </div>

      {/* Search & Subject Filters */}
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
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 items-center">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedSubject === s
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <EmptyState
            title="No quizzes match your filter"
            description="Try a different search query or create a new classroom quiz."
            action={
              <Button as={Link} to="/create">
                <Plus size={16} /> Create Quiz
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((quiz) => {
            const isShared = Boolean(quiz.is_shared || quiz.isShared);
            const shareCode = quiz.share_code || quiz.shareCode;

            return (
              <Card key={quiz.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow border border-slate-200/80">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{quiz.subject}</Badge>
                        <span className="text-xs text-slate-400 capitalize">• {quiz.difficulty}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{quiz.title}</h3>
                      {quiz.topic && <p className="text-xs text-slate-500 mt-0.5">{quiz.topic}</p>}
                    </div>

                    {isShared ? (
                      <button
                        onClick={() => handleOpenShare(quiz)}
                        className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors"
                        title="Click to copy link"
                      >
                        <Share2 size={12} className="text-emerald-600" />
                        <span>{shareCode || 'Shared'}</span>
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-medium">
                        Private
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                    <span className="font-semibold text-slate-800">
                      {quiz.question_count || quiz.questions?.length || 0} Questions
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <Users size={13} className="text-slate-500" />
                      {quiz.attempts_count || 0} Submissions
                    </span>
                    {quiz.attempts_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-emerald-700">
                          {Math.round(quiz.avg_score || 0)}% Avg
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Button
                      as={Link}
                      to={`/teacher/quiz/${quiz.id}/edit`}
                      variant="secondary"
                      size="sm"
                    >
                      <Edit3 size={14} /> Edit
                    </Button>

                    <Button
                      as={Link}
                      to={`/teacher/quiz/${quiz.id}/analytics`}
                      variant="secondary"
                      size="sm"
                      className="text-indigo-700 hover:bg-indigo-50"
                    >
                      <BarChart2 size={14} /> Analytics
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenShare(quiz)}
                      title="Share link with students"
                      className="text-emerald-700 hover:bg-emerald-50"
                    >
                      <Share2 size={15} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(quiz.id)}
                      title="Delete quiz"
                      className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          quiz={shareModalQuiz}
          onShareUpdated={handleShareUpdated}
        />
      )}
    </div>
  );
}
