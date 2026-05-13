import { Formatter } from './Formatter.js';

export class Scoring {
  static DEFAULT_PASS_CRITERIA = {
    minAccuracyPercent: 85,
    masteryAccuracyPercent: 100,
    maxAvgSecondsPerExercise: 8,
    masteryMaxAvgSecondsPerExercise: 8,
  };

  static LEVEL_SPEED_TARGETS = {
    'math-7A': 20, 'math-6A': 20, 'math-5A': 20,
    'math-4A': 12, 'math-3A': 12, 'math-2A': 12,
    'math-1A': 8,  'math-A': 8,   'math-B': 8,
    'math-C': 5,   'math-D': 5,
    'math-E': 10,  'math-F': 10,  'math-G': 10,  'math-H': 10,
    'math-I': 10,  'math-J': 10,  'math-K': 18,  'math-L': 20,
    'math-M': 25,  'math-N': 25,  'math-O': 25,  'math-P': 25,
    'math-Q': 25,

    'portuguese-4A': 20, 'portuguese-3A': 20, 'portuguese-2A': 22,
    'portuguese-A': 25,  'portuguese-B': 25,  'portuguese-C': 28,

    'english-5A': 25, 'english-4A': 25, 'english-3A': 25,
    'english-2A': 25, 'english-A': 25,  'english-B': 25,
    'english-C': 25,  'english-D': 25,  'english-E': 25,
    'english-F': 25,

    'japanese-4A': 6, 'japanese-3A': 6, 'japanese-2A': 6,
    'japanese-A': 8,  'japanese-B': 8,  'japanese-C': 8,

    'spanish-5A': 18, 'spanish-4A': 20, 'spanish-3A': 20,
    'spanish-2A': 20, 'spanish-A': 22,  'spanish-B': 22,
    'spanish-C': 24,  'spanish-F': 25,  'spanish-H': 25,
    'spanish-L': 25,

    // Biology is multiple-choice with rich citation-heavy rationales — slower
    // pace than language drills. Difficulty ramps from intro (25s) to graduate-
    // research-level passages (35s+).
    'biology-7A': 25, 'biology-6A': 25, 'biology-5A': 28,
    'biology-4A': 28, 'biology-3A': 28, 'biology-2A': 30, 'biology-1A': 30,
    'biology-A': 30,  'biology-B': 30,  'biology-C': 30,  'biology-D': 32,
    'biology-E': 35,  'biology-F': 35,  'biology-G': 35,  'biology-H': 35,
    'biology-I': 35,  'biology-J': 35,  'biology-K': 35,  'biology-L': 35,
    'biology-M': 38,  'biology-N': 38,  'biology-O': 38,  'biology-P': 38,
    'biology-Q': 40,  'biology-R': 40,  'biology-S': 40,
  };

  static DEFAULT_SPEED_BY_SUBJECT = {
    math: 8,
    portuguese: 25,
    english: 25,
    japanese: 8,
    spanish: 22,
    biology: 30,
  };

  static normalizedLevel(level) {
    return String(level || '').toUpperCase();
  }

  static timingTarget({ subject, level } = {}) {
    const s = String(subject || '').toLowerCase();
    const key = `${s}-${this.normalizedLevel(level)}`;
    return this.LEVEL_SPEED_TARGETS[key] ?? this.DEFAULT_SPEED_BY_SUBJECT[s] ?? this.DEFAULT_PASS_CRITERIA.maxAvgSecondsPerExercise;
  }

  static positiveNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  static passCriteria(custom = {}, context = {}) {
    const target = this.timingTarget(context);
    const hasMax = Object.prototype.hasOwnProperty.call(custom, 'maxAvgSecondsPerExercise');
    const hasMasteryMax = Object.prototype.hasOwnProperty.call(custom, 'masteryMaxAvgSecondsPerExercise');
    const maxAvgSecondsPerExercise = this.positiveNumber(
      hasMax ? custom.maxAvgSecondsPerExercise : undefined,
      target
    );
    const masteryMaxAvgSecondsPerExercise = this.positiveNumber(
      hasMasteryMax ? custom.masteryMaxAvgSecondsPerExercise : undefined,
      maxAvgSecondsPerExercise
    );
    return {
      ...this.DEFAULT_PASS_CRITERIA,
      ...custom,
      minAccuracyPercent: this.positiveNumber(custom.minAccuracyPercent, this.DEFAULT_PASS_CRITERIA.minAccuracyPercent),
      masteryAccuracyPercent: this.positiveNumber(custom.masteryAccuracyPercent, this.DEFAULT_PASS_CRITERIA.masteryAccuracyPercent),
      maxAvgSecondsPerExercise,
      masteryMaxAvgSecondsPerExercise,
    };
  }

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

  static gradePercent({ accuracyPercent, avgSecondsPerExercise, maxAvgSecondsPerExercise, masteryMaxAvgSecondsPerExercise }) {
    const a = Math.max(0, Math.min(100, Number(accuracyPercent) || 0));
    const maxS = Math.max(0.001, Number(masteryMaxAvgSecondsPerExercise || maxAvgSecondsPerExercise) || 8);
    const s = Math.max(0, Number(avgSecondsPerExercise) || 0);
    const speedScore = Math.max(0, 100 * (1 - s / (maxS * 2)));
    return Math.round(0.7 * a + 0.3 * speedScore);
  }

  static status({
    accuracyPercent,
    avgSecondsPerExercise,
    maxAvgSecondsPerExercise,
    masteryMaxAvgSecondsPerExercise,
    minAccuracyPass = 85,
    masteryAccuracyPercent = 100,
  }) {
    const a = Math.max(0, Math.min(100, Number(accuracyPercent) || 0));
    const passAccuracy = Math.max(0, Math.min(100, Number(minAccuracyPass) || 85));
    const masteryAccuracy = Math.max(passAccuracy, Math.min(100, Number(masteryAccuracyPercent) || 100));
    const maxS = Math.max(0.001, Number(masteryMaxAvgSecondsPerExercise || maxAvgSecondsPerExercise) || 8);
    const s = Math.max(0, Number(avgSecondsPerExercise) || 0);
    if (a >= masteryAccuracy && s <= maxS) return 'mastery';
    if (a >= passAccuracy) return 'pass';
    return 'retry';
  }
}
