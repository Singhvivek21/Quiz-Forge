/**
 * test-upload-routes.js
 * 
 * Automates file-upload rejection tests.
 * - .exe (prohibited)
 * - .txt (allowed)
 * - Misleading extension (e.g., .txt containing MZ header)
 * - Oversized file (>10MB)
 * - Missing file
 * 
 * Uses standard Node HTTP to avoid adding extra dependencies.
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const http = require('http');
const assert = require('assert');

let passed = 0, failed = 0, total = 0;
const failures = [];

async function asyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ↳ ${err.message}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

function uploadFile(filename, contentType, contentBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      const formData = new FormData();
      const blob = new Blob([contentBuffer], { type: contentType });
      formData.append('file', blob, filename); // multer expects 'file'

      const response = await fetch('http://localhost:3001/api/v1/gemini/extract-text', {
        method: 'POST',
        body: formData
      });
      
      const body = await response.json();
      resolve({ status: response.status, body });
    } catch (err) {
      reject(err);
    }
  });
}

function uploadMissingFile() {
  return new Promise(async (resolve, reject) => {
    try {
      const formData = new FormData();
      formData.append('otherField', 'value');

      const response = await fetch('http://localhost:3001/api/v1/gemini/extract-text', {
        method: 'POST',
        body: formData
      });
      
      const body = await response.json();
      resolve({ status: response.status, body });
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('\n─── File Upload Rejection Tests ───────────────────────────────');
  const { initDb } = require('./src/db');
  const app = require('./app');
  await initDb();
  const srv = await new Promise((resolve) => {
    const s = app.listen(3001, () => resolve(s));
    s.on('error', () => resolve(null));
  });

  try {
    await asyncTest('Allowed file type (.txt) is processed correctly', async () => {
      const content = Buffer.from('This is a valid study note about biology.', 'utf8');
      const res = await uploadFile('notes.txt', 'text/plain', content);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.text.includes('biology'));
    });

    await asyncTest('Prohibited executable (.exe) is rejected (400)', async () => {
      const content = Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'binary');
      const res = await uploadFile('malware.exe', 'application/x-msdownload', content);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'UNSUPPORTED_FORMAT');
    });

    await asyncTest('Disguised executable (MZ header inside .txt) is rejected (400)', async () => {
      const content = Buffer.from('MZ\x90\x00\x03\x00\x00\x00This program cannot be run in DOS mode.', 'binary');
      const res = await uploadFile('disguised.txt', 'text/plain', content);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'UNSUPPORTED_FORMAT');
    });

    await asyncTest('Missing file upload request is rejected (400)', async () => {
      const res = await uploadMissingFile();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'EMPTY_FILE');
    });

    await asyncTest('Empty file (0 bytes) is rejected (400)', async () => {
      const res = await uploadFile('empty.txt', 'text/plain', Buffer.from(''));
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'EMPTY_FILE');
    });

    await asyncTest('Oversized file (>10MB) is rejected (400)', async () => {
      // Generate 11MB buffer. Doing it quickly by allocating.
      const content = Buffer.alloc(11 * 1024 * 1024, 'A'); 
      const res = await uploadFile('huge.txt', 'text/plain', content);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'FILE_TOO_LARGE');
    });
  } finally {
    if (srv) srv.close();
  }

  console.log(`\nUpload Tests: ${passed}/${total} passed`);
  if (failed > 0) process.exit(1);
}

runTests();
