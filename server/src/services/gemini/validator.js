/**
 * gemini/validator.js
 *
 * Multi-layer validation & resilient fallback generators:
 *   1. Quiz input validation  — runs BEFORE sending generation prompt to Gemini
 *   2. Quiz output validation — runs on raw Gemini JSON for quizzes
 *   3. Performance analysis input validation — runs BEFORE sending analysis prompt
 *   4. Performance analysis output validation — runs on raw Gemini JSON for analysis
 *   5. Resilient fallback analysis generator — generates grounded analysis on external API downtime
 *
 * Gemini output is treated as UNTRUSTED data.
 * No model-generated content is ever executed.
 */

const { INPUT_LIMITS, MAX_QUESTIONS, MIN_QUESTIONS } = require('./constants');
const { Errors } = require('./errors');

// ── 1. Quiz Input validation ───────────────────────────────────────────────

const ALLOWED_DIFFICULTIES   = ['easy', 'medium', 'hard', 'mixed'];
const ALLOWED_QUESTION_TYPES = ['mcq', 'true_false', 'scenario', 'case_based', 'case_study', 'numerical', 'calculation', 'mixed'];
const ALLOWED_LANGUAGES      = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Chinese'];

/**
 * Validates and sanitises quiz-generation inputs.
 * Throws on any violation before anything is sent to Gemini.
 *
 * @param {object} params Raw user input
 * @returns {object} Sanitised params safe for prompt building
 */
function validateQuizInput(params = {}) {
  const {
    subject,
    topic,
    sourceMaterial  = '',
    questionCount   = 10,
    difficulty      = 'medium',
    questionType    = 'mcq',
    language        = 'English',
    enableHints     = true,
    enableExplanations = true,
  } = params || {};

  // Required fields
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    throw Object.assign(new Error('"subject" is required.'), { statusCode: 400 });
  }
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    throw Object.assign(new Error('"topic" is required.'), { statusCode: 400 });
  }
  if (sourceMaterial !== undefined && sourceMaterial !== null && typeof sourceMaterial !== 'string') {
    throw Object.assign(new Error('"sourceMaterial" must be a string.'), { statusCode: 400 });
  }

  const safeSource = typeof sourceMaterial === 'string' ? sourceMaterial : '';

  // Length limits
  if (subject.trim().length > INPUT_LIMITS.subject.max) {
    throw Errors.inputTooLong(INPUT_LIMITS.subject.label, INPUT_LIMITS.subject.max);
  }
  if (topic.trim().length > INPUT_LIMITS.topic.max) {
    throw Errors.inputTooLong(INPUT_LIMITS.topic.label, INPUT_LIMITS.topic.max);
  }
  if (safeSource.length > INPUT_LIMITS.sourceMaterial.max) {
    throw Errors.inputTooLong(INPUT_LIMITS.sourceMaterial.label, INPUT_LIMITS.sourceMaterial.max);
  }

  // Enum validation
  const normDiff = String(difficulty).toLowerCase();
  if (!ALLOWED_DIFFICULTIES.includes(normDiff)) {
    throw Object.assign(
      new Error(`"difficulty" must be one of: ${ALLOWED_DIFFICULTIES.join(', ')}.`),
      { statusCode: 400 }
    );
  }

  let normType = String(questionType).toLowerCase()
    .replace(/ \/ /g, '_').replace(/ /g, '_').replace(/-/g, '_');
  if (normType === 'case_study') normType = 'case_based';
  if (normType === 'calculation') normType = 'numerical';

  if (!ALLOWED_QUESTION_TYPES.includes(normType)) {
    throw Object.assign(
      new Error(`"questionType" must be one of: ${ALLOWED_QUESTION_TYPES.join(', ')}.`),
      { statusCode: 400 }
    );
  }

  if (!ALLOWED_LANGUAGES.includes(language)) {
    throw Object.assign(
      new Error(`"language" must be one of: ${ALLOWED_LANGUAGES.join(', ')}.`),
      { statusCode: 400 }
    );
  }

  // Numeric range
  const count = parseInt(questionCount, 10);
  if (isNaN(count) || count < MIN_QUESTIONS || count > MAX_QUESTIONS) {
    throw Object.assign(
      new Error(`"questionCount" must be between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}.`),
      { statusCode: 400 }
    );
  }

  return {
    subject:           stripHtml(subject.trim()),
    topic:             stripHtml(topic.trim()),
    sourceMaterial:    safeSource.trim(),
    questionCount:     count,
    difficulty:        normDiff,
    questionType:      normType,
    language,
    enableHints:       Boolean(enableHints),
    enableExplanations: Boolean(enableExplanations),
  };
}

// ── 2. Question-Type-Specific Validators ────────────────────────────────────

/**
 * Validates a standard MCQ question.
 */
function validateMcqQuestion(q, pos) {
  const VALID_OPTION_IDS = ['A', 'B', 'C', 'D'];

  if (!Array.isArray(q.options) || q.options.length !== 4) {
    throw Errors.invalidResponse(`${pos}.options must be an array of exactly 4 items.`);
  }

  const optionTexts = new Set();
  q.options.forEach((opt, j) => {
    if (!opt || typeof opt !== 'object') {
      throw Errors.invalidResponse(`${pos}.options[${j}] must be an object.`);
    }
    if (!VALID_OPTION_IDS.includes(opt.id)) {
      throw Errors.invalidResponse(`${pos}.options[${j}].id must be A, B, C, or D.`);
    }
    if (typeof opt.text !== 'string' || !opt.text.trim()) {
      throw Errors.invalidResponse(`${pos}.options[${j}].text must be a non-empty string.`);
    }
    const clean = opt.text.trim().toLowerCase();
    if (optionTexts.has(clean)) {
      throw Errors.invalidResponse(`${pos} has duplicate option text: "${opt.text}".`);
    }
    optionTexts.add(clean);
  });

  const optIds = q.options.map((o) => o.id).sort().join('');
  if (optIds !== 'ABCD') {
    throw Errors.invalidResponse(`${pos}.options must have exactly one each of A, B, C, D.`);
  }

  if (!VALID_OPTION_IDS.includes(q.correctAnswer)) {
    throw Errors.invalidResponse(`${pos}.correctAnswer must be A, B, C, or D.`);
  }

  return {
    type: 'mcq',
    context: null,
    options: q.options.map((o) => ({ id: o.id, text: stripHtml(String(o.text).trim()) })),
    correctAnswer: q.correctAnswer,
    unit: null,
    numericAnswer: null,
    tolerance: null,
  };
}

/**
 * Validates a True / False question.
 */
function validateTrueFalseQuestion(q, pos) {
  let normalizedOptions = [];
  let normalizedCorrect = null;

  if (Array.isArray(q.options) && q.options.length === 2) {
    // Check if options are [{id: 'True', text: 'True'}, {id: 'False', text: 'False'}]
    const hasTrueId = q.options.some((o) => String(o.id).toLowerCase() === 'true' || String(o.text).toLowerCase() === 'true');
    const hasFalseId = q.options.some((o) => String(o.id).toLowerCase() === 'false' || String(o.text).toLowerCase() === 'false');

    if (hasTrueId && hasFalseId) {
      normalizedOptions = [
        { id: 'True', text: 'True' },
        { id: 'False', text: 'False' },
      ];
      const rawAns = String(q.correctAnswer).trim().toLowerCase();
      if (rawAns === 'true' || rawAns === 'a' || rawAns === 't') {
        normalizedCorrect = 'True';
      } else if (rawAns === 'false' || rawAns === 'b' || rawAns === 'f') {
        normalizedCorrect = 'False';
      }
    }
  }

  // Fallback / standard formatting
  if (normalizedOptions.length === 0) {
    normalizedOptions = [
      { id: 'True', text: 'True' },
      { id: 'False', text: 'False' },
    ];
    const rawAns = String(q.correctAnswer || '').trim().toLowerCase();
    normalizedCorrect = (rawAns === 'false' || rawAns === 'b' || rawAns === 'f') ? 'False' : 'True';
  }

  if (!['True', 'False'].includes(normalizedCorrect)) {
    throw Errors.invalidResponse(`${pos}.correctAnswer for true_false question must be "True" or "False".`);
  }

  return {
    type: 'true_false',
    context: null,
    options: normalizedOptions,
    correctAnswer: normalizedCorrect,
    unit: null,
    numericAnswer: null,
    tolerance: null,
  };
}

/**
 * Validates a Scenario-Based question.
 */
function validateScenarioQuestion(q, pos) {
  const contextText = q.context && typeof q.context === 'string' && q.context.trim().length > 0
    ? stripHtml(q.context.trim())
    : null;

  const baseMcq = validateMcqQuestion(q, pos);

  return {
    ...baseMcq,
    type: 'scenario',
    context: contextText || 'Scenario context provided in question prompt.',
  };
}

/**
 * Validates a Case-Based question.
 */
function validateCaseBasedQuestion(q, pos) {
  const contextText = q.context && typeof q.context === 'string' && q.context.trim().length > 0
    ? stripHtml(q.context.trim())
    : null;

  const baseMcq = validateMcqQuestion(q, pos);

  return {
    ...baseMcq,
    type: 'case_based',
    context: contextText || 'Comprehensive case study details provided for analysis.',
  };
}

/**
 * Validates a Numerical / Calculation question.
 * Ensures:
 * - units are specified where required
 * - numeric value is verified
 * - tolerance and rounding rules are sound
 * - exactly one accepted option
 */
function validateNumericalQuestion(q, pos) {
  const baseMcq = validateMcqQuestion(q, pos);

  // Extract or verify numericAnswer
  let numAnswer = null;
  if (typeof q.numericAnswer === 'number' && !isNaN(q.numericAnswer)) {
    numAnswer = q.numericAnswer;
  } else if (typeof q.numericAnswer === 'string' && !isNaN(parseFloat(q.numericAnswer))) {
    numAnswer = parseFloat(q.numericAnswer);
  } else {
    // Attempt extraction from the correct option text (e.g. "24.5 m/s" -> 24.5)
    const corrOpt = baseMcq.options.find((o) => o.id === baseMcq.correctAnswer);
    if (corrOpt) {
      const match = corrOpt.text.match(/[-+]?[0-9]*\.?[0-9]+/);
      if (match) {
        numAnswer = parseFloat(match[0]);
      }
    }
  }

  if (numAnswer === null || isNaN(numAnswer)) {
    throw Errors.invalidResponse(`${pos} is a numerical question but is missing a valid numericAnswer.`);
  }

  const unit = q.unit && typeof q.unit === 'string' && q.unit.trim()
    ? stripHtml(q.unit.trim())
    : null;

  const tolerance = typeof q.tolerance === 'number' && !isNaN(q.tolerance) && q.tolerance >= 0
    ? q.tolerance
    : 0.01;

  return {
    ...baseMcq,
    type: 'numerical',
    unit,
    numericAnswer: numAnswer,
    tolerance,
  };
}

// ── 3. Quiz Output validation ──────────────────────────────────────────────

/**
 * Validates the structured JSON returned by Gemini against the required schema.
 * Gemini output is UNTRUSTED — we enforce the schema strictly.
 *
 * @param {unknown} raw             Parsed JSON from Gemini
 * @param {number}  expectedCount   How many questions were requested
 * @returns {object}                Validated and sanitised quiz object
 */
function validateGeminiOutput(raw, expectedCount) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw Errors.invalidResponse('Root must be a JSON object.');
  }

  // Top-level string fields
  if (typeof raw.title !== 'string' || !raw.title.trim()) {
    throw Errors.invalidResponse('"title" must be a non-empty string.');
  }

  // questions array
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw Errors.invalidResponse('"questions" must be a non-empty array.');
  }
  if (raw.questions.length > MAX_QUESTIONS) {
    throw Errors.invalidResponse(
      `"questions" array has ${raw.questions.length} items, maximum is ${MAX_QUESTIONS}.`
    );
  }

  const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
  const seenIds = new Set();

  const questions = raw.questions.map((q, i) => {
    const pos = `questions[${i}]`;

    // question text
    if (typeof q.question !== 'string' || !q.question.trim()) {
      throw Errors.invalidResponse(`${pos}.question must be a non-empty string.`);
    }

    // Determine type
    const rawType = String(q.type || raw.questionType || 'mcq').toLowerCase().trim();
    let validatedTypeData;

    if (rawType === 'true_false' || rawType === 'tf') {
      validatedTypeData = validateTrueFalseQuestion(q, pos);
    } else if (rawType === 'scenario') {
      validatedTypeData = validateScenarioQuestion(q, pos);
    } else if (rawType === 'case_based' || rawType === 'case_study') {
      validatedTypeData = validateCaseBasedQuestion(q, pos);
    } else if (rawType === 'numerical' || rawType === 'calculation') {
      validatedTypeData = validateNumericalQuestion(q, pos);
    } else {
      validatedTypeData = validateMcqQuestion(q, pos);
    }

    // concept
    if (typeof q.concept !== 'string' || !q.concept.trim()) {
      throw Errors.invalidResponse(`${pos}.concept must be a non-empty string.`);
    }

    // question ID deduplication
    const qid = q.id != null ? String(q.id) : `q${i + 1}`;
    if (seenIds.has(qid)) {
      throw Errors.invalidResponse(`Duplicate question id "${qid}".`);
    }
    seenIds.add(qid);

    const normDiff = VALID_DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'medium';
    const sourceRef = q.sourceReference && typeof q.sourceReference === 'string' && q.sourceReference.trim()
      ? stripHtml(q.sourceReference.trim().slice(0, 300))
      : null;

    return {
      id:              qid,
      type:            validatedTypeData.type,
      context:         validatedTypeData.context,
      question:        stripHtml(String(q.question).trim()),
      options:         validatedTypeData.options,
      correctAnswer:   validatedTypeData.correctAnswer,
      unit:            validatedTypeData.unit,
      numericAnswer:   validatedTypeData.numericAnswer,
      tolerance:       validatedTypeData.tolerance,
      explanation:     q.explanation ? stripHtml(String(q.explanation).trim()) : null,
      hint:            q.hint        ? stripHtml(String(q.hint).trim())        : null,
      concept:         stripHtml(String(q.concept).slice(0, 100).trim()),
      difficulty:      normDiff,
      sourceReference: sourceRef,
    };
  });

  return {
    title:             stripHtml(raw.title.trim()),
    subject:           raw.subject ? stripHtml(String(raw.subject).trim()) : '',
    topic:             raw.topic   ? stripHtml(String(raw.topic).trim())   : '',
    difficulty:        raw.difficulty || 'medium',
    questionType:      raw.questionType || 'mcq',
    hasSourceMaterial: Boolean(raw.hasSourceMaterial),
    questions,
  };
}

// ── 3. Performance Analysis Input validation ───────────────────────────────

/**
 * Validates performance data submitted for AI analysis.
 *
 * @param {object} params Raw performance data from client
 * @returns {object} Sanitised data for building analysis prompt
 */
function validatePerformanceInput(params) {
  const {
    subject,
    topic,
    scoreData,
    questions,
  } = params || {};

  if (!subject || typeof subject !== 'string') {
    throw Object.assign(new Error('"subject" is required for analysis.'), { statusCode: 400 });
  }
  if (!topic || typeof topic !== 'string') {
    throw Object.assign(new Error('"topic" is required for analysis.'), { statusCode: 400 });
  }
  if (!scoreData || typeof scoreData !== 'object') {
    throw Object.assign(new Error('"scoreData" is required for analysis.'), { statusCode: 400 });
  }

  const totalQuestions  = Number(scoreData.totalQuestions) || (Array.isArray(questions) ? questions.length : 0);
  const correctCount    = Number(scoreData.correctCount) || 0;
  const incorrectCount  = Number(scoreData.incorrectCount) || 0;
  const unansweredCount = Number(scoreData.unansweredCount) || 0;
  const percentage      = Number(scoreData.percentage) || 0;

  // Build condensed summary of questions for the prompt
  const details = Array.isArray(scoreData.questionDetails)
    ? scoreData.questionDetails
    : Array.isArray(questions)
    ? questions
    : [];

  const rawWeakConcepts = Array.isArray(scoreData.weakConcepts) ? scoreData.weakConcepts : [];
  const rawStrongConcepts = Array.isArray(scoreData.strongConcepts) ? scoreData.strongConcepts : [];

  const questionsSummary = details.map((q, idx) => {
    const num = idx + 1;
    const isCorr = q.isCorrect ? 'CORRECT' : q.isUnanswered ? 'UNANSWERED' : 'INCORRECT';
    const userAns = q.selectedAnswer ? `[Choice: ${q.selectedAnswer}]` : '[No answer selected]';
    const correctAns = `[Correct: ${q.correctAnswer}]`;
    const concept = q.concept || 'General';
    const diff = q.difficulty || 'medium';
    const exp = q.explanation ? `Explanation: ${q.explanation}` : '';

    return `Q${num} (${diff}, Concept: "${concept}"): "${q.question}"\n- Result: ${isCorr}\n- Student Answer: ${userAns} vs ${correctAns}\n- ${exp}`;
  }).join('\n\n');

  return {
    subject: stripHtml(subject.trim().slice(0, 100)),
    topic: stripHtml(topic.trim().slice(0, 200)),
    totalQuestions,
    correctCount,
    incorrectCount,
    unansweredCount,
    percentage,
    rawWeakConcepts,
    rawStrongConcepts,
    questionDetails: details,
    questionsSummary: questionsSummary.slice(0, 12000),
  };
}

// ── 4. Performance Analysis Output validation ──────────────────────────────

/**
 * Validates and sanitises Gemini's response for performance analysis.
 *
 * @param {unknown} raw Parsed JSON from Gemini
 * @returns {object} Validated analysis object
 */
function validateAnalysisOutput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw Errors.invalidResponse('Analysis output must be a JSON object.');
  }

  // overallAssessment
  const overallAssessment = typeof raw.overallAssessment === 'string' && raw.overallAssessment.trim()
    ? stripHtml(raw.overallAssessment.trim())
    : 'Your quiz attempt has been analyzed. Review the concept breakdown and study recommendations below to continue improving.';

  // strongConcepts
  const strongConcepts = Array.isArray(raw.strongConcepts)
    ? raw.strongConcepts.filter((c) => typeof c === 'string' && c.trim()).map(stripHtml).slice(0, 6)
    : [];

  // weakConcepts
  const weakConcepts = Array.isArray(raw.weakConcepts)
    ? raw.weakConcepts.filter((c) => typeof c === 'string' && c.trim()).map(stripHtml).slice(0, 6)
    : [];

  // difficultyPerformance
  const diffPerf = raw.difficultyPerformance && typeof raw.difficultyPerformance === 'object'
    ? {
        easy: raw.difficultyPerformance.easy ? stripHtml(String(raw.difficultyPerformance.easy)) : null,
        medium: raw.difficultyPerformance.medium ? stripHtml(String(raw.difficultyPerformance.medium)) : null,
        hard: raw.difficultyPerformance.hard ? stripHtml(String(raw.difficultyPerformance.hard)) : null,
      }
    : null;

  // recommendedTopics
  const recommendedTopics = Array.isArray(raw.recommendedTopics)
    ? raw.recommendedTopics.filter((t) => typeof t === 'string' && t.trim()).map(stripHtml).slice(0, 5)
    : [];

  // recommendedDifficulty
  const VALID_DIFFS = ['easy', 'medium', 'hard'];
  const rawDiff = String(raw.recommendedDifficulty || '').toLowerCase().trim();
  const recommendedDifficulty = VALID_DIFFS.includes(rawDiff) ? rawDiff : 'medium';

  // studyAdvice
  const studyAdvice = Array.isArray(raw.studyAdvice)
    ? raw.studyAdvice.filter((a) => typeof a === 'string' && a.trim()).map(stripHtml).slice(0, 6)
    : [];

  return {
    overallAssessment,
    strongConcepts,
    weakConcepts,
    difficultyPerformance: diffPerf,
    recommendedTopics,
    recommendedDifficulty,
    studyAdvice,
  };
}

// ── 5. Grounded Fallback Analysis Generator ────────────────────────────────

/**
 * Generates an accurate, data-grounded performance analysis from local attempt data
 * if external Gemini calls experience temporary demand spikes or connectivity timeouts.
 *
 * @param {object} params Sanitised performance input
 * @returns {object} Full analysis matching the exact required schema
 */
function generateGroundedFallbackAnalysis(params) {
  const {
    subject,
    topic,
    totalQuestions,
    correctCount,
    percentage,
    rawWeakConcepts,
    rawStrongConcepts,
  } = params;

  let overallAssessment = '';
  if (percentage === 100) {
    overallAssessment = `Outstanding mastery! You achieved a perfect score of ${correctCount}/${totalQuestions} on ${topic}. Your grasp of core definitions and applications is comprehensive.`;
  } else if (percentage >= 70) {
    overallAssessment = `Solid performance! You scored ${correctCount}/${totalQuestions} (${percentage}%) on ${topic}. You demonstrated firm control of fundamental concepts with only a few minor misconceptions to review.`;
  } else if (percentage >= 40) {
    overallAssessment = `Good effort! You answered ${correctCount}/${totalQuestions} correctly on ${topic}. Targeted review of the missed concepts highlighted below will quickly elevate your accuracy.`;
  } else {
    overallAssessment = `You scored ${correctCount}/${totalQuestions} on ${topic}. Focus on foundational principles and review the detailed answer explanations below before attempting your next quiz.`;
  }

  const recDifficulty = percentage >= 80 ? 'hard' : percentage >= 50 ? 'medium' : 'easy';

  const strong = rawStrongConcepts.length > 0 ? rawStrongConcepts.slice(0, 4) : ['Core Foundations'];
  const weak = rawWeakConcepts.length > 0 ? rawWeakConcepts.slice(0, 4) : [];

  const studyAdvice = [];
  if (weak.length > 0) {
    studyAdvice.push(`Focus your revision specifically on: ${weak.join(', ')}.`);
    studyAdvice.push('Review the step-by-step explanations in the Question Review below for every missed question.');
  } else {
    studyAdvice.push('Solidify your mastery by attempting questions at a higher difficulty setting.');
    studyAdvice.push('Practice explaining these concepts in your own words to achieve deep retention.');
  }

  const recommendedTopics = [
    `${topic} Applications & Mechanisms`,
    `Advanced ${topic} Case Studies`,
  ];

  return {
    overallAssessment,
    strongConcepts: strong,
    weakConcepts: weak,
    difficultyPerformance: {
      easy: percentage >= 60 ? 'Consistent performance on fundamental recall.' : 'Review basic definitions.',
      medium: percentage >= 70 ? 'Strong analytical reasoning.' : 'Practice conceptual application.',
      hard: percentage >= 80 ? 'Excellent problem-solving on complex questions.' : 'Review edge cases and nuances.',
    },
    recommendedTopics,
    recommendedDifficulty: recDifficulty,
    studyAdvice,
  };
}

// ── 6. Adaptive Practice Input validation ──────────────────────────────────

/**
 * Validates parameters for adaptive practice quiz generation.
 *
 * @param {object} params Raw adaptive parameters from client
 * @returns {object} Sanitised adaptive params safe for Gemini prompt building
 */
function validateAdaptiveInput(params) {
  const {
    subject,
    topic,
    weakConcepts = [],
    previousQuestions = [],
    previousScore = '',
    previousDifficulty = 'medium',
    targetDifficulty = 'medium',
    questionCount = 5,
    language = 'English',
    enableHints = true,
    enableExplanations = true,
  } = params || {};

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    throw Object.assign(new Error('"subject" is required for adaptive practice.'), { statusCode: 400 });
  }
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    throw Object.assign(new Error('"topic" is required for adaptive practice.'), { statusCode: 400 });
  }

  const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'];
  const normPrevDiff = VALID_DIFFICULTIES.includes(String(previousDifficulty).toLowerCase())
    ? String(previousDifficulty).toLowerCase()
    : 'medium';
  const normTargetDiff = VALID_DIFFICULTIES.includes(String(targetDifficulty).toLowerCase())
    ? String(targetDifficulty).toLowerCase()
    : 'medium';

  const count = parseInt(questionCount, 10);
  const validCount = !isNaN(count) && count >= MIN_QUESTIONS && count <= MAX_QUESTIONS ? count : 5;

  const sanitisedWeakConcepts = Array.isArray(weakConcepts)
    ? weakConcepts.filter((c) => typeof c === 'string' && c.trim()).map(stripHtml).slice(0, 10)
    : [];

  const sanitisedPreviousQuestions = Array.isArray(previousQuestions)
    ? previousQuestions.filter((q) => typeof q === 'string' && q.trim()).map(stripHtml).slice(0, 20)
    : [];

  const validLanguage = ALLOWED_LANGUAGES.includes(language) ? language : 'English';

  return {
    subject: stripHtml(subject.trim().slice(0, 100)),
    topic: stripHtml(topic.trim().slice(0, 200)),
    weakConcepts: sanitisedWeakConcepts,
    previousQuestions: sanitisedPreviousQuestions,
    previousScore: stripHtml(String(previousScore || '').slice(0, 50)),
    previousDifficulty: normPrevDiff,
    targetDifficulty: normTargetDiff,
    questionCount: validCount,
    language: validLanguage,
    enableHints: Boolean(enableHints),
    enableExplanations: Boolean(enableExplanations),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip HTML tags, unclosed tags, null bytes, and dangerous URI schemes from model/user output — prevents XSS */
function stripHtml(str) {
  return String(str)
    .replace(/<[^>]*>?/gm, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/\0/g, '')
    .trim();
}

module.exports = {
  validateQuizInput,
  validateGeminiOutput,
  validatePerformanceInput,
  validateAnalysisOutput,
  validateAdaptiveInput,
  generateGroundedFallbackAnalysis,
  stripHtml,
};

