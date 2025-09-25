// src/discipline/PortugueseDiscipline.js
import { BaseDiscipline } from "./BaseDiscipline.js";
import { buildPortugueseSets } from "./buildPortuguese.js";

export class PortugueseDiscipline extends BaseDiscipline {
  static async create(withMeta) {
    const sets = await buildPortugueseSets(withMeta);
    return new PortugueseDiscipline(sets);
  }

  constructor(sets) {
    super('portuguese', sets);
  }
}
