/**
 * CreateQuiz.jsx
 *
 * Full Lifecycle:
 *  1. Configure Quiz (Subject, Topic, Difficulty, Count, Timer, etc.)
 *  2. Generate Quiz via Gemini API
 *  3. Interactive Quiz Session (TakeQuiz) with live scoring
 *  4. Polished Results Screen (QuizResults) with 🏆 Final Score & Question Review
 *  5. Adaptive Practice Generation (Targeting weak concepts with fresh questions)
 *  6. Direct Preview Mode (QuizPreview)
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles, Info, ChevronRight, Lightbulb,
  MessageSquare, AlertTriangle, RefreshCw, Wand2, Zap,
  PlayCircle, Eye, RotateCcw, UploadCloud, FileText, File,
  Trash2, CheckCircle2, BookOpen, Loader2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import QuizPreview from '../components/ui/QuizPreview';
import TakeQuiz from '../components/ui/TakeQuiz';
import QuizResults from '../components/ui/QuizResults';
import {
  generateQuiz,
  generateAdaptiveQuiz,
  saveQuiz,
  getQuiz,
  saveAttempt,
  extractDocumentText
} from '../services/api';
import { saveQuizAttempt } from '../utils/storage';

const DIFFICULTIES    = ['Easy', 'Medium', 'Hard', 'Mixed'];
const QUESTION_TYPES  = [
  'Multiple Choice',
  'True / False',
  'Scenario-Based',
  'Case-Based MCQ',
  'Numerical / Calculation',
  'Mixed Types',
];
const LANGUAGES       = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Chinese'];
const TIME_LIMITS     = ['No limit', '3 minutes', '5 minutes', '10 minutes', '15 minutes', '20 minutes', '30 minutes'];

const QUICK_TOPICS = [
  { subject: 'Biology', topic: 'Photosynthesis & Plant Biology', type: 'Multiple Choice' },
  { subject: 'History', topic: 'Ancient Rome & Gladiators', type: 'Scenario-Based' },
  { subject: 'Medicine', topic: 'Emergency Triage & Patient Assessment', type: 'Case-Based MCQ' },
  { subject: 'Physics', topic: 'Kinematics & Projectile Motion', type: 'Numerical / Calculation' },
  { subject: 'Computer Science', topic: 'Binary Search & Big-O Notation', type: 'Mixed Types' },
];

const DEFAULT_FORM = {
  subject:            'Biology',
  topic:              'Photosynthesis',
  sourceMaterial:     '',
  questionCount:      '5',
  difficulty:         'Medium',
  questionType:       'Multiple Choice',
  language:           'English',
  timeLimit:          'No limit',
  enableHints:        true,
  enableExplanations: true,
};

// Map form display values to API values
const DIFFICULTY_MAP = {
  'Easy': 'easy', 'Medium': 'medium', 'Hard': 'hard', 'Mixed': 'mixed',
};
const TYPE_MAP = {
  'Multiple Choice': 'mcq',
  'True / False': 'true_false',
  'Scenario-Based': 'scenario',
  'Case-Based MCQ': 'case_based',
  'Numerical / Calculation': 'numerical',
  'Mixed Types': 'mixed',
};

// Human-readable error messages for Gemini error codes
const ERROR_CODE_MESSAGES = {
  GEMINI_MISSING_KEY:    'The Gemini API key is not configured on the server. Add your key to server/.env and restart.',
  GEMINI_INVALID_KEY:    'The Gemini API key is invalid or has been revoked. Check your key in server/.env.',
  GEMINI_RATE_LIMIT:     'Rate limit reached. Please wait a moment and try again.',
  GEMINI_QUOTA_EXCEEDED: 'Your Gemini API quota is exceeded. Check your usage in Google AI Studio.',
  GEMINI_TIMEOUT:        'The request timed out. Gemini may be busy — please try again.',
  GEMINI_SAFETY_BLOCKED: 'This topic was blocked by Gemini safety filters. Try rephrasing or a different topic.',
  GEMINI_INVALID_RESPONSE: 'Gemini returned an unexpected response. A retry was already attempted. Please try again.',
  GEMINI_SERVICE_ERROR:  'The Gemini service encountered a temporary error. Please try again shortly.',
  GEMINI_INPUT_TOO_LONG: 'One of your inputs is too long. Please shorten it and try again.',
};

// ── Generating spinner ─────────────────────────────────────────────────────

function GeneratingScreen({ topic, subject, count, isAdaptive = false, onCancel }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const steps = [
    { title: 'Connecting to Gemini AI engine', desc: 'Authorizing request and initializing session' },
    { title: 'Extracting pedagogical concepts', desc: `Analyzing syllabus boundaries for ${subject} • ${topic}` },
    { title: 'Formulating questions & distractors', desc: 'Crafting options, hints, and step-by-step reasoning' },
    { title: 'Validating answer keys & schema', desc: 'Sanitizing JSON structure and deterministic verification' },
  ];

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 1800);
    const clockTimer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      clearInterval(stepTimer);
      clearInterval(clockTimer);
    };
  }, []);

  return (
    <div className="max-w-lg mx-auto py-12 px-4 animate-fade-in space-y-6">
      <Card className="p-6 sm:p-8 border-slate-200/90 shadow-card space-y-6 bg-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold border border-brand-100 mb-1.5">
              <Sparkles size={12} />
              {isAdaptive ? 'Adaptive Engine Active' : 'Quiz Synthesis in Progress'}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {isAdaptive ? 'Targeting Weak Concepts' : 'Generating Interactive Quiz'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {count} questions • {subject} • {topic}
            </p>
          </div>
          <div className="text-right tabular-nums">
            <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
              {elapsed}s
            </span>
          </div>
        </div>

        {/* Linear Step Progression */}
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const isDone = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            const isPending = idx > stepIndex;

            return (
              <div
                key={step.title}
                className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                  isCurrent ? 'bg-brand-50/70 border border-brand-100' : 'bg-transparent'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-brand-600 text-white animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-bold leading-none ${
                      isDone
                        ? 'text-emerald-900'
                        : isCurrent
                        ? 'text-brand-900'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 pt-2">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Cancel button */}
        {onCancel && (
          <div className="pt-2 text-center">
            <Button
              variant="ghost"
              size="xs"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-700"
            >
              Cancel & Return to Configuration
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Error card ─────────────────────────────────────────────────────────────

function ErrorCard({ error, errorCode, onRetry, onBack }) {
  const friendly = errorCode
    ? (ERROR_CODE_MESSAGES[errorCode] || error)
    : error;

  return (
    <div className="max-w-lg mx-auto animate-slide-up">
      <Card className="border-red-200 bg-red-50 p-6">
        <div className="flex gap-3">
          <AlertTriangle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-red-800 mb-1">Quiz generation failed</p>
            <p className="text-sm text-red-700 leading-relaxed">{friendly}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-red-200">
          <Button size="sm" variant="danger" onClick={onRetry}>
            <RefreshCw size={14} /> Try again
          </Button>
          <Button size="sm" variant="secondary" onClick={onBack}>
            ← Back to configuration
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CreateQuiz() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm]             = useState(DEFAULT_FORM);
  const [errors, setErrors]         = useState({});
  const [generating, setGenerating] = useState(false);
  const [isAdaptiveGen, setIsAdaptiveGen] = useState(false);

  // App mode: 'configure' | 'taking' | 'results' | 'preview'
  const [appMode, setAppMode]       = useState('configure');

  const [quiz, setQuiz]             = useState(null);
  const [scoreData, setScoreData]   = useState(null);
  const [improvements, setImprovements] = useState([]);
  const [gamification, setGamification] = useState(null);
  const [error, setError]           = useState(null);
  const [errorCode, setErrorCode]   = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);

  // Study Material states
  const [sourceTab, setSourceTab] = useState('upload'); // 'upload' | 'paste'
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadErrorCode, setUploadErrorCode] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const SAMPLE_STUDY_NOTES = `# Cellular Respiration: Glycolysis & The Citric Acid Cycle

1. Glycolysis occurs in the cytoplasm and breaks down one glucose molecule into two pyruvate molecules, yielding a net gain of 2 ATP and 2 NADH.
2. The committed, rate-limiting step of glycolysis is catalyzed by phosphofructokinase-1 (PFK-1), which is allosterically inhibited by high ATP levels and activated by AMP.
3. Pyruvate Oxidation: Pyruvate enters the mitochondrial matrix via the mitochondrial pyruvate carrier (MPC) and is converted to acetyl-CoA by the pyruvate dehydrogenase complex (PDC), producing 1 NADH and 1 CO2 per pyruvate.
4. Citric Acid Cycle (Krebs Cycle): Acetyl-CoA condenses with oxaloacetate to form citrate. Each turn yields 3 NADH, 1 FADH2, 1 GTP/ATP, and 2 CO2.
5. Oxidative Phosphorylation: Electrons from NADH and FADH2 pass through complexes I-IV in the inner mitochondrial membrane, pumping protons into the intermembrane space to drive ATP synthase.`;

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploadingFile(true);
    setUploadError(null);
    setUploadErrorCode(null);

    try {
      const res = await extractDocumentText(file);
      if (res && res.success && res.data) {
        setUploadedFile(res.data);
        setForm((f) => ({
          ...f,
          sourceMaterial: res.data.text,
          topic: (f.topic === 'Photosynthesis' || !f.topic.trim()) && res.data.fileName
            ? res.data.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
            : f.topic,
        }));
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to extract text from document.');
      setUploadErrorCode(err.code || 'EXTRACTION_FAILED');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClearSource = () => {
    setUploadedFile(null);
    setUploadError(null);
    setUploadErrorCode(null);
    setForm((f) => ({ ...f, sourceMaterial: '' }));
  };

  const handleLoadSampleNotes = () => {
    setUploadedFile({
      fileName: 'Cellular_Respiration_Lecture_Notes.md',
      fileType: 'MD',
      wordCount: 155,
      charCount: SAMPLE_STUDY_NOTES.length,
      truncated: false,
    });
    setForm((f) => ({
      ...f,
      subject: 'Biochemistry',
      topic: 'Cellular Respiration',
      sourceMaterial: SAMPLE_STUDY_NOTES,
    }));
  };

  // Auto-fill from query params (e.g. from Dashboard or MyQuizzes)
  useEffect(() => {
    const quizIdParam = searchParams.get('quizId');
    if (quizIdParam) {
      setGenerating(true);
      getQuiz(quizIdParam)
        .then((res) => {
          if (res && res.data) {
            setQuiz(res.data);
            setScoreData(null);
            setImprovements([]);
            setAppMode('taking');
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load quiz');
        })
        .finally(() => {
          setGenerating(false);
        });
      return;
    }

    const topicParam = searchParams.get('topic');
    const subjectParam = searchParams.get('subject');
    const conceptsParam = searchParams.get('concepts');

    if (topicParam || subjectParam) {
      setForm((f) => ({
        ...f,
        topic: topicParam || f.topic,
        subject: subjectParam || f.subject,
      }));
    }
  }, [searchParams]);

  const set = (key) => (e) => {
    const val = e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) {
      setErrors((errs) => ({ ...errs, [key]: null }));
    }
  };

  const toggle = (key) => () => setForm((f) => ({ ...f, [key]: !f[key] }));

  const applyQuickTopic = (item) => {
    setForm((f) => ({
      ...f,
      subject: item.subject,
      topic: item.topic,
      questionType: item.type || f.questionType,
    }));
    setErrors({});
  };

  // ── Generation logic ─────────────────────────────────────────────────────

  const validate = () => {
    const newErrors = {};
    if (!form.subject.trim()) newErrors.subject = 'Please enter a subject.';
    if (!form.topic.trim()) newErrors.topic = 'Please enter a topic.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const doGenerate = async () => {
    if (!validate()) return;

    setError(null);
    setErrorCode(null);
    setGenerating(true);
    setIsAdaptiveGen(false);
    setQuiz(null);
    setScoreData(null);
    setImprovements([]);

    try {
      const payload = {
        subject:            form.subject.trim(),
        topic:              form.topic.trim(),
        sourceMaterial:     form.sourceMaterial.trim(),
        questionCount:      parseInt(form.questionCount, 10) || 5,
        difficulty:         DIFFICULTY_MAP[form.difficulty] || 'medium',
        questionType:       TYPE_MAP[form.questionType]    || 'mcq',
        language:           form.language,
        enableHints:        form.enableHints,
        enableExplanations: form.enableExplanations,
      };

      const response = await generateQuiz(payload);

      if (!response.success || !response.data) {
        throw new Error('Unexpected response from server.');
      }

      // Attach timeLimit config to quiz object
      let fullQuiz = {
        ...response.data,
        timeLimit: form.timeLimit,
      };

      // Persist to database
      try {
        const savedRes = await saveQuiz(fullQuiz);
        if (savedRes && savedRes.data) {
          fullQuiz = {
            ...fullQuiz,
            ...savedRes.data,
            questions: (Array.isArray(savedRes.data.questions) && savedRes.data.questions.length > 0)
              ? savedRes.data.questions
              : fullQuiz.questions,
            timeLimit: form.timeLimit,
          };
        }
      } catch (saveErr) {
        console.warn('Could not persist quiz to SQLite:', saveErr);
      }

      setQuiz(fullQuiz);
      setAppMode('taking'); // start taking the quiz immediately
    } catch (err) {
      const msg = err.message || '';
      const knownCode = Object.keys(ERROR_CODE_MESSAGES).find((code) => msg.includes(code));
      setError(msg);
      setErrorCode(knownCode || null);
    } finally {
      setGenerating(false);
    }
  };

  // ── Adaptive Practice Generation ─────────────────────────────────────────
  const handlePracticeAdaptive = async (weakConcepts = [], targetDifficulty = 'medium') => {
    if (!quiz) return;

    setError(null);
    setErrorCode(null);
    setAdaptiveLoading(true);
    setGenerating(true);
    setIsAdaptiveGen(true);

    try {
      const previousQuestions = (quiz.questions || []).map((q) => q.question);
      const previousScoreStr = scoreData ? `${scoreData.scoreFraction} (${scoreData.percentage}%)` : '';

      const payload = {
        subject:            quiz.subject,
        topic:              quiz.topic,
        weakConcepts,
        previousQuestions,
        previousScore:      previousScoreStr,
        previousDifficulty: quiz.difficulty || 'medium',
        targetDifficulty:   targetDifficulty || 'medium',
        questionCount:      5,
        language:           form.language || 'English',
        enableHints:        form.enableHints,
        enableExplanations: form.enableExplanations,
      };

      const response = await generateAdaptiveQuiz(payload);

      if (!response.success || !response.data) {
        throw new Error('Unexpected response from server for adaptive quiz.');
      }

      let fullAdaptiveQuiz = {
        ...response.data,
        timeLimit: form.timeLimit,
        isAdaptive: true,
        targetedConcepts: weakConcepts,
      };

      // Persist to database
      try {
        const savedRes = await saveQuiz(fullAdaptiveQuiz);
        if (savedRes && savedRes.data) {
          fullAdaptiveQuiz = { ...savedRes.data, timeLimit: form.timeLimit, isAdaptive: true, targetedConcepts: weakConcepts };
        }
      } catch (saveErr) {
        console.warn('Could not persist adaptive quiz to SQLite:', saveErr);
      }

      setQuiz(fullAdaptiveQuiz);
      setScoreData(null);
      setAppMode('taking');
    } catch (err) {
      const msg = err.message || '';
      const knownCode = Object.keys(ERROR_CODE_MESSAGES).find((code) => msg.includes(code));
      setError(msg);
      setErrorCode(knownCode || null);
    } finally {
      setGenerating(false);
      setAdaptiveLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    setErrorCode(null);
    try {
      const payload = {
        subject:            form.subject.trim(),
        topic:              form.topic.trim(),
        sourceMaterial:     form.sourceMaterial.trim(),
        questionCount:      parseInt(form.questionCount, 10) || 5,
        difficulty:         DIFFICULTY_MAP[form.difficulty] || 'medium',
        questionType:       TYPE_MAP[form.questionType]    || 'mcq',
        language:           form.language,
        enableHints:        form.enableHints,
        enableExplanations: form.enableExplanations,
      };
      const response = await generateQuiz(payload);
      if (!response.success || !response.data) throw new Error('Unexpected response from server.');

      let fullQuiz = {
        ...response.data,
        timeLimit: form.timeLimit,
      };

      try {
        const savedRes = await saveQuiz(fullQuiz);
        if (savedRes && savedRes.data) {
          fullQuiz = { ...savedRes.data, timeLimit: form.timeLimit };
        }
      } catch (saveErr) {
        console.warn('Could not persist quiz to SQLite:', saveErr);
      }

      setQuiz(fullQuiz);
      setScoreData(null);
      setImprovements([]);
      setAppMode('taking');
    } catch (err) {
      const msg = err.message || '';
      const knownCode = Object.keys(ERROR_CODE_MESSAGES).find((code) => msg.includes(code));
      setError(msg);
      setErrorCode(knownCode || null);
      setQuiz(null);
    } finally {
      setRegenerating(false);
    }
  };

  const handleBackToConfig = () => {
    setQuiz(null);
    setScoreData(null);
    setImprovements([]);
    setError(null);
    setErrorCode(null);
    setGenerating(false);
    setAppMode('configure');
  };

  const handleQuizCompleted = async (calculatedScore) => {
    setScoreData(calculatedScore);

    let backendGamification = null;

    // Save attempt to backend SQLite database
    try {
      const attemptPayload = {
        quizId: quiz?.id || null,
        score: calculatedScore.correctCount,
        totalQuestions: calculatedScore.totalQuestions,
        percentage: calculatedScore.percentage,
        correctCount: calculatedScore.correctCount,
        incorrectCount: calculatedScore.incorrectCount,
        unansweredCount: calculatedScore.unansweredCount,
        timeTaken: calculatedScore.timeTaken || 0,
        subject: quiz?.subject || 'General',
        topic: quiz?.topic || 'General',
        difficulty: quiz?.difficulty || 'medium',
        isAdaptive: Boolean(quiz?.isAdaptive),
        answers: (calculatedScore.questionReview || []).map((q, idx) => ({
          questionId: q.id || (quiz?.questions && quiz.questions[idx] ? quiz.questions[idx].id : null),
          selectedAnswer: q.userAnswer || q.selectedAnswer || null,
          isCorrect: Boolean(q.isCorrect),
          concept: q.concept || quiz?.topic || 'General',
          type: q.type || (quiz?.questions && quiz.questions[idx] ? quiz.questions[idx].type : 'mcq'),
          timeTaken: 0,
        })),
      };

      const res = await saveAttempt(attemptPayload);
      if (res && res.data) {
        backendGamification = {
          xpEarned: res.data.xpEarned,
          xpBreakdown: res.data.xpBreakdown,
          levelProgress: res.data.levelProgress,
          streakInfo: res.data.streakInfo,
          newAchievements: res.data.newAchievements || []
        };
      }
    } catch (saveErr) {
      console.warn('Failed to save attempt to SQLite:', saveErr);
    }

    // Save attempt to local persistence & calculate real concept improvements
    const { improvements: calculatedImprovements, gamification: localGamification } = saveQuizAttempt({
      quizTitle: quiz?.title || 'Quiz',
      subject: quiz?.subject || 'General',
      topic: quiz?.topic || 'General',
      difficulty: quiz?.difficulty || 'medium',
      scoreData: calculatedScore,
      isAdaptive: quiz?.isAdaptive,
      targetedConcepts: quiz?.targetedConcepts || [],
    });

    setGamification(backendGamification || localGamification);
    setImprovements(calculatedImprovements || []);
    setAppMode('results');
  };

  const handleTryAgain = () => {
    setScoreData(null);
    setImprovements([]);
    setGamification(null);
    setAppMode('taking');
  };

  const handlePracticeRecommendedTopic = (recommendedTopic, recommendedDifficulty) => {
    if (recommendedTopic) {
      const diffLabel = (recommendedDifficulty || 'Medium').charAt(0).toUpperCase() + (recommendedDifficulty || 'Medium').slice(1);
      setForm((f) => ({
        ...f,
        topic: recommendedTopic,
        difficulty: ['Easy', 'Medium', 'Hard'].includes(diffLabel) ? diffLabel : f.difficulty,
      }));
    }
    handleBackToConfig();
  };

  // ── Render states ────────────────────────────────────────────────────────

  // Generating spinner
  if (generating) {
    return (
      <div className="page-container max-w-4xl">
        <GeneratingScreen
          topic={form.topic}
          subject={form.subject}
          count={form.questionCount}
          isAdaptive={isAdaptiveGen}
          onCancel={handleBackToConfig}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page-container max-w-4xl space-y-6">
        <div>
          <h1 className="section-title">Create a New Quiz</h1>
          <p className="section-subtitle">Configure your quiz and Gemini AI will generate the questions.</p>
        </div>
        <ErrorCard
          error={error}
          errorCode={errorCode}
          onRetry={doGenerate}
          onBack={handleBackToConfig}
        />
      </div>
    );
  }

  // ── 🏆 RESULTS SCREEN ─────────────────────────────────────────────────────
  if (appMode === 'results' && quiz && scoreData) {
    return (
      <div className="page-container max-w-4xl space-y-6">
        <QuizResults
          quiz={quiz}
          scoreData={scoreData}
          improvements={improvements}
          gamification={gamification}
          onTryAgain={handleTryAgain}
          onPracticeWeakAreas={handlePracticeAdaptive}
          onPracticeRecommendedTopic={handlePracticeRecommendedTopic}
          isAdaptiveLoading={adaptiveLoading}
        />
      </div>
    );
  }

  // ── 📝 ACTIVE QUIZ SESSION ────────────────────────────────────────────────
  if (appMode === 'taking' && quiz) {
    return (
      <div className="page-container max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            {quiz.isAdaptive ? (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <Zap size={14} /> Adaptive Practice Session
              </span>
            ) : (
              'Interactive Quiz Session'
            )}
          </span>
          <button
            onClick={() => setAppMode('preview')}
            className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
          >
            <Eye size={14} /> View Answer Key & Explanations
          </button>
        </div>

        <TakeQuiz
          quiz={quiz}
          onComplete={handleQuizCompleted}
          onCancel={handleBackToConfig}
        />
      </div>
    );
  }

  // ── 🔍 PREVIEW / ANSWER KEY MODE ──────────────────────────────────────────
  if (appMode === 'preview' && quiz) {
    return (
      <div className="page-container max-w-4xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h1 className="section-title">Quiz Answer Key & Preview</h1>
            <p className="section-subtitle">
              Review questions, reveal correct answers, and test explanations.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={() => setAppMode('taking')}>
            <PlayCircle size={16} /> Take Quiz Now
          </Button>
        </div>

        <QuizPreview
          quiz={quiz}
          onBack={handleBackToConfig}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
        />
      </div>
    );
  }

  // ── ⚙️ CONFIGURATION SCREEN ───────────────────────────────────────────────
  return (
    <div className="page-container max-w-4xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Create a New Quiz</h1>
          <p className="section-subtitle">Configure your topic and let Gemini AI craft interactive questions.</p>
        </div>

        {/* Quick generate CTA button */}
        <Button size="lg" onClick={doGenerate} className="sm:w-auto shadow-md">
          <Sparkles size={18} />
          Generate & Start Quiz
        </Button>
      </div>

      {/* Quick starter topic chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-500">
        <span className="flex items-center gap-1 font-medium text-slate-700 whitespace-nowrap">
          <Zap size={13} className="text-brand-600" /> Quick Topics:
        </span>
        {QUICK_TOPICS.map((item) => (
          <button
            key={item.topic}
            type="button"
            onClick={() => applyQuickTopic(item)}
            className="px-3 py-1 rounded-full border border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors whitespace-nowrap text-slate-600 cursor-pointer"
          >
            {item.topic}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Main form ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Subject & Topic</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Subject"
                placeholder="e.g. Biology, Mathematics, History"
                value={form.subject}
                onChange={set('subject')}
                error={errors.subject}
                required
              />
              <Input
                label="Topic"
                placeholder="e.g. Photosynthesis, Quadratic Equations"
                value={form.topic}
                onChange={set('topic')}
                error={errors.topic}
                required
              />
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <label className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <BookOpen size={16} className="text-brand-600" />
                    Study Material & Documents
                    <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload documents or paste notes — Gemini will prioritize and cite your supplied material.
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSourceTab('upload')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      sourceTab === 'upload'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud size={13} className="inline mr-1" />
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceTab('paste')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      sourceTab === 'paste'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText size={13} className="inline mr-1" />
                    Paste Notes
                  </button>
                </div>
              </div>

              {/* TAB 1: FILE UPLOAD */}
              {sourceTab === 'upload' && (
                <div className="space-y-3">
                  {!uploadedFile && !uploadingFile && (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`relative rounded-2xl border-2 border-dashed transition-all p-6 text-center flex flex-col items-center justify-center gap-3 ${
                        isDragOver
                          ? 'border-brand-500 bg-brand-50/60 scale-[1.01]'
                          : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50/60 bg-slate-50/30'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                        <UploadCloud size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Drop your study document here, or{' '}
                          <label className="text-brand-600 hover:underline cursor-pointer font-bold">
                            browse files
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.docx,.txt,.md,.markdown,.json,.csv"
                              onChange={(e) => handleFileUpload(e.target.files?.[0])}
                            />
                          </label>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Supports <strong>PDF, Word (.docx), Markdown (.md), Plain Text (.txt)</strong> (up to 10MB)
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-slate-400">or</span>
                        <button
                          type="button"
                          onClick={handleLoadSampleNotes}
                          className="text-xs text-brand-600 hover:underline font-medium cursor-pointer"
                        >
                          Try sample lecture notes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Uploading Spinner */}
                  {uploadingFile && (
                    <div className="p-8 rounded-2xl border border-brand-200 bg-brand-50/40 text-center flex flex-col items-center justify-center gap-2 animate-fade-in">
                      <Loader2 size={28} className="text-brand-600 animate-spin" />
                      <p className="text-sm font-semibold text-slate-800">Extracting text from document…</p>
                      <p className="text-xs text-slate-500">Parsing structure, pages, and content safely in-memory</p>
                    </div>
                  )}

                  {/* Uploaded File Banner */}
                  {uploadedFile && (
                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-4 animate-slide-up">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {uploadedFile.fileName}
                            </p>
                            <Badge colour="green">
                              {uploadedFile.fileType}
                            </Badge>
                            {uploadedFile.truncated && (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                Truncated (50k chars)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {uploadedFile.wordCount} words • {uploadedFile.charCount.toLocaleString()} characters extracted and grounded
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={handleClearSource}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove document"
                          aria-label="Remove uploaded document"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Extraction Error Alert */}
                  {uploadError && (
                    <div role="alert" className="p-4 rounded-2xl border border-red-200 bg-red-50 flex items-start gap-3 animate-slide-up">
                      <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-red-800">Document Extraction Issue</p>
                        <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{uploadError}</p>
                        {uploadErrorCode === 'SCANNED_PDF' && (
                          <div className="mt-2 pt-2 border-t border-red-200 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSourceTab('paste')}
                              className="text-xs font-bold text-red-800 underline cursor-pointer"
                            >
                              Switch to Paste Notes
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PASTE NOTES */}
              {sourceTab === 'paste' && (
                <div className="space-y-2">
                  <Textarea
                    rows={6}
                    placeholder="Paste lecture notes, textbook chapters, or summary articles here. Gemini will generate factually grounded questions strictly from your content..."
                    value={form.sourceMaterial}
                    onChange={set('sourceMaterial')}
                    className="font-mono text-xs leading-relaxed"
                    aria-label="Study Material and Notes"
                  />

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                    <div className="flex items-center gap-3">
                      <span>
                        {form.sourceMaterial.length.toLocaleString()} / 50,000 characters
                      </span>
                      <span>•</span>
                      <span>
                        {form.sourceMaterial.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleLoadSampleNotes}
                        className="text-brand-600 hover:underline font-medium cursor-pointer"
                      >
                        Load Sample Biology Notes
                      </button>
                      {form.sourceMaterial && (
                        <button
                          type="button"
                          onClick={handleClearSource}
                          className="text-red-500 hover:underline font-medium cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Quiz Configuration</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Number of Questions
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="3" max="25" step="1"
                    value={form.questionCount}
                    onChange={set('questionCount')}
                    className="flex-1 accent-brand-600"
                  />
                  <span className="w-10 text-center text-sm font-semibold text-brand-600 bg-brand-50 rounded-lg py-1">
                    {form.questionCount}
                  </span>
                </div>
              </div>
              <Select label="Difficulty" value={form.difficulty} onChange={set('difficulty')}>
                {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </Select>
              <Select label="Question Type" value={form.questionType} onChange={set('questionType')}>
                {QUESTION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
              <Select label="Language" value={form.language} onChange={set('language')}>
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </Select>
              <Select label="Time Limit" value={form.timeLimit} onChange={set('timeLimit')}>
                {TIME_LIMITS.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Learning Options</h2>
            <div className="space-y-3">
              {[
                { key: 'enableHints',        icon: Lightbulb,     label: 'Enable Hints',        desc: 'Gemini provides an answer-neutral clue for each question.' },
                { key: 'enableExplanations', icon: MessageSquare, label: 'Enable Explanations', desc: 'Gemini provides a concise explanation for the correct answer.' },
              ].map(({ key, icon: Icon, label, desc }) => (
                <label
                  key={key}
                  className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={form[key]}
                    onClick={toggle(key)}
                    type="button"
                    className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${form[key] ? 'bg-brand-600' : 'bg-slate-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </label>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Sidebar Summary & Action ──────────────────────────────────── */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-brand-600 to-purple-600 text-white border-0 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} />
              <span className="text-sm font-semibold">Quiz Summary</span>
            </div>
            {[
              { label: 'Subject',   value: form.subject || '—' },
              { label: 'Topic',     value: form.topic || '—' },
              { label: 'Questions', value: form.questionCount },
              { label: 'Difficulty', value: form.difficulty },
              { label: 'Type',      value: form.questionType },
              { label: 'Language',  value: form.language },
              { label: 'Time Limit', value: form.timeLimit },
              { label: 'Hints',        value: form.enableHints ? 'Enabled' : 'Disabled' },
              { label: 'Explanations', value: form.enableExplanations ? 'Enabled' : 'Disabled' },
              { label: 'Source Material', value: form.sourceMaterial ? (uploadedFile ? `Attached (${uploadedFile.fileType})` : 'Notes Attached') : 'None' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs py-1.5 border-b border-white/10 last:border-0">
                <span className="text-white/70">{label}</span>
                <span className="font-medium truncate max-w-[130px]">{value}</span>
              </div>
            ))}
          </Card>

          {/* Primary Action Button */}
          <Button
            className="w-full shadow-md cursor-pointer"
            size="lg"
            onClick={doGenerate}
          >
            <Sparkles size={18} />
            Generate & Start Quiz
          </Button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Questions will be generated using Gemini AI and scored automatically by AI QuizForge.
          </p>
        </div>
      </div>
    </div>
  );
}
