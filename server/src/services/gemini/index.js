/**
 * gemini/index.js  —  Public API of the Gemini service layer
 *
 * This is the ONLY file that controllers should import.
 * Internal modules (client, prompt, validator, errors) are NOT exposed directly.
 *
 * Responsibilities:
 *   1. Validate input → build prompt → call Gemini → validate output
 *   2. Map all Gemini-specific errors to typed GeminiError instances
 *   3. Enforce request timeout on every call
 *   4. Retry on transient failures / schema errors
 *   5. Never leak the API key or raw model output untouched
 */

const { getGeminiModel, getClientStatus } = require('./client');
const { buildQuizPrompt, buildAnalysisPrompt, buildAdaptiveQuizPrompt } = require('./prompt');
const {
  validateQuizInput,
  validateGeminiOutput,
  validatePerformanceInput,
  validateAnalysisOutput,
  validateAdaptiveInput,
  generateGroundedFallbackAnalysis,
} = require('./validator');
const { Errors, GeminiError }             = require('./errors');
const { REQUEST_TIMEOUT_MS, ERROR_CODES } = require('./constants');

// Max automatic retries on schema validation failure or transient 503
const MAX_RETRIES = 1;

// ── Connection test ────────────────────────────────────────────────────────

/**
 * Sends a minimal controlled prompt to verify the API connection.
 * Used by the /api/v1/gemini/test endpoint.
 *
 * @returns {Promise<{ success: true, model: string, latencyMs: number }>}
 */
async function testConnection() {
  const model = getGeminiModel(); // throws GeminiError if key missing

  const TEST_PROMPT = `Respond with ONLY this exact JSON object, no other text:
{"ping":"pong","status":"ok"}`;

  const start = Date.now();
  let result;
  try {
    result = await withTimeout(
      model.generateContent(TEST_PROMPT),
      REQUEST_TIMEOUT_MS
    );
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    throw mapApiError(err);
  }

  const text = result.response.text().trim();

  let parsed;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw Errors.invalidResponse('Connection test: response was not valid JSON.');
  }

  if (parsed.ping !== 'pong') {
    throw Errors.invalidResponse('Connection test: unexpected JSON payload.');
  }

  return {
    success:   true,
    model:     getClientStatus().model,
    latencyMs: Date.now() - start,
  };
}

// ── Quiz generation ────────────────────────────────────────────────────────

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

/**
 * Generates an MCQ quiz via the Gemini API with automatic model cascade fallback.
 *
 * @param {object} rawParams  Unvalidated input from the HTTP request body
 * @returns {Promise<object>} Validated quiz object
 */
async function generateQuiz(rawParams) {
  // 1. Validate & sanitise input
  const params = validateQuizInput(rawParams);

  // 2. Build prompt
  const prompt = buildQuizPrompt(params);

  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = getGeminiModel(modelName);

      const result = await withTimeout(
        model.generateContent(prompt),
        REQUEST_TIMEOUT_MS
      );

      // Check for safety blocks
      const candidate = result.response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw Errors.safetyBlocked();
      }

      // Extract text
      const rawText = result.response.text();
      const jsonText = extractJson(rawText);
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw Errors.invalidResponse('Gemini response is not valid JSON.');
      }

      // Validate schema
      const validated = validateGeminiOutput(parsed, params.questionCount);
      return validated;
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      const status = err?.status || err?.httpErrorCode || err?.statusCode;
      const isTransient = status === 503 || status === 429 || msg.includes('high demand') || msg.includes('quota') || msg.includes('too many requests') || msg.includes('unavailable');

      console.warn(`[Gemini] Model ${modelName} returned ${status || 'error'}: ${msg.slice(0, 100)}. Trying fallback...`);
      lastError = err instanceof GeminiError ? err : mapApiError(err);

      if (!isTransient && err instanceof GeminiError && err.code === ERROR_CODES.SAFETY_BLOCKED) {
        throw err;
      }
    }
  }

  // All candidate models exhausted
  throw lastError || Errors.serviceError();
}

// ── AI-Powered Performance Analysis ────────────────────────────────────────

/**
 * Analyzes a completed quiz attempt and provides structured pedagogical insights.
 * The application's score calculation remains 100% authoritative and unchanged.
 *
 * @param {object} rawPerformanceData Raw performance data from the client
 * @returns {Promise<object>} Validated analysis object
 */
async function analyzePerformance(rawPerformanceData) {
  // 1. Validate & sanitise input
  const params = validatePerformanceInput(rawPerformanceData);

  // 2. Build prompt
  const prompt = buildAnalysisPrompt(params);

  // 3. Get the Gemini model
  const model = getGeminiModel();

  // 4. Call with retry
  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.warn(`[Gemini] Retrying performance analysis (attempt ${attempt + 1})...`);
    }

    let result;
    try {
      result = await withTimeout(
        model.generateContent(prompt),
        REQUEST_TIMEOUT_MS
      );
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      const status = err?.status || err?.httpErrorCode;
      const isTransient = status === 503 || msg.includes('high demand') || msg.includes('temporarily unavailable');

      if (isTransient && attempt < MAX_RETRIES) {
        console.warn(`[Gemini] Analysis API high demand (503). Retrying in 2s...`);
        await new Promise((res) => setTimeout(res, 2000));
        continue;
      }

      lastError = err instanceof GeminiError ? err : mapApiError(err);
      continue;
    }

    // Check safety blocks
    const candidate = result.response.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
      throw Errors.safetyBlocked();
    }

    // Extract text
    let rawText;
    try {
      rawText = result.response.text();
    } catch {
      throw Errors.invalidResponse('Could not extract text from Gemini response.');
    }

    // Parse JSON
    const jsonText = extractJson(rawText);
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      lastError = Errors.invalidResponse('Gemini analysis response is not valid JSON.');
      continue;
    }

    // Validate schema
    try {
      const validated = validateAnalysisOutput(parsed);
      return validated;
    } catch (err) {
      if (err instanceof GeminiError && err.code === ERROR_CODES.INVALID_RESPONSE) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  // Graceful degradation: if external Gemini API is unreachable or rate-limited,
  // return a factual, data-grounded performance analysis derived from the attempt data.
  console.warn('[Gemini] External analysis API unavailable. Returning grounded fallback analysis.');
  return generateGroundedFallbackAnalysis(params);
}

// ── Adaptive Practice Quiz Generation ──────────────────────────────────────

/**
 * Generates an adaptive practice quiz targeted specifically at weak concepts,
 * avoiding previous questions and adapting to student performance.
 *
 * @param {object} rawAdaptiveParams Unvalidated input from HTTP request body
 * @returns {Promise<object>} Validated adaptive quiz object
 */
async function generateAdaptiveQuiz(rawAdaptiveParams) {
  // 1. Validate & sanitise adaptive inputs
  const params = validateAdaptiveInput(rawAdaptiveParams);

  // 2. Build adaptive prompt with previous questions to avoid
  const prompt = buildAdaptiveQuizPrompt(params);

  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = getGeminiModel(modelName);

      const result = await withTimeout(
        model.generateContent(prompt),
        REQUEST_TIMEOUT_MS
      );

      // Safety blocks
      const candidate = result.response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw Errors.safetyBlocked();
      }

      // Extract text
      const rawText = result.response.text();
      const jsonText = extractJson(rawText);
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw Errors.invalidResponse('Gemini response is not valid JSON.');
      }

      // Validate using the same strict quiz validation system
      const validated = validateGeminiOutput(parsed, params.questionCount);
      return {
        ...validated,
        isAdaptive: true,
        targetedConcepts: params.weakConcepts,
      };
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      const status = err?.status || err?.httpErrorCode || err?.statusCode;
      console.warn(`[Gemini Adaptive] Model ${modelName} returned ${status || 'error'}: ${msg.slice(0, 100)}. Trying fallback...`);
      lastError = err instanceof GeminiError ? err : mapApiError(err);
    }
  }

  throw lastError || Errors.serviceError();
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Wraps a promise with a hard timeout. */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Errors.timeout()), ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

/** Maps raw SDK / HTTP errors to typed GeminiError instances. */
function mapApiError(err) {
  const msg    = (err?.message || '').toLowerCase();
  const status = err?.status || err?.httpErrorCode;

  if (
    status === 401 ||
    msg.includes('api_key_invalid') ||
    msg.includes('invalid api key') ||
    msg.includes('api key not valid')
  ) {
    return Errors.invalidKey();
  }
  if (
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota')
  ) {
    return msg.includes('quota') ? Errors.quotaExceeded() : Errors.rateLimit();
  }
  if (msg.includes('timed out') || msg.includes('timeout')) {
    return Errors.timeout();
  }
  return Errors.serviceError(err);
}

/** Strips markdown code fences (model sometimes ignores responseMimeType). */
function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return text.trim();
}

// ── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  testConnection,
  generateQuiz,
  generateAdaptiveQuiz,
  analyzePerformance,
  getClientStatus,
};

