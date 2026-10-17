import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Save, ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle,
  HelpCircle, Sparkles, BookOpen, Clock, Lightbulb,
  Check, Hash, Layers, ShieldCheck, RefreshCw, FileText
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { getQuiz, updateTeacherQuiz } from '../services/api';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice (MCQ)' },
  { value: 'true_false', label: 'True / False' },
  { value: 'scenario', label: 'Scenario-Based' },
  { value: 'case_based', label: 'Case-Based MCQ' },
  { value: 'numerical', label: 'Numerical / Calculation' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function TeacherQuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [timeLimit, setTimeLimit] = useState(0); // in seconds
  const [enableHints, setEnableHints] = useState(true);
  const [enableExplanations, setEnableExplanations] = useState(true);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      setError(null);
      try {
        const res = await getQuiz(id);
        if (res && res.data) {
          const q = res.data;
          setTitle(q.title || '');
          setSubject(q.subject || '');
          setTopic(q.topic || '');
          setDifficulty((q.difficulty || 'medium').toLowerCase());
          setTimeLimit(q.timeLimit || q.time_limit || 0);
          setEnableHints(q.enableHints !== undefined ? Boolean(q.enableHints) : true);
          setEnableExplanations(q.enableExplanations !== undefined ? Boolean(q.enableExplanations) : true);

          const rawQuestions = q.questions || [];
          setQuestions(
            rawQuestions.map((item, idx) => ({
              id: item.id || `q-${idx + 1}`,
              type: item.type || 'mcq',
              question: item.question || '',
              scenarioContext: item.scenarioContext || item.scenario_context || '',
              caseContext: item.caseContext || item.case_context || '',
              numericAnswer: item.numericAnswer !== undefined ? item.numericAnswer : (item.numeric_answer !== undefined ? item.numeric_answer : ''),
              tolerance: item.tolerance !== undefined ? item.tolerance : (item.numeric_tolerance !== undefined ? item.numeric_tolerance : 0.05),
              unit: item.unit || item.numeric_unit || '',
              options: Array.isArray(item.options) && item.options.length > 0
                ? item.options.map((opt, oIdx) => {
                    if (typeof opt === 'string') {
                      return { id: String.fromCharCode(65 + oIdx), text: opt };
                    }
                    return { id: opt.id || String.fromCharCode(65 + oIdx), text: opt.text || '' };
                  })
                : [
                    { id: 'A', text: '' },
                    { id: 'B', text: '' },
                    { id: 'C', text: '' },
                    { id: 'D', text: '' },
                  ],
              correctAnswer: item.correctAnswer || item.correct_answer || 'A',
              explanation: item.explanation || '',
              hint: item.hint || '',
              concept: item.concept || '',
              difficulty: (item.difficulty || q.difficulty || 'medium').toLowerCase(),
            }))
          );
        }
      } catch (err) {
        setError(err.message || 'Failed to load quiz details');
      } finally {
        setLoading(false);
      }
    }

    if (id) loadQuiz();
  }, [id]);

  // Question editing handlers
  const handleQuestionChange = (qIndex, field, value) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], [field]: value };
      return copy;
    });
  };

  const handleOptionTextChange = (qIndex, optId, newText) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = { ...copy[qIndex] };
      q.options = q.options.map((opt) => (opt.id === optId ? { ...opt, text: newText } : opt));
      copy[qIndex] = q;
      return copy;
    });
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${prev.length + 1}`,
        type: 'mcq',
        question: 'New question text...',
        scenarioContext: '',
        caseContext: '',
        numericAnswer: '',
        tolerance: 0.05,
        unit: '',
        options: [
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' },
          { id: 'C', text: 'Option C' },
          { id: 'D', text: 'Option D' },
        ],
        correctAnswer: 'A',
        explanation: '',
        hint: '',
        concept: topic || subject || 'General',
        difficulty: difficulty,
      },
    ]);
  };

  const handleDeleteQuestion = (qIndex) => {
    if (questions.length <= 1) {
      alert('A quiz must have at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        title: title.trim() || 'Untitled Quiz',
        subject: subject.trim() || 'General',
        topic: topic.trim() || 'General',
        difficulty,
        timeLimit: parseInt(timeLimit, 10) || 0,
        enableHints: Boolean(enableHints),
        enableExplanations: Boolean(enableExplanations),
        questions: questions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          scenarioContext: q.scenarioContext || undefined,
          caseContext: q.caseContext || undefined,
          numericAnswer: q.type === 'numerical' ? parseFloat(q.numericAnswer) || 0 : undefined,
          tolerance: q.type === 'numerical' ? parseFloat(q.tolerance) || 0.05 : undefined,
          unit: q.type === 'numerical' ? q.unit : undefined,
          options: q.type === 'numerical'
            ? undefined
            : q.type === 'true_false'
            ? [{ id: 'A', text: 'True' }, { id: 'B', text: 'False' }]
            : q.options,
          correctAnswer: q.type === 'true_false'
            ? (q.correctAnswer.toLowerCase() === 'true' || q.correctAnswer === 'A' ? 'A' : 'B')
            : q.correctAnswer,
          explanation: q.explanation,
          hint: q.hint,
          concept: q.concept,
          difficulty: q.difficulty || difficulty,
        })),
      };

      await updateTeacherQuiz(id, payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save quiz changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading Quiz for Editing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header Sticky Action Bar */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur py-3 border-b border-slate-200 flex items-center justify-between gap-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            as={Link}
            to="/teacher/quizzes"
            variant="ghost"
            size="sm"
            className="text-slate-600"
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <div>
            <h1 className="text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
              Editing: {title || 'Quiz'}
            </h1>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck size={12} /> Teacher In-Place Authoring
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Check size={14} /> Saved Successfully
            </span>
          )}
          <Button
            onClick={handleSave}
            loading={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Save size={16} />
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quiz Metadata Editor Card */}
      <Card className="p-6 space-y-5 border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
          Quiz Configuration & Metadata
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Quiz Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cellular Respiration & Bioenergetics"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Biology"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Topic</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Glycolysis"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Overall Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium capitalize focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time Limit (Seconds)</label>
              <Input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 0)}
                placeholder="0 for no limit"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={enableHints}
                onChange={(e) => setEnableHints(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Enable Hints</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={enableExplanations}
                onChange={(e) => setEnableExplanations(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Enable Post-Quiz Explanations</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Quiz Questions ({questions.length})</h2>
            <p className="text-xs text-slate-500">Edit stems, answers, distractors, and concept tags.</p>
          </div>
          <Button onClick={handleAddQuestion} size="sm" variant="secondary">
            <Plus size={15} /> Add Question
          </Button>
        </div>

        {questions.map((q, idx) => (
          <Card key={idx} className="p-6 space-y-4 border border-slate-200/90 relative">
            {/* Question Card Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <select
                  value={q.type}
                  onChange={(e) => handleQuestionChange(idx, 'type', e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={q.difficulty}
                  onChange={(e) => handleQuestionChange(idx, 'difficulty', e.target.value)}
                  className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 capitalize"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleDeleteQuestion(idx)}
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
                title="Delete this question"
              >
                <Trash2 size={15} />
              </Button>
            </div>

            {/* Scenario or Case Context input if applicable */}
            {(q.type === 'scenario' || q.type === 'case_based') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {q.type === 'scenario' ? 'Scenario / Passage Context' : 'Clinical / Case Context'}
                </label>
                <textarea
                  rows={3}
                  value={q.type === 'scenario' ? q.scenarioContext : q.caseContext}
                  onChange={(e) =>
                    handleQuestionChange(idx, q.type === 'scenario' ? 'scenarioContext' : 'caseContext', e.target.value)
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-amber-50/30 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Provide background scenario, clinical narrative, or passage..."
                />
              </div>
            )}

            {/* Question Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Question Prompt</label>
              <textarea
                rows={2}
                value={q.question}
                onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Enter the question text..."
              />
            </div>

            {/* Answer & Options according to Type */}
            {q.type === 'numerical' ? (
              <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-blue-900">Numerical Calculation Settings</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Correct Numeric Value</label>
                    <Input
                      type="number"
                      step="any"
                      value={q.numericAnswer}
                      onChange={(e) => handleQuestionChange(idx, 'numericAnswer', e.target.value)}
                      placeholder="e.g. 58800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tolerance (± % or range)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={q.tolerance}
                      onChange={(e) => handleQuestionChange(idx, 'tolerance', e.target.value)}
                      placeholder="e.g. 0.05 (5%)"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Units (e.g. J, N, m/s)</label>
                    <Input
                      value={q.unit}
                      onChange={(e) => handleQuestionChange(idx, 'unit', e.target.value)}
                      placeholder="e.g. J"
                    />
                  </div>
                </div>
              </div>
            ) : q.type === 'true_false' ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Correct Answer</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name={`tf-${idx}`}
                      checked={q.correctAnswer === 'A' || q.correctAnswer === 'True'}
                      onChange={() => handleQuestionChange(idx, 'correctAnswer', 'A')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>True</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name={`tf-${idx}`}
                      checked={q.correctAnswer === 'B' || q.correctAnswer === 'False'}
                      onChange={() => handleQuestionChange(idx, 'correctAnswer', 'B')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>False</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700">Options (Select radio for correct answer)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt) => {
                    const isSelected = q.correctAnswer === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                          isSelected ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct-${idx}`}
                          checked={isSelected}
                          onChange={() => handleQuestionChange(idx, 'correctAnswer', opt.id)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-xs text-slate-700 w-4">{opt.id}.</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(idx, opt.id, e.target.value)}
                          className="flex-1 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none p-0 text-slate-800"
                          placeholder={`Option ${opt.id} text...`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Concept & Explanation row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Concept Tag</label>
                <Input
                  value={q.concept}
                  onChange={(e) => handleQuestionChange(idx, 'concept', e.target.value)}
                  placeholder="e.g. Glycolysis ATP Yield"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hint (Optional)</label>
                <Input
                  value={q.hint}
                  onChange={(e) => handleQuestionChange(idx, 'hint', e.target.value)}
                  placeholder="e.g. Consider net vs gross yield"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Detailed Explanation</label>
              <textarea
                rows={2}
                value={q.explanation}
                onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50/50 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Explain why the correct answer is right and clarify misconceptions..."
              />
            </div>
          </Card>
        ))}

        <div className="flex justify-center pt-4">
          <Button onClick={handleAddQuestion} variant="secondary" className="w-full max-w-sm">
            <Plus size={16} /> Add Another Question
          </Button>
        </div>
      </div>
    </div>
  );
}
