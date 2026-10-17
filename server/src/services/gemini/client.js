/**
 * gemini/client.js
 *
 * Initialises and exports the Google Generative AI client.
 *
 * SECURITY:
 *  - API key loaded exclusively from server-side environment (process.env via config).
 *  - This file is NEVER imported by client-side code.
 *  - Key is never logged, never returned in API responses.
 *  - Module is lazily initialised — throws at call time (not import time) if key is missing.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config/env');
const { Errors } = require('./errors');
const { GEMINI_MODEL, GENERATION_CONFIG } = require('./constants');

let _client = null;

/**
 * Returns the initialised Gemini model (singleton or specified model).
 * Throws GeminiError if the API key is not configured.
 *
 * @param {string} [modelName]
 * @returns {import('@google/generative-ai').GenerativeModel}
 */
function getGeminiModel(modelName = GEMINI_MODEL) {
  const key = config.geminiApiKey;
  if (!key || key === 'your_gemini_api_key_here') {
    throw Errors.missingKey();
  }

  if (!_client) {
    _client = new GoogleGenerativeAI(key);
  }

  return _client.getGenerativeModel(
    { model: modelName, generationConfig: GENERATION_CONFIG },
    { apiVersion: 'v1beta' }
  );
}

/**
 * Returns a status object for the /api/v1/gemini/status endpoint.
 * NEVER includes the key itself or any portion of it.
 */
function getClientStatus() {
  const key = config.geminiApiKey;
  const isConfigured = !!(key && key !== 'your_gemini_api_key_here');

  return {
    configured: isConfigured,
    model:      GEMINI_MODEL,
  };
}

module.exports = { getGeminiModel, getClientStatus };
