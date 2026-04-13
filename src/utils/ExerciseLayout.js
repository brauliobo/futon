export class ExerciseLayout {
  // Pairs for 2-column layout: [0,half], [1,half+1], ...
  static createPairs(exercises) {
    const pairs = [];
    const half = Math.ceil(exercises.length / 2);
    for (let i = 0; i < half; i++) {
      pairs.push([exercises[i], i + half < exercises.length ? exercises[i + half] : null]);
    }
    return pairs;
  }

  // Logical index from row/col position in the pair grid
  static exerciseIndex(rowIndex, colIndex, totalExercises) {
    return colIndex === 0 ? rowIndex : rowIndex + Math.ceil(totalExercises / 2);
  }

  // Ref array position → logical index (pairs render as [0,5,1,6,2,7,...])
  static refToLogical(refIndex, totalExercises) {
    const half = Math.ceil(totalExercises / 2);
    return refIndex % 2 === 0 ? refIndex / 2 : Math.floor(refIndex / 2) + half;
  }

  // Logical index → ref array position
  static logicalToRef(logicalIndex, totalExercises) {
    const half = Math.ceil(totalExercises / 2);
    return logicalIndex < half ? logicalIndex * 2 : (logicalIndex - half) * 2 + 1;
  }
}
