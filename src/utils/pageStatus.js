/**
 * Page status calculation utilities
 */

/**
 * Calculate page completion status
 * @param {Array} answers - Array of answer values
 * @param {number} totalCount - Total number of exercises
 * @returns {Object} Status object with answeredCount, totalCount, and isCompleted
 */
export function calculatePageStatus(answers, totalCount) {
  const answeredCount = answers.filter(a => a !== null && String(a).trim() !== '').length;
  const isCompleted = answeredCount === totalCount;
  return { answeredCount, totalCount, isCompleted };
}

/**
 * Initialize answers array from exercises
 * @param {Array} exercises - Array of exercise objects
 * @returns {Array} Array of initialized answers
 */
export function initAnswersFromExercises(exercises) {
  return exercises.map(ex => {
    const a = ex && ex.answer ? String(ex.answer) : '';
    return a.trim() !== '' ? a : null;
  });
}


