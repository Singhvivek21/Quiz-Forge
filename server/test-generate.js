const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const geminiService = require('./src/services/gemini');

(async () => {
  try {
    const result = await geminiService.generateQuiz({
      subject: "Biology",
      topic: "Photosynthesis",
      questionCount: 3,
      difficulty: "medium",
      questionType: "mcq",
      language: "English",
      enableHints: true,
      enableExplanations: true
    });
    console.log("SUCCESS! Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("FAILED with error:", err);
    if (err.cause) {
      console.error("Underlying cause:", err.cause);
    }
  }
})();
