import { Formatter } from './Formatter.js';

export class Scoring {
  static DEFAULT_PASS_CRITERIA = { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 6 };

  static passCriteria(custom = {}) { return { ...this.DEFAULT_PASS_CRITERIA, ...custom }; }

  static finalScore(pages, setLastScore = null) {
    let correct = 0;
    pages.forEach(page => {
      page.exercises.forEach(ex => {
        const userAns = ex.answer ?? '';
        if (typeof ex.correctAnswer === 'number') {
          if (Number(userAns) === ex.correctAnswer) correct += 1;
        } else if (Formatter.normalizeAnswer(userAns) === Formatter.normalizeAnswer(ex.correctAnswer)) {
          correct += 1;
        }
      });
    });
    if (setLastScore) setLastScore(correct);
    return correct;
  }

  static attemptedCount(pages, fallbackTotal = 0) {
    let attempted = 0;
    pages.forEach(page => {
      page.exercises.forEach(ex => {
        if (String(ex.answer ?? '').trim() !== '') attempted += 1;
      });
    });
    return attempted || fallbackTotal;
  }

  static gradePercent({ accuracyPercent, avgSecondsPerExercise, maxAvgSecondsPerExercise }) {
    const a = Math.max(0, Math.min(100, Number(accuracyPercent) || 0));
    const maxS = Math.max(0.001, Number(maxAvgSecondsPerExercise) || 6);
    const s = Math.max(0, Number(avgSecondsPerExercise) || 0);
    const speedScore = Math.max(0, 100 * (1 - s / (maxS * 2)));
    return Math.round(0.7 * a + 0.3 * speedScore);
  }

  static status({ accuracyPercent, avgSecondsPerExercise, maxAvgSecondsPerExercise, minAccuracyPass = 95 }) {
    const a = Math.max(0, Math.min(100, Number(accuracyPercent) || 0));
    const maxS = Math.max(0.001, Number(maxAvgSecondsPerExercise) || 6);
    const s = Math.max(0, Number(avgSecondsPerExercise) || 0);
    const within = s <= maxS;
    if (a === 100 && within) return 'mastery';
    if ((a >= minAccuracyPass && within) || (a === 100 && s <= maxS * 1.2)) return 'pass';
    return 'retry';
  }
}
