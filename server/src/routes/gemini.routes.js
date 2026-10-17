const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const {
  getStatus,
  testConnection,
  handleExtractText,
  generateQuiz,
  generateAdaptiveQuiz,
  analyzePerformance,
} = require('../controllers/gemini.controller');

const router = Router();

const path = require('path');
const { ALLOWED_EXTENSIONS } = require('../services/extractor/document.extractor');

// ── In-Memory Multer Upload Configuration with File Filter ──────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const err = new Error(`Unsupported file type "${ext || 'unknown'}". Allowed formats: PDF, DOCX, TXT, MD, CSV, JSON.`);
      err.code = 'UNSUPPORTED_FORMAT';
      err.statusCode = 400;
      return cb(err, false);
    }
    cb(null, true);
  },
});

// ── Rate limiter for Gemini AI endpoints ──────────────────────────────────
const geminiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 20,                   // max 20 Gemini calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:   'Too many requests to the AI service. Please wait a moment.',
    code:    'GEMINI_RATE_LIMIT',
  },
});

// ── Rate limiter for document extraction (CPU bound) ───────────────────────
const extractLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 20,                   // max 20 document extractions per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:   'Too many document extraction requests. Please wait a moment.',
    code:    'EXTRACTION_RATE_LIMIT',
  },
});

// ── Routes ────────────────────────────────────────────────────────────────

// Status — no rate limit (cheap, no Gemini call)
router.get('/status', getStatus);

// Test connection — applies Gemini rate limit
router.post('/test', geminiLimiter, testConnection);

// Extract text from uploaded study documents (PDF, DOCX, TXT, MD)
router.post('/extract-text', extractLimiter, upload.single('file'), handleExtractText);

// Generate standard quiz — applies Gemini rate limit
router.post('/generate', geminiLimiter, generateQuiz);

// Generate adaptive quiz on weak concepts — applies Gemini rate limit
router.post('/adaptive', geminiLimiter, generateAdaptiveQuiz);

// AI Performance Analysis — applies Gemini rate limit
router.post('/analyze', geminiLimiter, analyzePerformance);

module.exports = router;
