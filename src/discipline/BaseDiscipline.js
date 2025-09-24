// src/discipline/BaseDiscipline.js
export class BaseDiscipline {
  constructor(name, sets) {
    this.name = name;
    this.sets = sets;
    this.levels = this.groupSetsByLevel();
    this.currentLevel = this.levels[0]?.level;
  }

  groupSetsByLevel() {
    const levels = {};
    this.sets.forEach(wb => {
      const level = wb.level || 'misc';
      if (!levels[level]) levels[level] = { level, sets: [] };
      levels[level].sets.push(wb);
    });
    return Object.values(levels);
  }

  getSets() { return this.sets; }
  getLevels() { return this.levels; }
  getSetsByLevel(level) { return this.sets.filter(wb => wb.level === level); }
  getCurrentLevelSets() { return this.getSetsByLevel(this.currentLevel); }
  
  getCurrentSet() {
    const currentLevelSets = this.getCurrentLevelSets();
    if (!currentLevelSets.length) return null;
    
    // Find in-progress set
    const inProgress = currentLevelSets.find(wb => wb.attempts > 0 && !wb.completed);
    if (inProgress) return inProgress;
    
    // Find last completed set in current level
    const completed = currentLevelSets.filter(wb => wb.completed);
    if (completed.length) {
      return completed.sort((a, b) => 
        (b.history?.slice(-1)[0]?.ts || 0) - (a.history?.slice(-1)[0]?.ts || 0)
      )[0];
    }
    
    // Default to first set in current level
    return currentLevelSets[0];
  }
}
