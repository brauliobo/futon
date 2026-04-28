// Bilingual content support: any text field in a set YAML may be either a
// plain string (legacy monolingual content) or an object {pt, en}. Use tx()
// to flatten one value, or localizeSet() to deep-flatten an entire set.

const LOCALE_KEYS = new Set(['pt', 'en']);

export function isLocalizable(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.length > 0 && keys.every(k => LOCALE_KEYS.has(k));
}

export function tx(value, locale) {
  if (!isLocalizable(value)) return value;
  return value[locale] ?? value.pt ?? value.en ?? '';
}

export function localizeSet(set, locale) {
  return walk(set, locale);
}

function walk(node, locale) {
  if (Array.isArray(node)) return node.map(n => walk(n, locale));
  if (isLocalizable(node)) return tx(node, locale);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v, locale);
    return out;
  }
  return node;
}
