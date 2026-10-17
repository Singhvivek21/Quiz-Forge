/**
 * Global Express error handler.
 * Handles both GeminiError instances (with typed codes) and generic errors.
 * Must have 4 parameters to be recognised as error middleware.
 */
const { GeminiError } = require('../services/gemini/errors');

const errorHandler = (err, req, res, _next) => {
  // Catch malformed JSON payload from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body.',
      code: 'INVALID_JSON',
    });
  }

  // Catch Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds the 10MB limit. Please upload a smaller study document.',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
    });
  }

  // Determine HTTP status
  const statusCode = err.statusCode || err.status || 500;

  // Build safe client-facing error object
  const isGeminiError = err instanceof GeminiError;
  const isProd = process.env.NODE_ENV === 'production';

  // Log server-side
  console.error(
    `[ERROR] ${req.method} ${req.url} — ${err.name || 'Error'}: ${err.message}`
  );

  // Never expose internal server stack traces to client
  const message = (isProd && statusCode === 500)
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal server error';

  const responseBody = {
    success: false,
    error: message,
    ...(err.code && { code: err.code }),
    ...(isGeminiError && { code: err.code }),
  };

  res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
