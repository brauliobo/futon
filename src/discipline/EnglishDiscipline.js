// src/discipline/EnglishDiscipline.js
import { BaseDiscipline } from "./BaseDiscipline.js";
import { buildEnglishSets } from "./buildEnglish.js";

export class EnglishDiscipline extends BaseDiscipline {
  constructor(withMeta) {
    const sets = buildEnglishSets(withMeta);
    super('english', sets);
  }
}
