function calculateQuizScore(questions = [], userAnswers = {}, timeSpentSeconds = 0) {
  const totalQuestions = Array.isArray(questions) ? questions.length : 0;

  if (totalQuestions === 0) {
    return {
      totalQuestions: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      percentage: 0,
      scoreFraction: '0/0',
      timeSpentSeconds: 0,
      formattedTime: '0s',
      performanceTier: getPerformanceTier(0),
      questionDetails: [],
      weakConcepts: [],
      strongConcepts: [],
    };
  }

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const weakConceptsSet = new Set();
  const strongConceptsSet = new Set();

  const questionDetails = questions.map((q, index) => {
    const qid = q.id || `q${index + 1}`;
    const selectedAnswer = userAnswers[qid] ?? null;
    const isUnanswered = selectedAnswer === null || selectedAnswer === undefined || String(selectedAnswer).trim() === '';

    let isCorrect = false;

    if (!isUnanswered) {
      const qType = (q.type || 'mcq').toLowerCase();

      if (qType === 'true_false' || qType === 'tf') {
        const normSelected = String(selectedAnswer).trim().toLowerCase();
        const normCorrect = String(q.correctAnswer).trim().toLowerCase();
        isCorrect = normSelected === normCorrect ||
          (normSelected === 'true' && (normCorrect === 'true' || normCorrect === 'a')) ||
          (normSelected === 'false' && (normCorrect === 'false' || normCorrect === 'b')) ||
          (normSelected === 'a' && normCorrect === 'true') ||
          (normSelected === 'b' && normCorrect === 'false');
      } else if (qType === 'numerical' || qType === 'calculation') {
        if (selectedAnswer === q.correctAnswer) {
          isCorrect = true;
        } else {
          const userNum = parseFloat(String(selectedAnswer).replace(/[^0-9.-]/g, ''));
          const targetNum = q.numericAnswer !== undefined && q.numericAnswer !== null
            ? Number(q.numericAnswer)
            : null;
          const tolerance = q.tolerance !== undefined && q.tolerance !== null
            ? Number(q.tolerance)
            : 0.01;

          if (!isNaN(userNum) && targetNum !== null) {
            isCorrect = Math.abs(userNum - targetNum) <= (tolerance + 0.00001);
          }
        }
      } else {
        isCorrect = selectedAnswer === q.correctAnswer;
      }
    }

    const isIncorrect = !isUnanswered && !isCorrect;

    if (isCorrect) {
      correctCount += 1;
      if (q.concept) strongConceptsSet.add(q.concept);
    } else if (isIncorrect) {
      incorrectCount += 1;
      if (q.concept) weakConceptsSet.add(q.concept);
    } else {
      unansweredCount += 1;
      if (q.concept) weakConceptsSet.add(q.concept);
    }

    const selectedOptionObj = q.options?.find((o) => o.id === selectedAnswer) || null;
    const correctOptionObj = q.options?.find((o) => o.id === q.correctAnswer) || null;

    return {
      id: qid,
      index: index + 1,
      type: q.type || 'mcq',
      context: q.context || null,
      question: q.question,
      options: q.options || [],
      selectedAnswer,
      correctAnswer: q.correctAnswer,
      unit: q.unit || null,
      numericAnswer: q.numericAnswer ?? null,
      tolerance: q.tolerance ?? 0.01,
      selectedOptionText: selectedOptionObj ? selectedOptionObj.text : (selectedAnswer ? String(selectedAnswer) : null),
      correctOptionText: correctOptionObj ? correctOptionObj.text : (q.correctAnswer ? String(q.correctAnswer) : null),
      isCorrect,
      isIncorrect,
      isUnanswered,
      explanation: q.explanation || null,
      hint: q.hint || null,
      concept: q.concept || 'General',
      difficulty: q.difficulty || 'medium',
      sourceReference: q.sourceReference || null,
    };
  });

  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const weakConcepts = Array.from(weakConceptsSet);
  const strongConcepts = Array.from(strongConceptsSet);

  return {
    totalQuestions,
    correctCount,
    incorrectCount,
    unansweredCount,
    percentage,
    scoreFraction: `${correctCount}/${totalQuestions}`,
    timeSpentSeconds,
    formattedTime: formatDuration(timeSpentSeconds),
    performanceTier: getPerformanceTier(percentage),
    questionDetails,
    weakConcepts,
    strongConcepts,
  };
}

function getPerformanceTier(percentage) {
  if (percentage === 100) {
    return {
      title: '🏆 Perfect Score!',
      subtitle: 'Outstanding mastery! You answered every single question correctly.',
      badge: 'Perfect',
      colour: 'emerald',
      bannerBg: 'from-emerald-600 to-teal-700',
    };
  }
  if (percentage >= 80) {
    return {
      title: '🌟 Excellent Work!',
      subtitle: 'Great job! You have a strong grasp of this topic.',
      badge: 'Advanced',
      colour: 'emerald',
      bannerBg: 'from-brand-600 to-indigo-700',
    };
  }
  if (percentage >= 60) {
    return {
      title: '👍 Good Effort!',
      subtitle: 'You passed! Review the explanations below to turn weak areas into strengths.',
      badge: 'Proficient',
      colour: 'blue',
      bannerBg: 'from-blue-600 to-indigo-600',
    };
  }
  if (percentage >= 40) {
    return {
      title: '📚 Needs More Practice',
      subtitle: 'You are making progress. Check the answers below to review missed concepts.',
      badge: 'Developing',
      colour: 'amber',
      bannerBg: 'from-amber-600 to-orange-600',
    };
  }
  return {
    title: '💪 Keep Going!',
    subtitle: "Don't worry, every mistake is a learning opportunity. Try again to boost your score!",
    badge: 'Novice',
    colour: 'red',
    bannerBg: 'from-slate-700 to-slate-900',
  };
}

function formatDuration(seconds = 0) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

module.exports = { calculateQuizScore, getPerformanceTier, formatDuration };
