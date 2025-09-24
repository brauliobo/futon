// src/discipline/PortugueseDiscipline.js
import { BaseDiscipline } from "./BaseDiscipline.js";
import { buildPortugueseSets } from "./buildPortuguese.js";

export class PortugueseDiscipline extends BaseDiscipline {
  constructor(withMeta) {
    const sets = buildPortugueseSets(withMeta);
    super('portuguese', sets);
  }
}
