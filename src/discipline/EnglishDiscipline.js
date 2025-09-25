// src/discipline/EnglishDiscipline.js
import { BaseDiscipline } from "./BaseDiscipline.js";
import { buildEnglishSets } from "./buildEnglish.js";

export class EnglishDiscipline extends BaseDiscipline {
  static async create(withMeta) {
    const sets = await buildEnglishSets(withMeta);
    return new EnglishDiscipline(sets);
  }

  constructor(sets) {
    super('english', sets);
  }
}
