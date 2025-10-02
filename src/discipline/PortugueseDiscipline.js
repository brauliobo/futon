import { BaseDiscipline } from "./BaseDiscipline.js";
import { getDisciplineMetadata } from "../utils/dynamicImports.js";

export class PortugueseDiscipline extends BaseDiscipline {
  static create(withMeta) {
    const { levels } = getDisciplineMetadata('portuguese');
    return new PortugueseDiscipline(levels, withMeta);
  }

  constructor(availableLevels, withMeta) {
    super('portuguese', availableLevels, withMeta);
  }
}
