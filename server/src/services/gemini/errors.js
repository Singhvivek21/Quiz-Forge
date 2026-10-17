/**
 * gemini/errors.js
 *
 * Typed error classes for all Gemini failure modes.
 * Keeps error handling consistent across the service layer.
 */

const { ERROR_CODES } = require('./constants');

class GeminiError extends Error {
  /**
   * @param {string} code    - One of ERROR_CODES
   * @param {string} message - Human-readable message (never exposed raw to the browser)
   * @param {number} [httpStatus] - HTTP status to return to the client
   * @param {Error}  [cause]      - Original error for logging
   */
  constructor(code, message, httpStatus = 500, cause = null) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    this.statusCode = httpStatus;
    if (cause) this.cause = cause;
  }
}

// ── Factory helpers ────────────────────────────────────────────────────────

const Errors = {
  missingKey: () =>
    new GeminiError(ERROR_CODES.MISSING_KEY, 'Gemini API key is not configured on the server.', 503),

  invalidKey: () =>
    new GeminiError(ERROR_CODES.INVALID_KEY, 'The Gemini API key is invalid or has been revoked.', 401),

  rateLimit: () =>
    new GeminiError(ERROR_CODES.RATE_LIMIT, 'Gemini API rate limit reached. Please wait before retrying.', 429),

  quotaExceeded: () =>
    new GeminiError(ERROR_CODES.QUOTA_EXCEEDED, 'Gemini API quota exceeded for this project.', 429),

  timeout: () =>
    new GeminiError(ERROR_CODES.TIMEOUT, 'The Gemini API request timed out. Please try again.', 504),

  invalidResponse: (detail = '') =>
    new GeminiError(ERROR_CODES.INVALID_RESPONSE, `Gemini returned an unexpected response format. ${detail}`.trim(), 502),

  safetyBlocked: () =>
    new GeminiError(ERROR_CODES.SAFETY_BLOCKED, 'The request was blocked by Gemini safety filters. Try a different topic.', 422),

  serviceError: (cause) =>
    new GeminiError(ERROR_CODES.SERVICE_ERROR, 'The Gemini service encountered an error.', 502, cause),

  inputTooLong: (field, max) =>
    new GeminiError(ERROR_CODES.INPUT_TOO_LONG, `"${field}" exceeds the maximum allowed length of ${max} characters.`, 400),
};

module.exports = { GeminiError, Errors };
