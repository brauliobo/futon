// src/services/SetFactory.js
import { SetProcessor } from './SetProcessor.js';
import { Scoring } from '../utils/Scoring.js';

export class SetFactory {
  constructor(defaultPassCriteria = {
    minAccuracyPercent: 95,
    masteryAccuracyPercent: Scoring.DEFAULT_PASS_CRITERIA.masteryAccuracyPercent,
  }) {
    this.defaultPassCriteria = defaultPassCriteria;
  }

  createSet(wb) {
    const processed = SetProcessor.processSet(wb);
    const passCriteria = Scoring.passCriteria(
      { ...this.defaultPassCriteria, ...processed.passCriteria },
      processed
    );

    return {
      ...processed,
      passCriteria,
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
