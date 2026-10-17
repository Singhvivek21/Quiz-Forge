import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, TrendingUp, Award, Clock,
  Share2, Edit3, ShieldCheck, AlertCircle, CheckCircle2,
  BarChart3, RefreshCw, Sparkles, Check, Copy, HelpCircle,
  School, FileText, ChevronRight
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ShareModal from '../components/ui/ShareModal';
import { getTeacherQuizAnalytics } from '../services/api';

export default function TeacherQuizAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTeacherQuizAnalytics(id);
      if (res && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load quiz analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAnalytics();
  }, [id]);

  const handleShareUpdated = (quizId, isShared, shareCode) => {
    setAnalytics((prev) => (prev ? { ...prev, isShared, shareCode } : prev));
  };

  const handleCopyCode = () => {
    if (!analytics?.shareCode) return;
    const url = `${window.location.origin}/share/${analytics.shareCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Aggregating Class Analytics…</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="page-container space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center gap-2">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error || 'Quiz not found'}</span>
        </div>
        <Button as={Link} to="/teacher/dashboard">Back to Dashboard</Button>
      </div>
    );
  }

  const {
    title,
    subject,
    topic,
    difficulty,
    isShared,
    shareCode,
    questionCount,
    totalAttempts,
    averageScore,
    passRate,
    bestScore,
    lowestScore,
    averageDuration,
    questions = [],
    studentAttempts = [],
    weakConcepts = []
  } = analytics;

  const mins = Math.floor(averageDuration / 60);
  const secs = averageDuration % 60;
  const avgDurationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="page-container space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              as={Link}
              to="/teacher/dashboard"
              variant="ghost"
              size="xs"
              className="text-slate-500"
            >
              <ArrowLeft size={14} /> Back
            </Button>
            <Badge variant="secondary">{subject}</Badge>
            {topic && <span className="text-xs text-slate-500">• {topic}</span>}
            <span className="text-xs text-slate-400 capitalize">• {difficulty}</span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500">
            {questionCount} Questions • Aggregated student attempt performance & item difficulty
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            as={Link}
            to={`/teacher/quiz/${id}/edit`}
            variant="secondary"
            size="sm"
          >
            <Edit3 size={15} /> Edit Questions
          </Button>

          <Button
            onClick={() => setShareModalOpen(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Share2 size={15} /> Share Quiz
          </Button>
        </div>
      </div>

      {/* Share Banner */}
      {isShared && shareCode && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <Share2 size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Classroom Share Active</p>
              <p className="text-xs text-emerald-900 font-medium">
                Students can enter code <span className="font-mono font-bold bg-emerald-200/80 px-1.5 py-0.5 rounded">{shareCode}</span> or use direct URL
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={copiedCode ? 'success' : 'secondary'}
            onClick={handleCopyCode}
            className="self-start sm:self-auto"
          >
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedCode ? 'Link Copied!' : 'Copy Student Link'}</span>
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">Total Attempts</span>
            <Users size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalAttempts}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Submissions</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">Average Score</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{averageScore}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">High: {bestScore}% • Low: {lowestScore}%</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">Pass Rate</span>
            <Award size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{passRate}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">≥ 60% Passing</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">Avg Duration</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{avgDurationStr}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pacing</p>
        </Card>
      </div>

      {/* Weak Concepts Warning Section */}
      {weakConcepts.length > 0 && (
        <Card className="p-5 border-l-4 border-l-red-500 bg-red-50/20 space-y-3">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle size={18} />
            <h3 className="text-sm font-bold">Struggling Concepts Detected in this Quiz</h3>
          </div>
          <p className="text-xs text-slate-600">
            The following concepts scored below 70% comprehension and may require classroom review:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {weakConcepts.map((item, idx) => (
              <div key={idx} className="p-3 bg-white border border-red-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{item.concept}</span>
                  <span className="text-xs font-extrabold text-red-600">{item.accuracy}% Accuracy</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.questionText}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Detailed Question Performance / Item Analysis */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Question Item Analysis</h2>
          <p className="text-xs text-slate-500">
            Breakdown of student accuracy and distractor selection for each question
          </p>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const acc = q.accuracy || 0;
            const dist = q.distribution || { A: 0, B: 0, C: 0, D: 0 };
            const isNumerical = q.type === 'numerical';

            return (
              <Card key={q.id || idx} className="p-5 space-y-4 border border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <Badge variant="secondary">{q.type.toUpperCase()}</Badge>
                      {q.concept && (
                        <span className="text-xs font-semibold text-slate-600">
                          Concept: <span className="text-slate-900">{q.concept}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-900 pt-1">{q.question}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-extrabold text-slate-900">
                      <span className={acc >= 70 ? 'text-emerald-600' : acc >= 50 ? 'text-amber-600' : 'text-red-600'}>
                        {acc}%
                      </span>{' '}
                      <span className="text-xs text-slate-400 font-normal">Accuracy</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {q.correctCount} / {q.answeredCount} Correct
                    </p>
                  </div>
                </div>

                {/* Option selection bars for MCQs */}
                {!isNumerical && q.options && q.options.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Student Choice Distribution
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt) => {
                        const count = dist[opt.id] || 0;
                        const pct = q.answeredCount > 0 ? Math.round((count / q.answeredCount) * 100) : 0;
                        const isCorrect = q.correctAnswer === opt.id || (q.type === 'true_false' && q.correctAnswer.toLowerCase() === opt.text.toLowerCase());

                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border text-xs ${
                              isCorrect ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-slate-600'}`}>
                                  {opt.id}.
                                </span>
                                {opt.text}
                                {isCorrect && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                    Correct Answer
                                  </span>
                                )}
                              </span>
                              <span className="font-bold text-slate-700">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCorrect ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Student Attempts Table (Privacy Protected) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Student Attempts ({studentAttempts.length})</h2>
            <p className="text-xs text-slate-500">
              Auditable submissions log. Individual student privacy is protected.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            <ShieldCheck size={14} /> Zero Email Exposure Guaranteed
          </div>
        </div>

        <Card className="p-0 overflow-hidden border border-slate-200">
          {studentAttempts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-sm font-semibold">No student attempts recorded yet.</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Share this quiz with your students to start viewing submissions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Student Name / Display</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Percentage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Time Taken</th>
                    <th className="py-3 px-4">Date Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {studentAttempts.map((att, idx) => (
                    <tr key={att.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {att.studentName}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {att.score} / {att.totalQuestions}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${att.percentage >= 60 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {att.percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={att.status === 'passed' ? 'success' : 'danger'}>
                          {att.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {att.duration}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {att.completedAt ? new Date(att.completedAt).toLocaleString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
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
          quiz={analytics}
          onShareUpdated={handleShareUpdated}
        />
      )}
    </div>
  );
}
