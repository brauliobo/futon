// Shared rationale classification used by pedagogy-eval.js and
// rationale-review.js. Categories are defined in docs/PEDAGOGY.md.

// Method vocabulary: imperatives, reasoning connectors, and domain-specific
// operation/concept words. A rationale earns "method" credit if it uses any
// of these — i.e. it teaches *how* or *why*, not just restates the answer.
export const METHOD_RE = new RegExp('\\b(?:' + [
  // Imperatives (PT)
  'faça', 'conte', 'some', 'soma[rm]?', 'subtraia', 'divida', 'multiplique',
  'tom[ea]r?', 'emprest[eao]d?o?', 'reagrup[ea]', 'peç[ao]', 'guard[ea]',
  'observ[ea]', 'veja', 'compare', 'troque', 'apliqu[ea]', 'use', 'note',
  'lembr[ea]', 'localize', 'sublinhe', 'releia', 'identifique', 'procure',
  'marque', 'circule', 'escolha', 'escreva', 'mostr[ea]',
  // Reasoning connectors (PT)
  'primeiro', 'depois', 'ent[ãa]o', 'porque', 'basta', 'logo', 'portanto',
  'assim', 'pois', 'como', 'se\\b', 'quando', 'enquanto',
  // Math concepts (PT)
  'dobro', 'metade', 'terç[oa]', 'fórmula', 'regra', 'unidade', 'dezena',
  'centena', 'coluna', 'dígito', 'rest[ao]', 'sobr[ae]', 'vai.um',
  'm[íi]nimo', 'm[áa]ximo', 'produto', 'quociente', 'diferença', 'total',
  // Grammar / reading concepts (PT)
  'termin[ao]', 'respond[ae]', 'modifica', 'liga', 'indica', 'substitui',
  'acompanha', 'determina', 'introduz', 'marca', 'função', 'sufixo',
  'prefixo', 'parágrafo', 'trecho', 'pista', 'contexto', 'palavra.chave',
  'sílaba', 'acento', 'género|gênero', 'número',
  // English equivalents
  'first', 'then', 'because', 'count', 'add', 'subtract', 'multiply',
  'divide', 'double', 'half', 'step', 'notice', 'start', 'rule', 'pattern',
  'locate', 'identify', 'replace', 'means', 'indicates', 'modifies',
  'links', 'substitute', 'determines', 'ends\\s+with', 'starts\\s+with',
  'borrow', 'carry', 'digit', 'column', 'regroup',
].join('|') + ')\\b', 'i');

export const RESTATE_RE = /^\s*(a\s+resposta\s+é|resposta:|answer:|é\s+\d|is\s+\d)/i;

export function categorize(rationale) {
  if (!rationale || typeof rationale !== 'string') return 'missing';
  const s = rationale.trim();
  if (s.length < 10) return 'short';
  if (s.length > 300) return 'long';
  if (RESTATE_RE.test(s)) return 'restatement';
  if (METHOD_RE.test(s)) return 'method';
  return 'generic';
}
