import { BaseDiscipline } from "./BaseDiscipline.js";
import { DisciplineRegistry } from "../utils/DisciplineRegistry.js";

export class MathDiscipline extends BaseDiscipline {
  static create(withMeta, generators, seed) {
    const { levels } = DisciplineRegistry.metadata('math');
    return new MathDiscipline(levels, withMeta);
  }

  constructor(availableLevels, withMeta) {
    super('math', availableLevels, withMeta);
  }
}
