import { BaseDiscipline } from "./BaseDiscipline.js";
import { DisciplineRegistry } from "../utils/DisciplineRegistry.js";

export class EnglishDiscipline extends BaseDiscipline {
  static create(withMeta) {
    const { levels } = DisciplineRegistry.metadata('english');
    return new EnglishDiscipline(levels, withMeta);
  }

  constructor(availableLevels, withMeta) {
    super('english', availableLevels, withMeta);
  }
}
