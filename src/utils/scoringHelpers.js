import { normalizeAnswer } from './formatting.js';

export const DEFAULT_PASS_CRITERIA = { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 6 };

export function getPassCriteria(custom = {}) { return { ...DEFAULT_PASS_CRITERIA, ...custom }; }

export function calculateFinalScore(pages, setLastScore = null) {
  let correctCount = 0;
  pages.forEach(page => {
    page.exercises.forEach(ex => {
      const userAns = ex.answer ?? '';
      if (typeof ex.correctAnswer === 'number') {
        if (Number(userAns) === ex.correctAnswer) correctCount += 1;
      } else if (normalizeAnswer(userAns) === normalizeAnswer(ex.correctAnswer)) {
        correctCount += 1;
      }
    });
  });
  if (setLastScore) setLastScore(correctCount);
  return correctCount;
}

export function calculateAttemptedCount(pages, fallbackTotal = 0) {
  let attempted = 0;
  pages.forEach(page => {
    page.exercises.forEach(ex => {
      if (String(ex.answer ?? '').trim() !== '') attempted += 1;
    });
  });
  return attempted || fallbackTotal;
}
