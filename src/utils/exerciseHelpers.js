// Exercise pairs for 2-column layout: [0,half], [1,half+1], ...
export function createExercisePairs(exercises) {
  const pairs = [];
  const half = Math.ceil(exercises.length / 2);
  for (let i = 0; i < half; i++) {
    pairs.push([exercises[i], i + half < exercises.length ? exercises[i + half] : null]);
  }
  return pairs;
}

// Logical index from row/col position in the pair grid
export function getExerciseIndex(rowIndex, colIndex, totalExercises) {
  return colIndex === 0 ? rowIndex : rowIndex + Math.ceil(totalExercises / 2);
}

// Ref array position → logical index (pairs render as [0,5,1,6,2,7,...])
export function refIndexToLogicalIndex(refIndex, totalExercises) {
  const half = Math.ceil(totalExercises / 2);
  return refIndex % 2 === 0 ? refIndex / 2 : Math.floor(refIndex / 2) + half;
}

// Logical index → ref array position
export function logicalIndexToRefIndex(logicalIndex, totalExercises) {
  const half = Math.ceil(totalExercises / 2);
  return logicalIndex < half ? logicalIndex * 2 : (logicalIndex - half) * 2 + 1;
}
