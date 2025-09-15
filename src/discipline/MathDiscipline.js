// src/discipline/MathDiscipline.js
import { BaseDiscipline } from "./BaseDiscipline.js";
import { buildMathWorkbooks } from "./buildMath.js";

export class MathDiscipline extends BaseDiscipline {
  constructor(withMeta, generators, seed) {
    const workbooks = buildMathWorkbooks(withMeta, generators, seed);
    super('math', workbooks);
  }
}
