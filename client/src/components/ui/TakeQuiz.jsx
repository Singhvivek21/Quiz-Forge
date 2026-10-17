/**
 * TakeQuiz.jsx
 *
 * Interactive Quiz Player session.
 *
 * Features:
 *  - Real-time countdown or stopwatch timer
 *  - Auto-submission on timer expiry
 *  - Question-by-question stepper & full question palette jumper
 *  - Clear option selection (A, B, C, D) with keyboard and click support
 *  - Optional hint toggle per question
 *  - Unanswered questions warning before submission
 *  - Calculates the final score via pure application logic on submit
 */
import { useState, useEffect, useRef } from 'react';
import {
  Clock, ArrowLeft, ArrowRight, CheckCircle2, HelpCircle,
  Lightbulb, AlertTriangle, Send, BookOpen, Sparkles
} from 'lucide-react';
import Button from './Button';
import Card from './Card';
import Badge from './Badge';
import Modal from './Modal';
import { calculateQuizScore } from '../../utils/scoring';

const DIFFICULTY_COLOURS = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
  mixed: 'brand',
};

// Parse time limit value (string or number) into seconds (e.g. "5 minutes" or 5 -> 300)
function parseTimeLimitSeconds(timeLimitVal) {
  if (!timeLimitVal || timeLimitVal === 'No limit') return 0;
  if (typeof timeLimitVal === 'number') {
    return timeLimitVal > 0 ? timeLimitVal * 60 : 0;
  }
  const str = String(timeLimitVal);
  const match = str.match(/(\d+)\s*minute/i);
  if (match) {
    return parseInt(match[1], 10) * 60;
  }
  const numOnly = parseInt(str, 10);
  if (!isNaN(numOnly) && numOnly > 0) {
    return numOnly * 60;
  }
  return 0;
}

export default function TakeQuiz({
  quiz,
  onComplete,
  onCancel,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qid]: 'A' | 'B' | 'C' | 'D' }
  const [showHint, setShowHint] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [timeExpiredModal, setTimeExpiredModal] = useState(false);

  const initialTimerSeconds = parseTimeLimitSeconds(quiz.timeLimit);
  const hasTimeLimit = initialTimerSeconds > 0;

  const [secondsRemaining, setSecondsRemaining] = useState(initialTimerSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef(null);
  const isSubmittedRef = useRef(false);

  const questions = quiz.questions || [];
  const total = questions.length;
  const currentQuestion = questions[currentIndex] || {};

  // Count answered
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== null && answers[k] !== undefined).length;
  const unansweredCount = total - answeredCount;

  // ── Timer Effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      if (hasTimeLimit) {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmitOnTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasTimeLimit]);

  // Format timer text
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Auto submit on timeout ────────────────────────────────────────────────
  const handleAutoSubmitOnTimeOut = () => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    setTimeExpiredModal(true);

    setTimeout(() => {
      const score = calculateQuizScore(questions, answers, initialTimerSeconds);
      onComplete(score, score.timeSpentSeconds, score.questionDetails);
    }, 2000);
  };

  // ── Manual submit ─────────────────────────────────────────────────────────
  const handleSubmit = (force = false) => {
    if (!force && unansweredCount > 0) {
      setShowConfirmModal(true);
      return;
    }

    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = hasTimeLimit
      ? initialTimerSeconds - secondsRemaining
      : elapsedSeconds;

    const score = calculateQuizScore(questions, answers, timeSpent);
    onComplete(score, score.timeSpentSeconds, score.questionDetails);
  };

  const handleSelectOption = (optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      setShowHint(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setShowHint(false);
    }
  };

  // ── Keyboard Navigation & Shortcut Support ─────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keyboard shortcuts if modal is open or typing in an input
      if (showConfirmModal || timeExpiredModal || showExitModal) return;
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      const key = e.key.toLowerCase();

      // Navigation shortcuts
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (key === 'h') {
        e.preventDefault();
        if (currentQuestion.hint) {
          setShowHint((prev) => !prev);
        }
      }

      // Option selection shortcuts for True/False
      if (currentQuestion.type === 'true_false') {
        if (key === 't' || key === '1' || key === 'a') {
          e.preventDefault();
          handleSelectOption('True');
        } else if (key === 'f' || key === '2' || key === 'b') {
          e.preventDefault();
          handleSelectOption('False');
        }
      } else {
        // Option selection shortcuts for Multiple Choice (A/B/C/D or 1/2/3/4)
        if (key === 'a' || key === '1') {
          e.preventDefault();
          handleSelectOption('A');
        } else if (key === 'b' || key === '2') {
          e.preventDefault();
          handleSelectOption('B');
        } else if (key === 'c' || key === '3') {
          e.preventDefault();
          if (currentQuestion.options?.some((o) => o.id === 'C')) handleSelectOption('C');
        } else if (key === 'd' || key === '4') {
          e.preventDefault();
          if (currentQuestion.options?.some((o) => o.id === 'D')) handleSelectOption('D');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentQuestion, showConfirmModal, timeExpiredModal, total]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      {/* ── Top Session Bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-card">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (answeredCount > 0) {
                setShowExitModal(true);
              } else {
                onCancel();
              }
            }}
            aria-label="Exit Quiz Session"
          >
            <ArrowLeft size={15} /> Exit
          </Button>
          <div className="hidden sm:block">
            <h2 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
              {quiz.title}
            </h2>
            <p className="text-xs text-slate-500">{quiz.subject} • {quiz.topic}</p>
          </div>
        </div>

        {/* Live Timer */}
        <div
          aria-live="polite"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border shadow-inner ${
            hasTimeLimit && secondsRemaining <= 60
              ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
              : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <Clock size={16} className={hasTimeLimit && secondsRemaining <= 60 ? 'text-red-500' : 'text-slate-400'} aria-hidden="true" />
          <span className="sr-only">Time remaining:</span>
          <span>{hasTimeLimit ? formatTimer(secondsRemaining) : formatTimer(elapsedSeconds)}</span>
          {hasTimeLimit && <span className="text-[10px] uppercase text-slate-400 font-sans font-normal" aria-hidden="true">Left</span>}
        </div>

        {/* Finish button */}
        <Button size="sm" variant="primary" onClick={() => handleSubmit(false)}>
          <Send size={14} /> Submit Quiz
        </Button>
      </div>

      {/* ── Progress Bar ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Question <strong>{currentIndex + 1}</strong> of {total}</span>
          <span><strong>{answeredCount}</strong> of {total} Answered</span>
        </div>
        <div
          className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Progress: Question ${currentIndex + 1} of ${total}`}
        >
          <div
            className="h-full bg-brand-600 transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Question Palette (Quick Jump) ─────────────────────────────────── */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-0.5"
        role="navigation"
        aria-label="Question Navigation Palette"
      >
        {questions.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null;
          const isCurrent = idx === currentIndex;

          let btnClass = 'w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ';
          if (isCurrent) {
            btnClass += 'ring-2 ring-brand-500 ring-offset-2 bg-brand-600 text-white shadow-sm';
          } else if (isAnswered) {
            btnClass += 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100';
          } else {
            btnClass += 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
          }

          return (
            <button
              key={q.id || idx}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setShowHint(false);
              }}
              className={btnClass}
              aria-label={`Go to Question ${idx + 1}: ${isCurrent ? 'Current' : isAnswered ? 'Answered' : 'Unanswered'}`}
              aria-current={isCurrent ? 'true' : undefined}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* ── Active Question Card ─────────────────────────────────────────── */}
      <Card className="p-6 sm:p-8 space-y-6 shadow-md border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Question {currentIndex + 1}
              </span>
              <Badge variant={DIFFICULTY_COLOURS[currentQuestion.difficulty] || 'brand'} size="sm">
                {currentQuestion.difficulty || 'medium'}
              </Badge>
              {currentQuestion.type && currentQuestion.type !== 'mcq' && (
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                  {currentQuestion.type === 'true_false' && 'True / False'}
                  {currentQuestion.type === 'scenario' && 'Scenario-Based'}
                  {currentQuestion.type === 'case_based' && 'Case Study'}
                  {currentQuestion.type === 'numerical' && 'Numerical Calculation'}
                </span>
              )}
              {currentQuestion.unit && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  Unit: {currentQuestion.unit}
                </span>
              )}
              {currentQuestion.concept && (
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                  {currentQuestion.concept}
                </span>
              )}
              {currentQuestion.sourceReference && (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  📖 {currentQuestion.sourceReference}
                </span>
              )}
            </div>

            {/* Scenario / Case-Based Context Vignette */}
            {currentQuestion.context && (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <BookOpen size={13} className="text-brand-600" />
                  {currentQuestion.type === 'case_based' ? 'Case Study Background' : 'Scenario Context'}
                </div>
                <p className="text-slate-700 text-xs sm:text-sm whitespace-pre-line">
                  {currentQuestion.context}
                </p>
              </div>
            )}

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug pt-2">
              {currentQuestion.question}
            </h3>
          </div>
        </div>

        {/* Options List / True-False Selector */}
        {currentQuestion.type === 'true_false' ? (
          <div
            role="radiogroup"
            aria-label={`Question ${currentIndex + 1} options`}
            className="grid grid-cols-2 gap-4 pt-2"
          >
            {['True', 'False'].map((tfVal) => {
              const isSelected = String(answers[currentQuestion.id]).toLowerCase() === tfVal.toLowerCase() ||
                (tfVal === 'True' && answers[currentQuestion.id] === 'A') ||
                (tfVal === 'False' && answers[currentQuestion.id] === 'B');

              return (
                <button
                  key={tfVal}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectOption(tfVal)}
                  className={`flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all cursor-pointer min-h-[110px] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                    isSelected
                      ? tfVal === 'True'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-md ring-2 ring-emerald-500'
                        : 'border-red-500 bg-red-50 text-red-950 shadow-md ring-2 ring-red-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold mb-2 ${
                      isSelected
                        ? tfVal === 'True' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tfVal === 'True' ? '✓' : '✗'}
                  </span>
                  <span className="text-base font-bold">{tfVal}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div
            role="radiogroup"
            aria-label={`Question ${currentIndex + 1} options`}
            className="space-y-3 pt-2"
          >
            {currentQuestion.options?.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all cursor-pointer min-h-[52px] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/80 text-brand-950 shadow-sm ring-1 ring-brand-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {option.id}
                  </span>
                  <span className="text-sm font-medium flex-1 leading-relaxed">
                    {option.text}
                  </span>
                  {isSelected && (
                    <CheckCircle2 size={20} className="text-brand-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Hint button (if question has hint) */}
        {currentQuestion.hint && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium cursor-pointer"
            >
              <Lightbulb size={14} />
              {showHint ? 'Hide Hint' : 'Need a hint? (Press H)'}
            </button>
            {showHint && (
              <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed animate-fade-in" role="region" aria-label="Question Hint">
                <span className="font-bold">Hint: </span>
                {currentQuestion.hint}
              </div>
            )}
          </div>
        )}

        {/* Keyboard navigation helper footer */}
        <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
          <span>Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">A-D</kbd> select option • <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">→</kbd> navigate</span>
          {currentQuestion.hint && <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">H</kbd> hint</span>}
        </div>

        {/* Stepper Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Previous Question"
          >
            <ArrowLeft size={15} /> Previous
          </Button>

          {currentIndex < total - 1 ? (
            <Button variant="primary" size="sm" onClick={handleNext} aria-label="Next Question">
              Next <ArrowRight size={15} />
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => handleSubmit(false)} aria-label="Submit Quiz">
              <Send size={15} /> Finish & View Results
            </Button>
          )}
        </div>
      </Card>

      {/* ── Confirm Submit Modal (if unanswered exist) ────────────────────── */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Submit Quiz?"
      >
        <div className="space-y-4">
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.</p>
              <p className="text-xs text-amber-800 mt-1">
                Unanswered questions will be scored as 0. Are you sure you want to submit?
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowConfirmModal(false)}>
              Keep Answering
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setShowConfirmModal(false);
                handleSubmit(true);
              }}
            >
              Submit Anyway
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Exit Quiz Confirmation Modal ─────────────────────────────── */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Leave Quiz Session?"
      >
        <div className="space-y-4">
          <div className="flex gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Your progress in this session will not be saved.</p>
              <p className="text-xs text-slate-600 mt-1">
                You have answered {answeredCount} of {total} questions. If you exit now, this attempt will be discarded.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowExitModal(false)}>
              Resume Quiz
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setShowExitModal(false);
                onCancel();
              }}
            >
              Exit Quiz
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Time Expired Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={timeExpiredModal}
        onClose={() => {}}
        title="⏰ Time's Up!"
      >
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <Clock size={24} />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            The time limit for this quiz has expired.
          </p>
          <p className="text-xs text-slate-500">
            Calculating your score and preparing your results review...
          </p>
        </div>
      </Modal>
    </div>
  );
}
