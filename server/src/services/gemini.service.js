/**
 * services/gemini.service.js
 *
 * Backward-compatibility shim.
 * The real implementation is in services/gemini/ (the folder).
 * This file simply re-exports from there so any existing imports still work.
 */
module.exports = require('./gemini');
