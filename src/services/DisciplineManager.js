// src/services/DisciplineManager.js
import { MathDiscipline } from "../discipline/MathDiscipline.js";
import { PortugueseDiscipline } from "../discipline/PortugueseDiscipline.js";
import { EnglishDiscipline } from "../discipline/EnglishDiscipline.js";

export class DisciplineManager {
  constructor(withMeta, generators, seed) {
    this.disciplines = {
      math: new MathDiscipline(withMeta, generators, seed),
      portuguese: new PortugueseDiscipline(withMeta),
      english: new EnglishDiscipline(withMeta)
    };
  }

  getDiscipline(name) { return this.disciplines[name]; }
  getDisciplines() { return Object.values(this.disciplines); }
  getAllWorkbooks() { return this.getDisciplines().flatMap(d => d.getWorkbooks()); }
  
  getWorkbooksBySubject(subject) { 
    const discipline = this.getDiscipline(subject);
    return discipline ? discipline.getWorkbooks() : [];
  }

  getLevelsBySubject(subject) {
    const discipline = this.getDiscipline(subject);
    return discipline ? discipline.getLevels() : [];
  }

  findWorkbook(predicate) { return this.getAllWorkbooks().find(predicate); }
  filterWorkbooks(predicate) { return this.getAllWorkbooks().filter(predicate); }
  
  getCurrentWorkbookForDiscipline(disciplineName) {
    const discipline = this.getDiscipline(disciplineName);
    return discipline ? discipline.getCurrentWorkbook() : null;
  }

  getRecommendedWorkbook() {
    // Find the discipline with most recent activity
    const disciplinesWithActivity = this.getDisciplines()
      .map(discipline => ({
        discipline,
        currentWorkbook: discipline.getCurrentWorkbook(),
        lastActivity: this.getLastActivityTime(discipline)
      }))
      .filter(item => item.currentWorkbook)
      .sort((a, b) => b.lastActivity - a.lastActivity);

    return disciplinesWithActivity.length > 0 ? disciplinesWithActivity[0].currentWorkbook : null;
  }

  getLastActivityTime(discipline) {
    const allHistory = discipline.getWorkbooks()
      .flatMap(wb => wb.history || [])
      .map(entry => entry.ts || 0);
    
    return allHistory.length > 0 ? Math.max(...allHistory) : 0;
  }
}
