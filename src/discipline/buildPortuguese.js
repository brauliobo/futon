// src/discipline/buildPortuguese.js
import { importPortugueseSets } from "../utils/dynamicImports.js";

export async function buildPortugueseSets(withMeta) {
  // All sets are now loaded dynamically from standardized set_XX.yaml files
  const staticSets = await importPortugueseSets();
  return staticSets.map(w => withMeta(w.set));
}
