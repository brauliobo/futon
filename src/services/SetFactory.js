// src/services/SetFactory.js
import { SetProcessor } from './SetProcessor.js';

export class SetFactory {
  constructor(defaultPassCriteria = { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 6 }) {
    this.defaultPassCriteria = defaultPassCriteria;
  }

  createSet(wb) {
    const processed = SetProcessor.processSet(wb);
    
    return {
      ...processed,
      passCriteria: processed.passCriteria || this.defaultPassCriteria,
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
