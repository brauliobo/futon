// src/discipline/buildEnglish.js
import { importEnglishSets } from "../utils/dynamicImports.js";

export async function buildEnglishSets(withMeta) {
  // All sets are now loaded dynamically from standardized set_XX.yaml files
  const staticSets = await importEnglishSets();
  return staticSets.map(w => withMeta(w.set));
}