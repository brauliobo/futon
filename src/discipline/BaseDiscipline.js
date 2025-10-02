import { importSetsForLevel, getDisciplineMetadata } from "../utils/dynamicImports.js";

export class BaseDiscipline {
  constructor(name, availableLevels, withMeta) {
    this.name = name;
    this.withMeta = withMeta;
    this.availableLevels = availableLevels;
    this.loadedLevels = new Map();
    this.currentLevel = availableLevels[0];
  }

  async ensureLevelLoaded(level) {
    if (this.loadedLevels.has(level)) return;
    const rawSets = await importSetsForLevel(this.name, level);
    const sets = rawSets.map(w => this.withMeta(w.set));
    this.loadedLevels.set(level, sets);
  }

  getSets() { return Array.from(this.loadedLevels.values()).flat(); }
  getLevels() { return this.availableLevels.map(level => ({ level, sets: this.getSetsByLevel(level) })); }
  getSetsByLevel(level) { return this.loadedLevels.get(level) || []; }
  async getSetsByLevelAsync(level) { await this.ensureLevelLoaded(level); return this.getSetsByLevel(level); }
  async getCurrentLevelSetsAsync() { await this.ensureLevelLoaded(this.currentLevel); return this.getSetsByLevel(this.currentLevel); }
  
  getCurrentSet() {
    const currentLevelSets = this.getSetsByLevel(this.currentLevel);
    if (!currentLevelSets.length) return null;
    
    const inProgress = currentLevelSets.find(wb => wb.attempts > 0 && !wb.completed);
    if (inProgress) return inProgress;
    
    const completed = currentLevelSets.filter(wb => wb.completed);
    if (completed.length) return completed.sort((a, b) => (b.history?.slice(-1)[0]?.ts || 0) - (a.history?.slice(-1)[0]?.ts || 0))[0];
    
    return currentLevelSets[0];
  }
}
