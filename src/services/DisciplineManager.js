// src/services/DisciplineManager.js
import { MathDiscipline } from "../discipline/MathDiscipline.js";
import { PortugueseDiscipline } from "../discipline/PortugueseDiscipline.js";
import { EnglishDiscipline } from "../discipline/EnglishDiscipline.js";

export class DisciplineManager {
  static async create(withMeta, generators, seed) {
    const disciplines = {
      math: await MathDiscipline.create(withMeta, generators, seed),
      portuguese: await PortugueseDiscipline.create(withMeta),
      english: await EnglishDiscipline.create(withMeta)
    };
    return new DisciplineManager(disciplines);
  }

  constructor(disciplines) {
    this.disciplines = disciplines;
  }

  getDiscipline(name) { return this.disciplines[name]; }
  getDisciplines() { return Object.values(this.disciplines); }
  getAllSets() { return this.getDisciplines().flatMap(d => d.getSets()); }
  
  getSetsBySubject(subject) { 
    const discipline = this.getDiscipline(subject);
    return discipline ? discipline.getSets() : [];
  }

  getLevelsBySubject(subject) {
    const discipline = this.getDiscipline(subject);
    return discipline ? discipline.getLevels() : [];
  }

  findSet(predicate) { return this.getAllSets().find(predicate); }
  filterSets(predicate) { return this.getAllSets().filter(predicate); }
  
  getCurrentSetForDiscipline(disciplineName) {
    const discipline = this.getDiscipline(disciplineName);
    return discipline ? discipline.getCurrentSet() : null;
  }

  getRecommendedSet() {
    // Find the discipline with most recent activity
    const disciplinesWithActivity = this.getDisciplines()
      .map(discipline => ({
        discipline,
        currentSet: discipline.getCurrentSet(),
        lastActivity: this.getLastActivityTime(discipline)
      }))
      .filter(item => item.currentSet)
      .sort((a, b) => b.lastActivity - a.lastActivity);

    return disciplinesWithActivity.length > 0 ? disciplinesWithActivity[0].currentSet : null;
  }

  getLastActivityTime(discipline) {
    const allHistory = discipline.getSets()
      .flatMap(wb => wb.history || [])
      .map(entry => entry.ts || 0);
    
    return allHistory.length > 0 ? Math.max(...allHistory) : 0;
  }
}
