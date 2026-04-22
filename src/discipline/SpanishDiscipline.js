import { BaseDiscipline } from "./BaseDiscipline.js";
import { DisciplineRegistry } from "../utils/DisciplineRegistry.js";

export class SpanishDiscipline extends BaseDiscipline {
  static create(withMeta) {
    const { levels } = DisciplineRegistry.metadata('spanish');
    return new SpanishDiscipline(levels, withMeta);
  }

  constructor(availableLevels, withMeta) {
    super('spanish', availableLevels, withMeta);
  }
}
