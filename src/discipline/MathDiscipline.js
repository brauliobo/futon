// src/discipline/MathDiscipline.js
import { BaseDiscipline } from "./BaseDiscipline.js";
import { buildMathSets } from "./buildMath.js";

export class MathDiscipline extends BaseDiscipline {
  static async create(withMeta, generators, seed) {
    const sets = await buildMathSets(withMeta, generators, seed);
    return new MathDiscipline(sets);
  }

  constructor(sets) {
    super('math', sets);
  }
}
