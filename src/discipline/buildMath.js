// src/discipline/buildMath.js
import { importMathSets } from "../utils/dynamicImports.js";

export async function buildMathSets(withMeta, generators, seed) {
  // All sets are now loaded dynamically from standardized set_XX.yaml files
  const staticSets = await importMathSets();
  return staticSets.map(w => withMeta(w.set));
}
