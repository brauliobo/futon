import { BaseDiscipline } from "../discipline/BaseDiscipline.js";
import { Discipline } from "../domain/disciplines.js";

export class DisciplineManager {
  static create(withMeta) {
    const disciplines = Object.fromEntries(
      Discipline.ALL.map(name => [name, BaseDiscipline.create(name, withMeta)])
    );
    return new DisciplineManager(disciplines);
  }

  constructor(disciplines) {
    this.disciplines = disciplines;
  }

  getDiscipline(name) { return this.disciplines[name]; }
  getDisciplines() { return Object.values(this.disciplines); }
  getAllSets() { return this.getDisciplines().flatMap(d => d.getSets()); }

  getSetsBySubject(subject) {
    return this.getDiscipline(subject)?.getSets() || [];
  }

  async getSetsBySubjectAsync(subject, level) {
    return await this.getDiscipline(subject)?.getSetsByLevelAsync(level) || [];
  }

  getLevelsBySubject(subject) {
    return this.getDiscipline(subject)?.getLevels() || [];
  }

  findSet(predicate) { return this.getAllSets().find(predicate); }
  filterSets(predicate) { return this.getAllSets().filter(predicate); }

  getCurrentSetForDiscipline(name) {
    return this.getDiscipline(name)?.getCurrentSet() || null;
  }

  getRecommendedSet() {
    const ranked = this.getDisciplines()
      .map(d => ({ currentSet: d.getCurrentSet(), lastActivity: this.getLastActivityTime(d) }))
      .filter(item => item.currentSet)
      .sort((a, b) => b.lastActivity - a.lastActivity);
    return ranked[0]?.currentSet || null;
  }

  getLastActivityTime(discipline) {
    const stamps = discipline.getSets().flatMap(wb => (wb.history || []).map(e => e.ts || 0));
    return stamps.length ? Math.max(...stamps) : 0;
  }
}
