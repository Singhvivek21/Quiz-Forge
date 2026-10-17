import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, Zap, BookOpen, BarChart2, ArrowRight, Brain,
  CheckCircle2, Star, ShieldCheck, School, Layers,
  Trophy, Check, Flame, ChevronRight, HelpCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const SAMPLE_DEMO_QUESTION = {
  subject: 'Computer Science',
  topic: 'Algorithms & Complexity',
  question: 'What is the tight worst-case time complexity of binary search on a sorted array of N elements?',
  options: [
    { id: 'A', text: 'O(1) constant time' },
    { id: 'B', text: 'O(log N) logarithmic time' },
    { id: 'C', text: 'O(N) linear time' },
    { id: 'D', text: 'O(N log N) linearithmic time' },
  ],
  correctAnswer: 'B',
  explanation: 'Binary search divides the search space in half at each step, yielding a worst-case recurrence of T(N) = T(N/2) + O(1), which solves to O(log N) by Master Theorem.'
};

const FEATURES = [
  {
    icon: Sparkles,
    badge: 'Gemini 1.5 Powered',
    title: 'Precision Question Synthesis',
    description: 'Generates rigorous MCQs, scenario cases, and calculations with structured reasoning, hints, and verify-tested answer keys.',
  },
  {
    icon: Brain,
    badge: 'Active Recall',
    title: 'Adaptive Mastery Engine',
    description: 'Pinpoints specific concept weaknesses from your response history and crafts targeted practice sessions to close learning gaps.',
  },
  {
    icon: School,
    badge: 'Educator Ready',
    title: 'Teacher Portal & Safe Sharing',
    description: 'Create custom question banks, generate privacy-safe share links, and inspect classroom item discrimination analytics.',
  },
  {
    icon: BarChart2,
    badge: 'Deterministic Progress',
    title: 'Transparent Gamification',
    description: 'Earn real XP, level progressions, and study streak badges calculated strictly from verified answers without fake metrics.',
  },
];

const PLATFORM_METRICS = [
  { value: '100%', label: 'Deterministic Scoring', hint: 'Pure application-layer verification' },
  { value: '< 2.5s', label: 'Generation Speed', hint: 'Gemini API structured JSON output' },
  { value: '5+', label: 'Question Formats', hint: 'MCQ, True/False, Scenario, Case, Math' },
  { value: 'Privacy First', label: 'Zero Student PII Leaks', hint: 'FERPA & COPPA compliant design' },
];

export default function Home() {
  const navigate = useNavigate();
  const [selectedDemoOption, setSelectedDemoOption] = useState(null);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSelect = (optId) => {
    setSelectedDemoOption(optId);
    setDemoSubmitted(true);
  };

  const handleResetDemo = () => {
    setSelectedDemoOption(null);
    setDemoSubmitted(false);
  };

  return (
    <div className="page-container space-y-16 py-6 sm:py-10">

      {/* ── 🌟 HERO SECTION WITH INTERACTIVE DEMO ───────────────────────────── */}
      <section className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Value Prop */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI QuizForge v2.0 • Production Educational SaaS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Master Any Subject with{' '}
            <span className="text-brand-600 underline decoration-brand-200 underline-offset-4">
              AI-Generated
            </span>{' '}
            Interactive Quizzes.
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
            Synthesize customized quizzes from any topic, syllabus, or lecture notes.
            Experience adaptive practice that hones your weak concepts with instant pedagogical feedback.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="lg" as={Link} to="/create" className="shadow-sm">
              <Sparkles size={16} />
              Create a Quiz
            </Button>
            <Button variant="secondary" size="lg" as={Link} to="/dashboard">
              Explore Dashboard
              <ArrowRight size={15} />
            </Button>
          </div>

          <div className="flex items-center gap-6 pt-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> Free to use
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> Offline SQLite storage
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> Teacher mode enabled
            </span>
          </div>
        </div>

        {/* Right Column: Live Interactive Demo Card */}
        <div className="lg:col-span-5">
          <div className="relative">
            {/* Subtle background glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-brand-200 to-indigo-100 opacity-60 blur-lg -z-10" />

            <Card className="p-6 border-slate-200/90 shadow-card space-y-4 bg-white/95 backdrop-blur">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{SAMPLE_DEMO_QUESTION.subject}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">{SAMPLE_DEMO_QUESTION.topic}</span>
                </div>
                <Badge colour="brand" size="xs">Live Demo</Badge>
              </div>

              <div>
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">
                  Sample Question
                </p>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {SAMPLE_DEMO_QUESTION.question}
                </h3>
              </div>

              {/* Demo Options */}
              <div className="space-y-2 pt-1">
                {SAMPLE_DEMO_QUESTION.options.map((opt) => {
                  const isSelected = selectedDemoOption === opt.id;
                  const isCorrect = opt.id === SAMPLE_DEMO_QUESTION.correctAnswer;
                  let optStyle = 'border-slate-200 hover:border-slate-300 bg-white text-slate-800';

                  if (demoSubmitted) {
                    if (isCorrect) {
                      optStyle = 'border-emerald-400 bg-emerald-50 text-emerald-950 font-semibold';
                    } else if (isSelected) {
                      optStyle = 'border-red-300 bg-red-50 text-red-950';
                    }
                  } else if (isSelected) {
                    optStyle = 'border-brand-500 bg-brand-50 text-brand-900 font-semibold';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleDemoSelect(opt.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${optStyle}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] ${
                          demoSubmitted && isCorrect
                            ? 'bg-emerald-600 text-white'
                            : demoSubmitted && isSelected
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                      </span>
                      {demoSubmitted && isCorrect && <Check size={14} className="text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Instant Explanation Box */}
              {demoSubmitted && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1 animate-fade-in">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    {selectedDemoOption === SAMPLE_DEMO_QUESTION.correctAnswer ? 'Correct!' : 'Answer Explanation:'}
                  </span>
                  <p>{SAMPLE_DEMO_QUESTION.explanation}</p>
                </div>
              )}

              {/* Demo reset footer */}
              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                <span>Click any option to test instant scoring</span>
                {demoSubmitted && (
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
                  >
                    Reset question
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── 📊 PLATFORM METRICS ROW ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-2xl border border-slate-200/90 shadow-card">
        {PLATFORM_METRICS.map((m) => (
          <div key={m.label} className="space-y-1">
            <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">{m.value}</p>
            <p className="text-xs font-bold text-slate-800">{m.label}</p>
            <p className="text-[11px] text-slate-500 leading-tight">{m.hint}</p>
          </div>
        ))}
      </section>

      {/* ── ⚙️ PRODUCT CAPABILITIES GRID ───────────────────────────────────── */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge colour="brand" size="sm">Architecture & Features</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Engineered for Deep Learning & Pedagogical Impact
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            A complete suite for both autonomous self-study and structured classroom assignments.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <Card key={feat.title} className="p-5 flex flex-col justify-between space-y-4 hover:border-slate-300" hover>
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                    {feat.badge}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{feat.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feat.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── 👨‍🏫 TEACHER VS STUDENT ROLE MODES ──────────────────────────────── */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Student Workflow Card */}
        <Card className="p-6 border-slate-200/90 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-700 uppercase tracking-wider">
            <Brain size={16} /> Student Experience
          </div>
          <h3 className="text-lg font-bold text-slate-900">Personalized Autonomous Learning</h3>
          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-brand-600 flex-shrink-0 mt-0.5" />
              <span>Generate instant topic or chapter-specific quizzes at your desired difficulty level.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-brand-600 flex-shrink-0 mt-0.5" />
              <span>Receive instant feedback, step-by-step solutions, and AI learning analysis.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-brand-600 flex-shrink-0 mt-0.5" />
              <span>Practice weak concepts with adaptive follow-up sessions and track streaks.</span>
            </li>
          </ul>
          <div className="pt-2">
            <Button size="sm" as={Link} to="/create">Start Student Practice</Button>
          </div>
        </Card>

        {/* Teacher Workflow Card */}
        <Card className="p-6 border-emerald-200 bg-emerald-50/20 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <School size={16} /> Educator Portal
          </div>
          <h3 className="text-lg font-bold text-slate-900">Classroom Distribution & Analytics</h3>
          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Author and fine-tune quizzes with in-place question editing and answer key verification.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Share clean public join codes with students without forced logins or account creation.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Review aggregated score distributions, question difficulty, and common mistakes.</span>
            </li>
          </ul>
          <div className="pt-2">
            <Button size="sm" variant="success" as={Link} to="/teacher/dashboard">Open Teacher Portal</Button>
          </div>
        </Card>
      </section>

      {/* ── 🔒 PRIVACY & TRUST BANNER ────────────────────────────────────────── */}
      <section className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <ShieldCheck size={14} /> Enterprise Security & Reliability
          </div>
          <h3 className="text-lg font-bold">Safe, Private, and High-Performance</h3>
          <p className="text-xs text-slate-400 max-w-lg">
            API keys stay server-side, SQLite stores all records locally on your host, and user uploads are sanitized with strict schema validation.
          </p>
        </div>
        <Button size="md" variant="primary" as={Link} to="/create" className="flex-shrink-0">
          Launch AI QuizForge
        </Button>
      </section>

    </div>
  );
}

