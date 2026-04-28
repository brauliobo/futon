// Shared bilingual-content helper for evaluator scripts.
// YAML sets may carry text fields as plain strings (legacy monolingual)
// or as {pt, en} objects (Phase: bilingual content). Evaluators consume
// flattened strings; this module localizes a parsed set in-place.
//
// Mirrors src/utils/i18nText.js but lives under scripts/lib so Node-side
// tools don't import from src (which would resolve Vue/Vite-aware paths).

const LOCALE_KEYS = new Set(['pt', 'en']);

export function isLocalizable(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.length > 0 && keys.every(k => LOCALE_KEYS.has(k));
}

// Pick PT first (authoring locale); fall back to EN.
export function asText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (isLocalizable(v)) return v.pt ?? v.en ?? '';
  return String(v);
}

// Deep-walk a set/exercise, flattening every {pt,en} into its PT (or EN) string.
export function localize(node) {
  if (Array.isArray(node)) return node.map(localize);
  if (isLocalizable(node)) return asText(node);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = localize(v);
    return out;
  }
  return node;
}
