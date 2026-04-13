import { BaseDiscipline } from "./BaseDiscipline.js";
import { DisciplineRegistry } from "../utils/DisciplineRegistry.js";

export class PortugueseDiscipline extends BaseDiscipline {
  static create(withMeta) {
    const { levels } = DisciplineRegistry.metadata('portuguese');
    return new PortugueseDiscipline(levels, withMeta);
  }

  constructor(availableLevels, withMeta) {
    super('portuguese', availableLevels, withMeta);
  }
}
