const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(key);

const candidateModels = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3.6-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

(async () => {
  for (const name of candidateModels) {
    try {
      console.log(`Testing model: ${name}...`);
      const model = genAI.getGenerativeModel({ model: name }, { apiVersion: 'v1' });
      const res = await model.generateContent('Generate a 1-sentence joke in JSON format: {"joke":"..."}');
      console.log(`✓ ${name} SUCCESS:`, res.response.text());
    } catch (e) {
      console.log(`✗ ${name} ERROR:`, e.status, e.message.slice(0, 120));
    }
  }
})();
