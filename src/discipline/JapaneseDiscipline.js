import { BaseDiscipline } from "./BaseDiscipline.js";
import { DisciplineRegistry } from "../utils/DisciplineRegistry.js";

export class JapaneseDiscipline extends BaseDiscipline {
  static create(withMeta) {
    const { levels } = DisciplineRegistry.metadata('japanese');
    return new JapaneseDiscipline(levels, withMeta);
  }

  constructor(availableLevels, withMeta) {
    super('japanese', availableLevels, withMeta);
  }
}
