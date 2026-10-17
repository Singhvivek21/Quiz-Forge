import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, Award, CheckCircle2, TrendingUp, AlertTriangle,
  Plus, Share2, Edit3, BarChart2, Eye, Trash2, ArrowUpRight,
  ShieldCheck, Sparkles, RefreshCw, Copy, Check, School
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ShareModal from '../components/ui/ShareModal';
import { EmptyState } from '../components/ui/Feedback';
import { getTeacherDashboard, deleteTeacherQuiz } from '../services/api';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sharing modal state
  const [shareModalQuiz, setShareModalQuiz] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTeacherDashboard();
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load teacher dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenShare = (quiz) => {
    setShareModalQuiz(quiz);
    setShareModalOpen(true);
  };

  const handleShareUpdated = (quizId, isShared, shareCode) => {
    setData((prev) => {
      if (!prev) return prev;
      const updatedQuizzes = prev.quizzes.map((q) =>
        q.id === quizId ? { ...q, is_shared: isShared ? 1 : 0, share_code: shareCode } : q
      );
      return { ...prev, quizzes: updatedQuizzes };
    });
    setShareModalQuiz((prev) => (prev ? { ...prev, is_shared: isShared ? 1 : 0, share_code: shareCode } : null));
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz? Associated student attempt logs will also be removed.')) return;
    try {
      await deleteTeacherQuiz(quizId);
      setData((prev) => ({
        ...prev,
        quizzes: prev.quizzes.filter((q) => q.id !== quizId),
        summary: {
          ...prev.summary,
          totalQuizzes: Math.max(0, (prev.summary?.totalQuizzes || 1) - 1)
        }
      }));
    } catch (err) {
      alert('Failed to delete quiz: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading Teacher Analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3">
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold">Access Denied or Failed to Load</h3>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchDashboardData}>Try Again</Button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const quizzes = data?.quizzes || [];
  const weakTopics = data?.weakTopics || [];
  const difficultyPerf = data?.difficultyPerformance || { easy: 0, medium: 0, hard: 0 };

  return (
    <div className="page-container space-y-8">
      {/* Teacher Portal Header Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-400/30 flex items-center gap-1">
                <School size={13} /> Teacher Command Center
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck size={13} /> Privacy Safeguarded
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Classroom Insights & Quiz Forge</h1>
            <p className="text-emerald-100/80 text-sm max-w-xl">
              Create, edit, and safely distribute quizzes to students. Monitor real-time class comprehension and pinpoint struggling concepts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              as={Link}
              to="/create"
              className="bg-white text-emerald-900 hover:bg-emerald-50 border-0 font-bold shadow-md"
            >
              <Plus size={16} />
              Create New Quiz
            </Button>
            <Button
              variant="ghost"
              onClick={fetchDashboardData}
              className="text-white hover:bg-white/10"
              title="Refresh Stats"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Quizzes</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <BookOpen size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{summary.totalQuizzes || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Curated class assessments</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Attempts</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Users size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{summary.totalAttempts || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Student submissions recorded</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Class Avg Score</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{summary.averageScore || 0}%</p>
          <p className="text-xs text-slate-500 mt-1">Overall cohort accuracy</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Class Pass Rate</span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Award size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{summary.passRate || 0}%</p>
          <p className="text-xs text-slate-500 mt-1">Scores ≥ 60% threshold</p>
        </Card>
      </div>

      {/* Secondary Insights Row: Weak Concepts & Difficulty Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identified Weak Concepts */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cohorts Identified Weak Topics</h2>
              <p className="text-xs text-slate-500">Concepts with accuracy below 70% across all student attempts</p>
            </div>
          </div>

          <Card className="p-5">
            {weakTopics.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold">No critical weak concepts identified!</p>
                <p className="text-xs text-slate-400 mt-0.5">Students are performing above 70% accuracy on all tested topics.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakTopics.map((topic, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning">{topic.subject || 'General'}</Badge>
                        <span className="text-xs font-bold text-slate-800">{topic.concept}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Tested in {topic.totalTested} questions • {topic.correctCount} correct
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-extrabold text-red-600">
                        {topic.accuracy}% accuracy
                      </span>
                      <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-red-500 h-full rounded-full"
                          style={{ width: `${topic.accuracy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Difficulty Performance */}
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Difficulty Performance</h2>
            <p className="text-xs text-slate-500">Comprehension across tiers</p>
          </div>

          <Card className="p-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Easy Questions</span>
                <span className="text-emerald-600">{difficultyPerf.easy}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${difficultyPerf.easy}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{difficultyPerf.easyTotal || 0} total answered</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Medium Questions</span>
                <span className="text-amber-600">{difficultyPerf.medium}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${difficultyPerf.medium}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{difficultyPerf.mediumTotal || 0} total answered</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Hard Questions</span>
                <span className="text-red-600">{difficultyPerf.hard}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${difficultyPerf.hard}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{difficultyPerf.hardTotal || 0} total answered</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Classroom Quizzes Management Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manage Class Quizzes</h2>
            <p className="text-xs text-slate-500">Edit content, generate share codes, and inspect item analytics</p>
          </div>
          <Button as={Link} to="/teacher/quizzes" variant="secondary" size="sm">
            View All Quizzes <ArrowUpRight size={14} />
          </Button>
        </div>

        <Card className="overflow-hidden p-0 border border-slate-200/80">
          {quizzes.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                title="No teacher quizzes yet"
                description="Create your first classroom quiz using AI generation or manual authoring."
                action={
                  <Button as={Link} to="/create">
                    <Plus size={16} /> Create Quiz
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Quiz Title & Subject</th>
                    <th className="py-3 px-4">Questions</th>
                    <th className="py-3 px-4">Student Attempts</th>
                    <th className="py-3 px-4">Avg Score</th>
                    <th className="py-3 px-4">Sharing</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {quizzes.slice(0, 8).map((quiz) => {
                    const isShared = Boolean(quiz.is_shared);
                    const avg = Math.round(quiz.avg_score || 0);

                    return (
                      <tr key={quiz.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{quiz.title}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px]">
                            <span className="font-medium text-slate-700">{quiz.subject}</span>
                            {quiz.topic && <span>• {quiz.topic}</span>}
                            <span>• <span className="capitalize">{quiz.difficulty}</span></span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {quiz.question_count || 0}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Users size={12} className="text-slate-500" />
                            {quiz.attempts_count || 0}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {quiz.attempts_count > 0 ? (
                            <span className={`font-bold ${avg >= 70 ? 'text-emerald-700' : avg >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                              {avg}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isShared ? (
                            <button
                              onClick={() => handleOpenShare(quiz)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono font-bold text-[11px] transition-colors"
                              title="Click to copy link or manage code"
                            >
                              <Share2 size={12} className="text-emerald-600" />
                              <span>{quiz.share_code || 'Shared'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenShare(quiz)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 font-medium text-[11px]"
                            >
                              <Share2 size={12} /> Share
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              as={Link}
                              to={`/teacher/quiz/${quiz.id}/analytics`}
                              variant="ghost"
                              size="xs"
                              title="Class Item Analytics"
                              className="text-indigo-600 hover:bg-indigo-50"
                            >
                              <BarChart2 size={14} />
                            </Button>

                            <Button
                              as={Link}
                              to={`/teacher/quiz/${quiz.id}/edit`}
                              variant="ghost"
                              size="xs"
                              title="Edit Quiz & Questions"
                              className="text-slate-600 hover:bg-slate-100"
                            >
                              <Edit3 size={14} />
                            </Button>

                            <Button
                              onClick={() => handleOpenShare(quiz)}
                              variant="ghost"
                              size="xs"
                              title="Share Quiz"
                              className="text-emerald-600 hover:bg-emerald-50"
                            >
                              <Share2 size={14} />
                            </Button>

                            <Button
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              variant="ghost"
                              size="xs"
                              title="Delete Quiz"
                              className="text-red-500 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

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
