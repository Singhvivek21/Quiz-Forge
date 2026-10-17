const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const geminiService = require('./src/services/gemini');
const { validatePerformanceInput, validateAnalysisOutput } = require('./src/services/gemini/validator');

async function testPerformanceAnalysis() {
  console.log('=== Testing AI Performance Analysis Integration ===\n');

  // Sample attempt data: Biology Photosynthesis (score: 2/3 = 67%)
  const mockPayload = {
    subject: 'Biology',
    topic: 'Photosynthesis',
    scoreData: {
      totalQuestions: 3,
      correctCount: 2,
      incorrectCount: 1,
      unansweredCount: 0,
      percentage: 67,
      scoreFraction: '2/3',
      formattedTime: '1m 20s',
      questionDetails: [
        {
          id: 'q1',
          index: 1,
          question: 'What is the primary function of chlorophyll in plant cells?',
          options: [
            { id: 'A', text: 'Absorb solar light energy' },
            { id: 'B', text: 'Store water for drought' },
            { id: 'C', text: 'Break down glucose' },
            { id: 'D', text: 'Release carbon dioxide' },
          ],
          selectedAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          isUnanswered: false,
          concept: 'Light Absorption & Pigments',
          difficulty: 'easy',
          explanation: 'Chlorophyll absorbs photons from sunlight to initiate the light-dependent reactions.',
        },
        {
          id: 'q2',
          index: 2,
          question: 'Where do the light-independent (Calvin cycle) reactions take place within a chloroplast?',
          options: [
            { id: 'A', text: 'Thylakoid lumen' },
            { id: 'B', text: 'Stroma' },
            { id: 'C', text: 'Outer membrane' },
            { id: 'D', text: 'Mitochondrial matrix' },
          ],
          selectedAnswer: 'B',
          correctAnswer: 'B',
          isCorrect: true,
          isUnanswered: false,
          concept: 'Calvin Cycle Localization',
          difficulty: 'medium',
          explanation: 'The Calvin cycle reactions occur in the stroma surrounding the thylakoids.',
        },
        {
          id: 'q3',
          index: 3,
          question: 'Which enzyme is responsible for carbon fixation in the Calvin cycle?',
          options: [
            { id: 'A', text: 'ATP Synthase' },
            { id: 'B', text: 'DNA Polymerase' },
            { id: 'C', text: 'RuBisCO' },
            { id: 'D', text: 'Amylase' },
          ],
          selectedAnswer: 'A', // student made mistake (chose ATP Synthase)
          correctAnswer: 'C',  // RuBisCO
          isCorrect: false,
          isUnanswered: false,
          concept: 'Carbon Fixation & RuBisCO',
          difficulty: 'hard',
          explanation: 'RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase) catalyzes the initial step of carbon fixation.',
        },
      ],
    },
  };

  // 1. Test Input Validation
  console.log('1. Testing input validator...');
  const sanitised = validatePerformanceInput(mockPayload);
  console.log('✓ Input validation passed! Sanitised subject:', sanitised.subject, 'Topic:', sanitised.topic);

  // 2. Test Output Validation with mock
  console.log('\n2. Testing output validator with mock...');
  const mockModelOutput = {
    overallAssessment: 'You showed strong foundational knowledge of light absorption and chloroplast structure, but struggled with specific biochemical enzymes involved in carbon fixation.',
    strongConcepts: ['Light Absorption & Pigments', 'Calvin Cycle Localization'],
    weakConcepts: ['Carbon Fixation & RuBisCO'],
    difficultyPerformance: {
      easy: 'Strong mastery of basic concepts.',
      medium: 'Good grasp of cellular locations.',
      hard: 'Needs review on enzymatic mechanisms.',
    },
    recommendedTopics: ['Calvin Cycle Enzymology', 'Photorespiration in C3 vs C4 plants'],
    recommendedDifficulty: 'medium',
    studyAdvice: [
      'Focus specifically on the role of RuBisCO in carbon fixation vs ATP Synthase in photophosphorylation.',
      'Create a visual flow diagram of the inputs and outputs of the light reactions vs the Calvin cycle.'
    ]
  };
  const validatedMock = validateAnalysisOutput(mockModelOutput);
  console.log('✓ Output validator passed! Overall assessment length:', validatedMock.overallAssessment.length);
  console.log('✓ Strong concepts:', validatedMock.strongConcepts);
  console.log('✓ Weak concepts:', validatedMock.weakConcepts);
  console.log('✓ Recommended topics:', validatedMock.recommendedTopics);

  // 3. Test Live Gemini Performance Analysis
  console.log('\n3. Testing live call to Gemini Performance Analysis service...');
  try {
    const liveResult = await geminiService.analyzePerformance(mockPayload);
    console.log('\n✓ LIVE GEMINI ANALYSIS SUCCEEDED!');
    console.log(JSON.stringify(liveResult, null, 2));
  } catch (err) {
    console.error('✗ Live analysis error:', err.message);
  }
}

testPerformanceAnalysis();
