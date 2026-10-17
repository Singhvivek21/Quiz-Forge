/**
 * QuizPreview.jsx
 *
 * Displays a generated quiz in a polished read-only format.
 * Shows each MCQ question with its 4 options (collapsed by default),
 * expandable correct answer, explanation, and hint.
 *
 * Does NOT expose raw Gemini JSON.
 * Does NOT implement scoring yet.
 */
import { useState } from 'react';
import {
  Sparkles, ChevronDown, ChevronUp, Lightbulb,
  MessageSquare, CheckCircle2, BookOpen, BarChart2,
  Globe, Hash, Trophy, ArrowLeft, RefreshCw,
} from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import Card from './Card';

const DIFFICULTY_COLOURS = {
  easy:   'success',
  medium: 'warning',
  hard:   'danger',
  mixed:  'brand',
};

/** Single question card — collapsed by default, expand to reveal answer */
function QuestionCard({ question, index, showHints, showExplanations }) {
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const correct = question.options.find((o) => o.id === question.correctAnswer);

  return (
    <Card className="animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant={DIFFICULTY_COLOURS[question.difficulty] || 'brand'} size="sm">
              {question.difficulty}
            </Badge>
            {question.type && question.type !== 'mcq' && (
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                {question.type === 'true_false' && 'True / False'}
                {question.type === 'scenario' && 'Scenario-Based'}
                {question.type === 'case_based' && 'Case Study'}
                {question.type === 'numerical' && 'Numerical Calculation'}
              </span>
            )}
            {question.unit && (
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                Unit: {question.unit}
              </span>
            )}
            {question.concept && (
              <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                {question.concept}
              </span>
            )}
            {question.sourceReference && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                📖 Source: {question.sourceReference}
              </span>
            )}
          </div>

          {question.context && (
            <div className="mb-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              <span className="font-bold text-slate-900 block mb-0.5">
                {question.type === 'case_based' ? 'Case Study:' : 'Scenario:'}
              </span>
              {question.context}
            </div>
          )}

          <p className="text-sm font-medium text-slate-900 leading-relaxed">
            {question.question}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {question.options.map((opt) => {
          const isCorrect = opt.id === question.correctAnswer;
          let baseClass =
            'flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors';

          if (!revealed) {
            baseClass += ' border-slate-200 bg-white hover:bg-slate-50';
          } else if (isCorrect) {
            baseClass += ' border-emerald-300 bg-emerald-50 text-emerald-900';
          } else {
            baseClass += ' border-slate-200 bg-slate-50 text-slate-400';
          }

          return (
            <div key={opt.id} className={baseClass}>
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center ${
                  revealed && isCorrect
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 text-slate-500'
                }`}
              >
                {opt.id}
              </span>
              <span className="flex-1">{opt.text}</span>
              {revealed && isCorrect && (
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Hint toggle */}
      {showHints && question.hint && (
        <div className="mb-3">
          <button
            onClick={() => setShowHint((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            <Lightbulb size={13} />
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
              {question.hint}
            </div>
          )}
        </div>
      )}

      {/* Reveal / hide answer */}
      <button
        onClick={() => setRevealed((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
      >
        {revealed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {revealed ? 'Hide answer' : 'Reveal answer'}
      </button>

      {/* Explanation (shown when revealed) */}
      {revealed && showExplanations && question.explanation && (
        <div className="mt-3 flex gap-2 text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
          <MessageSquare size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <span>{question.explanation}</span>
        </div>
      )}
    </Card>
  );
}

/** Full quiz preview displayed after generation */
export default function QuizPreview({ quiz, onBack, onRegenerate, regenerating }) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quiz header */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} />
              <span className="text-xs text-white/70 font-medium uppercase tracking-wide">
                AI-Generated Quiz
              </span>
            </div>
            <h2 className="text-xl font-bold leading-tight">{quiz.title}</h2>
          </div>
          <Badge variant="outline" className="border-white/30 text-white bg-white/10 flex-shrink-0">
            {quiz.difficulty}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { icon: BookOpen,  label: 'Subject',   value: quiz.subject   },
            { icon: Hash,      label: 'Topic',     value: quiz.topic     },
            { icon: Trophy,    label: 'Questions', value: quiz.questions.length },
            { icon: BarChart2, label: 'Difficulty', value: quiz.difficulty },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-white/60 mb-0.5">
                <Icon size={11} />
                <span className="text-[10px] uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-sm font-semibold truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={15} /> Back to configuration
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          loading={regenerating}
          disabled={regenerating}
        >
          <RefreshCw size={14} /> Regenerate
        </Button>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {quiz.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            showHints={true}
            showExplanations={true}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-slate-400">
        {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} generated by Gemini AI ·
        Always verify important facts with authoritative sources.
      </div>
    </div>
  );
}
