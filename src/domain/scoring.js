// score based on accuracy (%) and avg seconds per exercise
export const computeGradePercent = ({ accuracyPercent, avgSecondsPerExercise, maxAvgSecondsPerExercise }) => {
  const a = Math.max(0, Math.min(100, Number(accuracyPercent) || 0));
  const maxS = Math.max(0.001, Number(maxAvgSecondsPerExercise) || 6);
  const s = Math.max(0, Number(avgSecondsPerExercise) || 0);
  const speedScore = Math.max(0, 100 * (1 - s / (maxS * 2))); // 100 at 0s, 50 at max, 0 at 2x max
  return Math.round(0.7 * a + 0.3 * speedScore);
};

// status: 'mastery' | 'pass' | 'retry'
export const computeStatus = ({ accuracyPercent, avgSecondsPerExercise, maxAvgSecondsPerExercise, minAccuracyPass = 95 }) => {
  const a = Math.max(0, Math.min(100, Number(accuracyPercent) || 0));
  const maxS = Math.max(0.001, Number(maxAvgSecondsPerExercise) || 6);
  const s = Math.max(0, Number(avgSecondsPerExercise) || 0);
  const within = s <= maxS;
  if (a === 100 && within) return 'mastery';
  if ((a >= minAccuracyPass && within) || (a === 100 && s <= maxS * 1.2)) return 'pass';
  return 'retry';
};


