import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, ChevronRight,
  AlertCircle, BookOpen, RotateCcw, X, Loader2, Sparkles, HelpCircle
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';
import { getAttempts, getAttempt } from '../services/api';

function ScoreRing({ score }) {
  const colour = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle
        cx="24" cy="24" r={r} fill="none"
        stroke={colour} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="700" fill={colour}>{score}%</text>
    </svg>
  );
}

export default function QuizHistory() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review modal state
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAttempts();
      if (res && res.data) {
        setAttempts(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load quiz history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleOpenReview = async (attemptId) => {
    setSelectedAttemptId(attemptId);
    setReviewLoading(true);
    try {
      const res = await getAttempt(attemptId);
      if (res && res.data) {
        setReviewData(res.data);
      }
    } catch (err) {
      alert('Failed to load attempt details: ' + err.message);
      setSelectedAttemptId(null);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCloseReview = () => {
    setSelectedAttemptId(null);
    setReviewData(null);
  };

  const handleRetakeQuiz = (quizId) => {
    navigate(`/create?quizId=${quizId}`);
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title">Quiz History</h1>
        <p className="section-subtitle">
          A complete log of your attempts and question-by-question review from your SQLite database.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={32} className="text-brand-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading quiz attempt history…</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && attempts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No history yet"
          description="Complete a quiz to record and review your results here."
          action={
            <Button onClick={() => navigate('/create')}>
              Start a Quiz
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {!loading &&
            attempts.map((attempt) => (
              <Card
                key={attempt.id}
                hover
                className="flex items-center gap-5 cursor-pointer group"
                onClick={() => handleOpenReview(attempt.id)}
              >
                <ScoreRing score={attempt.percentage} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">
                      {attempt.quizTitle}
                    </p>
                    <Badge colour={attempt.percentage >= 60 ? 'green' : 'red'} dot>
                      {attempt.percentage >= 60 ? 'Passed' : 'Needs Practice'}
                    </Badge>
                    {attempt.isAdaptive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        <Sparkles size={10} /> Adaptive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    <span>{attempt.subject} • {attempt.topic}</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle size={11} className="text-emerald-500" />
                      {attempt.correctCount} correct
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle size={11} className="text-red-400" />
                      {attempt.incorrectCount} wrong
                    </span>
                    {attempt.duration && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {attempt.duration}
                      </span>
                    )}
                    <span>
                      {new Date(attempt.completedAt || attempt.date).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hidden sm:inline-flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReview(attempt.id);
                    }}
                  >
                    Review
                  </Button>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-brand-600 transition-colors" />
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* ── QUESTION-BY-QUESTION ATTEMPT REVIEW MODAL ──────────────────────── */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {reviewData?.quizTitle || 'Attempt Review'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {reviewData?.subject} • {reviewData?.topic} • Completed on{' '}
                    {reviewData && new Date(reviewData.completedAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseReview}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {reviewLoading || !reviewData ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 size={28} className="text-brand-600 animate-spin" />
                  <p className="text-xs text-slate-500">Loading attempt breakdown…</p>
                </div>
              ) : (
                <>
                  {/* Score summary bar */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <ScoreRing score={reviewData.percentage} />
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {reviewData.correctCount} / {reviewData.totalQuestions} Correct ({reviewData.percentage}%)
                        </p>
                        <p className="text-xs text-slate-500">
                          {reviewData.percentage >= 80 ? 'Mastery Demonstrated' : reviewData.percentage >= 60 ? 'Solid Attempt' : 'Needs Practice'}
                        </p>
                      </div>
                    </div>
                    {reviewData.quizId && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleRetakeQuiz(reviewData.quizId)}
                      >
                        <RotateCcw size={14} /> Practice Again
                      </Button>
                    )}
                  </div>

                  {/* Question breakdown list */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Question-by-Question Review ({reviewData.answers?.length || 0})
                    </h3>

                    {(reviewData.answers || []).map((ans, idx) => (
                      <div
                        key={ans.id || idx}
                        className={`p-4 rounded-xl border transition-all ${
                          ans.isCorrect
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-red-50/40 border-red-200'
                        }`}
                      >
                        {/* Question Title & Status */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <span className="text-sm font-semibold text-slate-900 leading-snug">
                            {idx + 1}. {ans.question}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 inline-flex items-center gap-1 ${
                              ans.isCorrect
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {ans.isCorrect ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {ans.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        {/* Options */}
                        {ans.options && ans.options.length > 0 && (
                          <div className="grid sm:grid-cols-2 gap-2 mb-3">
                            {ans.options.map((opt, optIdx) => {
                              const optLetter = String.fromCharCode(65 + optIdx);
                              const isSelected = ans.selectedAnswer === optLetter || ans.selectedAnswer === opt;
                              const isCorrectAnswer = ans.correctAnswer === optLetter || ans.correctAnswer === opt;

                              let bgClass = 'bg-white border-slate-200 text-slate-700';
                              if (isSelected && ans.isCorrect) {
                                bgClass = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold';
                              } else if (isSelected && !ans.isCorrect) {
                                bgClass = 'bg-red-100 border-red-400 text-red-900 font-semibold line-through';
                              } else if (isCorrectAnswer) {
                                bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium';
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${bgClass}`}
                                >
                                  <span className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] bg-white/80 border border-slate-200 flex-shrink-0">
                                    {optLetter}
                                  </span>
                                  <span className="truncate">{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Explanation & Concept Info */}
                        <div className="space-y-1.5 text-xs text-slate-600 bg-white/70 p-3 rounded-lg border border-slate-200/60">
                          {ans.explanation && (
                            <p className="leading-relaxed">
                              <strong className="text-slate-800">Explanation:</strong> {ans.explanation}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                            {ans.concept && (
                              <span>
                                <strong className="text-slate-700">Concept:</strong> {ans.concept}
                              </span>
                            )}
                            {ans.difficulty && (
                              <span>
                                <strong className="text-slate-700">Difficulty:</strong> {ans.difficulty}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <Button variant="secondary" onClick={handleCloseReview}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
