/**
 * Scoring helper utilities
 */

import { normalizeAnswer } from './formatting.js';

/**
 * Default pass criteria
 */
export const DEFAULT_PASS_CRITERIA = {
  minAccuracyPercent: 85,
  maxAvgSecondsPerExercise: 6,
};

/**
 * Get pass criteria with defaults
 * @param {Object} customCriteria - Custom pass criteria
 * @returns {Object} Pass criteria with defaults applied
 */
export function getPassCriteria(customCriteria = {}) {
  return { ...DEFAULT_PASS_CRITERIA, ...customCriteria };
}

/**
 * Calculate final score (correct answers)
 * @param {Array} pages - Array of page objects with exercises
 * @param {Function} setLastScore - Optional callback to set last score
 * @returns {number} Number of correct answers
 */
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

/**
 * Calculate attempted count
 * @param {Array} pages - Array of page objects with exercises
 * @param {number} fallbackTotal - Fallback total if no answers found
 * @returns {number} Number of attempted exercises
 */
export function calculateAttemptedCount(pages, fallbackTotal = 0) {
  let attempted = 0;
  pages.forEach(page => {
    page.exercises.forEach(ex => {
      const userAns = ex.answer ?? '';
      if (String(userAns).trim() !== '') attempted += 1;
    });
  });
  return attempted || fallbackTotal;
}

