// Run from: c:\Users\Vivek Singh\Desktop\Quiz Forge\server
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const https = require('https');

const key = process.env.GEMINI_API_KEY;

// Models to try (from the API error message recommendation)
const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-001'];

async function tryModel(modelName) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: 'Return only this JSON: {"ping":"pong"}' }] }]
    });

    const opts = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1/models/${modelName}:generateContent`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
        'Content-Length': Buffer.byteLength(body),
      }
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          console.log(`✓ WORKS: ${modelName} → ${json.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 50)}`);
          resolve(modelName);
        } else {
          const json = JSON.parse(data);
          console.log(`✗ FAIL:  ${modelName} → ${res.statusCode}: ${json.error?.message?.slice(0, 80)}`);
          resolve(null);
        }
      });
    });
    req.on('error', err => { console.log(`✗ ERROR: ${modelName} → ${err.message}`); resolve(null); });
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const m of models) {
    const result = await tryModel(m);
    if (result) {
      console.log(`\nUse this model name: "${result}"`);
      break;
    }
  }
})();
