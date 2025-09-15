// src/discipline/EnglishDiscipline.js
import { BaseDiscipline } from "./BaseDiscipline.js";
import { buildEnglishWorkbooks } from "./buildEnglish.js";

export class EnglishDiscipline extends BaseDiscipline {
  constructor(withMeta) {
    const workbooks = buildEnglishWorkbooks(withMeta);
    super('english', workbooks);
  }
}
