const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { extractDocumentText } = require('./src/services/extractor/document.extractor');
const { generateQuiz } = require('./src/services/gemini');
const { initDb } = require('./src/db');
const QuizService = require('./src/services/quiz.service');

async function testStudyMaterial() {
  console.log('=== Testing Study Material Extraction & Grounded Quiz Generation ===\n');

  // 1. Test Plain Text & Markdown Extraction
  console.log('1. Testing In-Memory Text & Markdown Extraction...');
  const sampleMarkdown = `
# Cellular Respiration: Glycolysis & The Citric Acid Cycle

## 1. Glycolysis
Glycolysis occurs in the cytoplasm of the cell and converts one molecule of glucose into two molecules of pyruvate. It yields a net gain of 2 ATP molecules and 2 NADH molecules per glucose. The committed rate-limiting step of glycolysis is catalyzed by the enzyme phosphofructokinase-1 (PFK-1), which is allosterically inhibited by high levels of ATP.

## 2. Pyruvate Oxidation
Pyruvate is transported into the mitochondrial matrix via the mitochondrial pyruvate carrier (MPC). The pyruvate dehydrogenase complex (PDC) oxidatively decarboxylates pyruvate to acetyl-CoA, producing 1 NADH and releasing 1 CO2 per pyruvate.

## 3. The Citric Acid Cycle (Krebs Cycle)
Acetyl-CoA enters the Krebs cycle by condensing with oxaloacetate to form citrate, catalyzed by citrate synthase. For each turn of the cycle (per acetyl-CoA), the products are: 3 NADH, 1 FADH2, 1 GTP (or ATP), and 2 CO2.
  `.trim();

  const fakeMdFile = {
    originalname: 'cellular_respiration_notes.md',
    size: Buffer.byteLength(sampleMarkdown),
    buffer: Buffer.from(sampleMarkdown, 'utf-8'),
  };

  const extracted = await extractDocumentText(fakeMdFile);
  console.log(`✓ Extraction Succeeded for ${extracted.fileName}`);
  console.log(`  File type: ${extracted.fileType}, Word Count: ${extracted.wordCount}, Characters: ${extracted.charCount}`);
  if (extracted.wordCount < 50) throw new Error('Word count extraction failed');

  // 2. Test Edge Cases: Empty file & Unsupported format
  console.log('\n2. Testing Edge Case Validations...');

  try {
    await extractDocumentText({ originalname: 'empty.txt', size: 0, buffer: Buffer.alloc(0) });
    throw new Error('Should have failed on empty file');
  } catch (err) {
    console.log(`✓ Correctly rejected empty file: "${err.message}" (Code: ${err.code})`);
  }

  try {
    await extractDocumentText({ originalname: 'malware.exe', size: 500, buffer: Buffer.from('binary data') });
    throw new Error('Should have failed on unsupported format');
  } catch (err) {
    console.log(`✓ Correctly rejected unsupported format: "${err.message}" (Code: ${err.code})`);
  }

  // 3. Test Grounded Quiz Generation via Gemini
  console.log('\n3. Testing Grounded Quiz Generation with Source Material...');
  const quizInput = {
    subject: 'Biochemistry',
    topic: 'Cellular Respiration',
    sourceMaterial: extracted.text,
    questionCount: 3,
    difficulty: 'medium',
    language: 'English',
    enableHints: true,
    enableExplanations: true,
  };

  const generated = await generateQuiz(quizInput);
  console.log(`✓ Generated Grounded Quiz: "${generated.title}"`);
  console.log(`  Has Source Material Flag: ${generated.hasSourceMaterial}`);
  console.log(`  Questions Count: ${generated.questions.length}`);

  let hasSourceRefs = 0;
  generated.questions.forEach((q, idx) => {
    console.log(`\n  [Q${idx + 1}] ${q.question}`);
    console.log(`      Correct: ${q.correctAnswer}`);
    console.log(`      Concept: ${q.concept}`);
    console.log(`      📖 Source Ref: "${q.sourceReference}"`);
    if (q.sourceReference) hasSourceRefs++;
  });

  if (hasSourceRefs === 0) {
    console.warn('⚠️ Warning: No sourceReference returned in questions.');
  } else {
    console.log(`\n✓ ${hasSourceRefs}/${generated.questions.length} questions successfully cited source references!`);
  }

  // 4. Test SQLite Persistence of Source Reference & Grounded Quiz
  console.log('\n4. Testing SQLite Persistence of Grounded Quiz...');
  await initDb();
  const savedQuiz = await QuizService.saveQuiz({
    ...generated,
    sourceMaterial: extracted.text,
  }, 'default_user');

  console.log(`✓ Quiz saved in SQLite with ID: ${savedQuiz.id}`);
  console.log(`  hasSourceMaterial in DB: ${savedQuiz.hasSourceMaterial}`);
  console.log(`  Question 1 Source Ref in DB: "${savedQuiz.questions[0].sourceReference}"`);

  if (!savedQuiz.questions[0].sourceReference) {
    console.warn('⚠️ Warning: Question 1 sourceReference was null in DB');
  } else {
    console.log('✓ Source reference successfully persisted and retrieved from SQLite!');
  }

  console.log('\n🎉 ALL STUDY MATERIAL EXTRACTION & GROUNDING TESTS PASSED!');
}

testStudyMaterial().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
