import { BaseDiscipline } from "./BaseDiscipline.js";
import { getDisciplineMetadata } from "../utils/dynamicImports.js";

export class MathDiscipline extends BaseDiscipline {
  static create(withMeta, generators, seed) {
    const { levels } = getDisciplineMetadata('math');
    return new MathDiscipline(levels, withMeta);
  }

  constructor(availableLevels, withMeta) {
    super('math', availableLevels, withMeta);
  }
}
