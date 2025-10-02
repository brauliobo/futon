import { BaseDiscipline } from "./BaseDiscipline.js";
import { getDisciplineMetadata } from "../utils/dynamicImports.js";

export class EnglishDiscipline extends BaseDiscipline {
  static create(withMeta) {
    const { levels } = getDisciplineMetadata('english');
    return new EnglishDiscipline(levels, withMeta);
  }

  constructor(availableLevels, withMeta) {
    super('english', availableLevels, withMeta);
  }
}
