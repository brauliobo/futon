// src/discipline/MathDiscipline.js
import { BaseDiscipline } from "./BaseDiscipline.js";
import { buildMathSets } from "./buildMath.js";

export class MathDiscipline extends BaseDiscipline {
  constructor(withMeta, generators, seed) {
    const sets = buildMathSets(withMeta, generators, seed);
    super('math', sets);
  }
}
