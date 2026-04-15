// src/services/SetFactory.js
import { SetProcessor } from './SetProcessor.js';

const LEVEL_SPEED_TARGETS = {
  'math-7A': 20, 'math-6A': 20, 'math-5A': 20,
  'math-4A': 12, 'math-3A': 12, 'math-2A': 12,
  'math-1A': 8,  'math-A': 8,   'math-B': 8,
  'math-C': 5,   'math-D': 5,
  'math-E': 10,  'math-F': 10,  'math-G': 10,  'math-H': 10,
  'math-I': 10,  'math-J': 10,  'math-K': 10,  'math-L': 10,
  'math-M': 10,  'math-N': 10,  'math-O': 10,
};

const JAPANESE_SPEED_TARGETS = {
  'japanese-4A': 6, 'japanese-3A': 6, 'japanese-2A': 6,
  'japanese-A':  8, 'japanese-B':  8, 'japanese-C':  8,
};
Object.assign(LEVEL_SPEED_TARGETS, JAPANESE_SPEED_TARGETS);

const DEFAULT_SPEED_BY_SUBJECT = { math: 8, portuguese: 18, english: 18, japanese: 8 };

export class SetFactory {
  constructor(defaultPassCriteria = { minAccuracyPercent: 95, maxAvgSecondsPerExercise: 8 }) {
    this.defaultPassCriteria = defaultPassCriteria;
  }

  createSet(wb) {
    const processed = SetProcessor.processSet(wb);
    const key = `${processed.subject}-${processed.level}`;
    const maxAvgSecondsPerExercise =
      processed.passCriteria?.maxAvgSecondsPerExercise ??
      LEVEL_SPEED_TARGETS[key] ??
      DEFAULT_SPEED_BY_SUBJECT[processed.subject] ??
      this.defaultPassCriteria.maxAvgSecondsPerExercise;

    return {
      ...processed,
      passCriteria: {
        minAccuracyPercent: processed.passCriteria?.minAccuracyPercent ?? this.defaultPassCriteria.minAccuracyPercent,
        maxAvgSecondsPerExercise,
      },
      attempts: 0,
      lastScore: 0,
      gradePercent: 0,
      status: '',
      completed: false,
      durationSeconds: 0,
      avgSecondsPerExercise: 0,
    };
  }
}
