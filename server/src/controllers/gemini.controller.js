/**
 * gemini.controller.js
 *
 * HTTP handlers for the /api/v1/gemini/* routes.
 * All Gemini logic lives in the service layer — controllers only handle HTTP concerns.
 */

const geminiService = require('../services/gemini');
const { extractDocumentText } = require('../services/extractor/document.extractor');
const { GeminiError } = require('../services/gemini/errors');
const { ERROR_CODES } = require('../services/gemini/constants');

// ── GET /api/v1/gemini/status ──────────────────────────────────────────────
/**
 * Returns whether the Gemini API key is configured.
 * Never includes the full key — only a masked hint.
 */
const getStatus = (_req, res) => {
  const status = geminiService.getClientStatus();
  res.json({
    success: true,
    data: {
      configured: status.configured,
      model:      status.model,
    },
  });
};

// ── POST /api/v1/gemini/test ───────────────────────────────────────────────
/**
 * Sends a minimal ping to Gemini to verify the connection.
 * Development utility — returns latency and model info.
 * Returns 503 if API key is not configured.
 */
const testConnection = async (req, res, next) => {
  try {
    const result = await geminiService.testConnection();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err); // handled by errorHandler middleware
  }
};

// ── POST /api/v1/gemini/extract-text ───────────────────────────────────────
/**
 * Extracts and sanitises text from uploaded study documents (PDF, DOCX, TXT, MD, etc.)
 */
const handleExtractText = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No document uploaded. Please upload a PDF, DOCX, TXT, or Markdown file.',
        code: 'EMPTY_FILE',
      });
    }

    const result = await extractDocumentText(req.file);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: err.message || 'Failed to extract text from document.',
      code: err.code || 'EXTRACTION_FAILED',
    });
  }
};

// ── POST /api/v1/gemini/generate ───────────────────────────────────────────
/**
 * Generates quiz questions using Gemini.
 * Body: { subject, topic, sourceMaterial?, questionCount, difficulty, questionType, language }
 */
const generateQuiz = async (req, res, next) => {
  try {
    const result = await geminiService.generateQuiz(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/gemini/adaptive ───────────────────────────────────────────
/**
 * Generates an adaptive practice quiz targeted specifically at weak concepts.
 * Body: { subject, topic, weakConcepts, previousQuestions, previousScore, previousDifficulty, targetDifficulty, questionCount, language }
 */
const generateAdaptiveQuiz = async (req, res, next) => {
  try {
    const result = await geminiService.generateAdaptiveQuiz(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/gemini/analyze ────────────────────────────────────────────
/**
 * Analyzes completed quiz performance and returns pedagogical recommendations.
 * Body: { subject, topic, scoreData, questions }
 */
const analyzePerformance = async (req, res, next) => {
  try {
    const result = await geminiService.analyzePerformance(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStatus,
  testConnection,
  handleExtractText,
  generateQuiz,
  generateAdaptiveQuiz,
  analyzePerformance,
};
