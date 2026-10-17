/**
 * gemini/constants.js
 *
 * All Gemini-related constants in one place.
 * Changing a model name or limit here affects the whole service.
 */

// Model to use for quiz generation
// gemini-3.8-flash: fastest and active model, supports JSON output
const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

// Hard limits applied BEFORE the prompt is sent (defence-in-depth)
const INPUT_LIMITS = {
  subject:        { max: 100,   label: 'Subject' },
  topic:          { max: 200,   label: 'Topic' },
  sourceMaterial: { max: 50000, label: 'Source material' },
};

// Gemini generation config
const GENERATION_CONFIG = {
  temperature:     0.3,   // low for factual, deterministic quiz content
  topP:            0.9,
  topK:            40,
  maxOutputTokens: 4096,
  // Force JSON output — supported in gemini-1.5-flash / gemini-3.6-flash
  responseMimeType: 'application/json',
};

// Request timeout in milliseconds (45 seconds to allow complex multi-question JSON generation)
const REQUEST_TIMEOUT_MS = 45_000;

// Error codes we map from Gemini/fetch errors
const ERROR_CODES = {
  MISSING_KEY:       'GEMINI_MISSING_KEY',
  INVALID_KEY:       'GEMINI_INVALID_KEY',
  RATE_LIMIT:        'GEMINI_RATE_LIMIT',
  QUOTA_EXCEEDED:    'GEMINI_QUOTA_EXCEEDED',
  TIMEOUT:           'GEMINI_TIMEOUT',
  INVALID_RESPONSE:  'GEMINI_INVALID_RESPONSE',
  SERVICE_ERROR:     'GEMINI_SERVICE_ERROR',
  INPUT_TOO_LONG:    'GEMINI_INPUT_TOO_LONG',
  SAFETY_BLOCKED:    'GEMINI_SAFETY_BLOCKED',
};

// Maximum quiz questions we allow (prevents abuse)
const MAX_QUESTIONS = 50;
const MIN_QUESTIONS = 1;

module.exports = {
  GEMINI_MODEL,
  GEMINI_FALLBACK_MODELS,
  INPUT_LIMITS,
  GENERATION_CONFIG,
  REQUEST_TIMEOUT_MS,
  ERROR_CODES,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
};
