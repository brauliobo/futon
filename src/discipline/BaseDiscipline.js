// src/discipline/BaseDiscipline.js
export class BaseDiscipline {
  constructor(name, workbooks) {
    this.name = name;
    this.workbooks = workbooks;
    this.levels = this.groupWorkbooksByLevel();
    this.currentLevel = this.levels[0]?.level;
  }

  groupWorkbooksByLevel() {
    const levels = {};
    this.workbooks.forEach(wb => {
      const level = wb.level || 'misc';
      if (!levels[level]) levels[level] = { level, workbooks: [] };
      levels[level].workbooks.push(wb);
    });
    return Object.values(levels);
  }

  getWorkbooks() { return this.workbooks; }
  getLevels() { return this.levels; }
  getWorkbooksByLevel(level) { return this.workbooks.filter(wb => wb.level === level); }
  getCurrentLevelWorkbooks() { return this.getWorkbooksByLevel(this.currentLevel); }
  
  getCurrentWorkbook() {
    const currentLevelWorkbooks = this.getCurrentLevelWorkbooks();
    if (!currentLevelWorkbooks.length) return null;
    
    // Find in-progress workbook
    const inProgress = currentLevelWorkbooks.find(wb => wb.attempts > 0 && !wb.completed);
    if (inProgress) return inProgress;
    
    // Find last completed workbook in current level
    const completed = currentLevelWorkbooks.filter(wb => wb.completed);
    if (completed.length) {
      return completed.sort((a, b) => 
        (b.history?.slice(-1)[0]?.ts || 0) - (a.history?.slice(-1)[0]?.ts || 0)
      )[0];
    }
    
    // Default to first workbook in current level
    return currentLevelWorkbooks[0];
  }
}
