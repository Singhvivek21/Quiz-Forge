const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_EXTRACTED_CHARS = 50_000; // 50k characters max for prompt context

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.markdown', '.docx', '.json', '.csv'];

/**
 * Custom error with HTTP status and diagnostic code
 */
function createExtractorError(message, code, statusCode = 400) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

/**
 * Extracts raw text from a PDF buffer.
 * Detects scanned/image-only PDFs where text layer is absent.
 */
async function extractFromPdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = (data.text || '').trim();

    // If PDF has pages but virtually no selectable text, it is likely a scanned image
    if (data.numpages > 0 && text.length < 25) {
      throw createExtractorError(
        'This PDF appears to be a scanned image without a selectable text layer. Please provide a text-based document or paste your notes directly.',
        'SCANNED_PDF'
      );
    }

    return {
      text,
      pageCount: data.numpages || 1,
    };
  } catch (err) {
    if (err.code === 'SCANNED_PDF') throw err;
    throw createExtractorError(
      `Failed to parse PDF document: ${err.message || 'Corrupted or unreadable format'}`,
      'EXTRACTION_FAILED'
    );
  }
}

/**
 * Extracts raw text from a Word (.docx) buffer.
 */
async function extractFromDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: (result.value || '').trim(),
      messages: result.messages,
    };
  } catch (err) {
    throw createExtractorError(
      `Failed to parse Word document: ${err.message || 'Corrupted or unreadable format'}`,
      'EXTRACTION_FAILED'
    );
  }
}

/**
 * Extracts text from plain text formats (TXT, MD, JSON, CSV).
 */
function extractFromPlainText(buffer) {
  try {
    const text = buffer.toString('utf-8').trim();
    return { text };
  } catch (err) {
    throw createExtractorError(
      `Failed to decode text file: ${err.message}`,
      'EXTRACTION_FAILED'
    );
  }
}

/**
 * Sanitises extracted text, strips null bytes and dangerous control characters.
 */
function sanitizeText(rawText) {
  if (!rawText) return '';
  return rawText
    .replace(/\0/g, '') // remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove ASCII control characters except \t and \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // collapse excessive blank lines
    .trim();
}

/**
 * Inspects file buffer magic bytes to block disguised executables or mismatched binary files.
 */
function verifyMagicBytes(buffer, ext) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return;

  // Block Windows PE ('MZ') and Linux ELF ('\x7FELF') executables disguised with any extension
  if (
    (buffer[0] === 0x4D && buffer[1] === 0x5A) ||
    (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46)
  ) {
    throw createExtractorError(
      'Executable binary files are strictly prohibited.',
      'UNSUPPORTED_FORMAT'
    );
  }

  if (ext === '.pdf') {
    const headerSlice = buffer.slice(0, Math.min(buffer.length, 1024)).toString('ascii');
    if (!headerSlice.includes('%PDF-')) {
      throw createExtractorError(
        'Invalid PDF file header. The file does not appear to be a valid PDF document.',
        'EXTRACTION_FAILED'
      );
    }
  } else if (ext === '.docx') {
    // DOCX is a ZIP container starting with PK\x03\x04
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      throw createExtractorError(
        'Invalid Word (.docx) file header. Expected an OpenXML ZIP container.',
        'EXTRACTION_FAILED'
      );
    }
  }
}

/**
 * Sanitises filename against path traversal, HTML tags, and control characters.
 */
function sanitizeFileName(name) {
  const base = path.basename(String(name || 'document'));
  return base
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 120) || 'document';
}

/**
 * Main dispatcher: Extracts, validates, and sanitises text from an uploaded file object.
 *
 * @param {object} file Express Multer file object (in-memory buffer)
 * @returns {Promise<{ text: string, fileName: string, fileType: string, charCount: number, wordCount: number, truncated: boolean, originalLength: number }>}
 */
async function extractDocumentText(file) {
  if (!file || !file.buffer) {
    throw createExtractorError('No file was uploaded or file is empty.', 'EMPTY_FILE');
  }

  // 1. File size check
  if (file.size === 0 || file.buffer.length === 0) {
    throw createExtractorError('The uploaded file is empty (0 bytes). Please upload a file with content.', 'EMPTY_FILE');
  }
  if (file.size > MAX_FILE_SIZE_BYTES || file.buffer.length > MAX_FILE_SIZE_BYTES) {
    throw createExtractorError(
      `File size exceeds 10MB limit (uploaded: ${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller study document.`,
      'FILE_TOO_LARGE'
    );
  }

  const originalName = sanitizeFileName(file.originalname);
  const ext = path.extname(originalName).toLowerCase();

  // 2. Format & Magic-Byte check
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw createExtractorError(
      `Unsupported file type "${ext || 'unknown'}". Supported formats: PDF, TXT, MD, DOCX, CSV, JSON.`,
      'UNSUPPORTED_FORMAT'
    );
  }

  verifyMagicBytes(file.buffer, ext);

  // 3. Extract based on extension
  let rawExtracted = '';
  let meta = {};

  if (ext === '.pdf') {
    const res = await extractFromPdf(file.buffer);
    rawExtracted = res.text;
    meta.pageCount = res.pageCount;
  } else if (ext === '.docx') {
    const res = await extractFromDocx(file.buffer);
    rawExtracted = res.text;
  } else {
    const res = extractFromPlainText(file.buffer);
    rawExtracted = res.text;
  }

  // 4. Validate extracted text
  const cleanText = sanitizeText(rawExtracted);

  if (!cleanText || cleanText.length < 10) {
    throw createExtractorError(
      'No readable text could be extracted from this document. If this is a scanned PDF, please paste the text or use an OCR text version.',
      'NO_TEXT_EXTRACTED'
    );
  }

  const originalLength = cleanText.length;
  let truncated = false;
  let finalText = cleanText;

  if (cleanText.length > MAX_EXTRACTED_CHARS) {
    finalText = cleanText.slice(0, MAX_EXTRACTED_CHARS);
    truncated = true;
  }

  // Calculate word count
  const words = finalText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  return {
    text: finalText,
    fileName: originalName,
    fileType: ext.replace('.', '').toUpperCase(),
    charCount: finalText.length,
    wordCount,
    truncated,
    originalLength,
    pageCount: meta.pageCount || null,
  };
}

module.exports = {
  extractDocumentText,
  sanitizeText,
  MAX_FILE_SIZE_BYTES,
  MAX_EXTRACTED_CHARS,
  ALLOWED_EXTENSIONS,
};
