// src/domain/Set.js
// New Set domain class encapsulating validation utilities previously found in scripts/validate-sets.js

export default class Set {
  constructor(raw) {
    Object.assign(this, raw);
  }

  // Normalize an exercise for comparison
  static #norm(ex) {
    return typeof ex === 'string' ? ex : JSON.stringify(ex);
  }

  /**
   * Counts total exercises, unique exercises and duplicates inside this set.
   * @returns {{total:number, uniques:number, duplicates:number}}
   */
  countExercises() {
    if (!Array.isArray(this.pages)) {
      return { total: 0, uniques: 0, duplicates: 0 };
    }
    const seen = new Map();
    let duplicates = 0;
    let total = 0;
    for (const page of this.pages) {
      for (const ex of page.exercises || []) {
        total++;
        const key = Set.#norm(ex);
        if (seen.has(key)) duplicates++;
        else seen.set(key, true);
      }
    }
    return { total, uniques: total - duplicates, duplicates };
  }

  /**
   * Duplicate percentage (0-100). Returns null if no exercises.
   */
  get duplicatePercent() {
    const { total, duplicates } = this.countExercises();
    if (!total) return null;
    return +(100 * (duplicates / total)).toFixed(1);
  }

  /**
   * Randomness score (0-1) where 1 means no duplicates.
   */
  get randomness() {
    const { total, duplicates } = this.countExercises();
    return total ? +(1 - duplicates / total).toFixed(3) : null;
  }
}






