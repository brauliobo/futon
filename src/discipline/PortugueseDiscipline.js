// src/discipline/PortugueseDiscipline.js
import { BaseDiscipline } from "./BaseDiscipline.js";
import { buildPortugueseWorkbooks } from "./buildPortuguese.js";

export class PortugueseDiscipline extends BaseDiscipline {
  constructor(withMeta) {
    const workbooks = buildPortugueseWorkbooks(withMeta);
    super('portuguese', workbooks);
  }
}
