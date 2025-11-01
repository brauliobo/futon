/**
 * Exercise helper utilities
 */

/**
 * Calculate exercise pairs for 2-column layout
 * @param {Array} exercises - Array of exercises
 * @returns {Array<Array>} Array of pairs [first, second]
 */
export function createExercisePairs(exercises) {
  const pairs = [];
  const half = Math.ceil(exercises.length / 2);
  for (let i = 0; i < half; i++) {
    const first = exercises[i];
    const second = i + half < exercises.length ? exercises[i + half] : null;
    pairs.push([first, second]);
  }
  return pairs;
}

/**
 * Get logical exercise index from row/column position
 * @param {number} rowIndex - Row index (0-based)
 * @param {number} colIndex - Column index (0 or 1)
 * @param {number} totalExercises - Total number of exercises
 * @returns {number} Logical exercise index
 */
export function getExerciseIndex(rowIndex, colIndex, totalExercises) {
  if (colIndex === 0) {
    return rowIndex;
  }
  const half = Math.ceil(totalExercises / 2);
  return rowIndex + half;
}

/**
 * Map ref array position to logical exercise index
 * Exercises are rendered as pairs: [0,5], [1,6], [2,7], [3,8], [4,9]
 * Refs order is: [0, 5, 1, 6, 2, 7, 3, 8, 4, 9]
 * @param {number} refIndex - Position in refs array
 * @param {number} totalExercises - Total number of exercises
 * @returns {number} Logical exercise index
 */
export function refIndexToLogicalIndex(refIndex, totalExercises) {
  const half = Math.ceil(totalExercises / 2);
  if (refIndex % 2 === 0) {
    // Even indices are first column: 0, 2, 4, 6, 8 -> 0, 1, 2, 3, 4
    return refIndex / 2;
  } else {
    // Odd indices are second column: 1, 3, 5, 7, 9 -> 5, 6, 7, 8, 9
    return Math.floor(refIndex / 2) + half;
  }
}

/**
 * Map logical exercise index to ref array position
 * @param {number} logicalIndex - Logical exercise index
 * @param {number} totalExercises - Total number of exercises
 * @returns {number} Position in refs array
 */
export function logicalIndexToRefIndex(logicalIndex, totalExercises) {
  const half = Math.ceil(totalExercises / 2);
  if (logicalIndex < half) {
    // First column: rowIndex * 2 (0->0, 1->2, 2->4, 3->6, 4->8)
    return logicalIndex * 2;
  } else {
    // Second column: (logicalIndex - half) * 2 + 1 (5->1, 6->3, 7->5, 8->7, 9->9)
    return (logicalIndex - half) * 2 + 1;
  }
}

/**
 * Generate level-to-series lookup key
 * @param {string} subject - Subject name
 * @param {string} level - Level identifier
 * @returns {string} Lookup key in format "subject-level"
 */
export function createLevelSeriesKey(subject, level) {
  return `${String(subject || '').toLowerCase()}-${String(level || '').toUpperCase()}`;
}

