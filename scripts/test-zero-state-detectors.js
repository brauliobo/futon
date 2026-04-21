#!/usr/bin/env node
// Unit tests for the three zero-state hard-fail detectors.
// Guards against detector-side regression (regex changes that accidentally
// stop catching known bad patterns, or start flagging legitimate teaching).
//
// Runs under pnpm test:eval.

import { PATTERNS, isEcho } from './eval-tautological-rationales.js';
import { classify, RATIONALE_RULES, compatible } from './eval-pt-category-mismatch.js';
import { normalize, parseExample, isSpoiler, SKIP } from './eval-example-spoiler.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

let pass = 0, fail = 0;
const failures = [];

function expect(label, got, want) {
  if (got === want) { pass++; return; }
  fail++;
  failures.push(`${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

function matchesAny(rationale) {
  return PATTERNS.some(p => p.re.test(rationale)) || null;
}

// --- look-at-options (should flag) ---
expect(
  'look-at-options canonical',
  !!PATTERNS.find(p => p.name === 'look-at-options').re.test(
    'Observe as opções e escolha a que responde "X?": \'Y\'.'
  ),
  true,
);

// --- belongs-to-category (should flag) ---
expect(
  'belongs-to-category canonical',
  !!PATTERNS.find(p => p.name === 'belongs-to-category').re.test(
    "'pássaro' pertence à categoria: animal voador."
  ),
  true,
);

// --- answer-is-X (should flag) ---
expect(
  'answer-is-X — A resposta é',
  !!PATTERNS.find(p => p.name === 'answer-is-X').re.test('A resposta é X.'),
  true,
);
expect(
  'answer-is-X — Resposta:',
  !!PATTERNS.find(p => p.name === 'answer-is-X').re.test('Resposta: X.'),
  true,
);

// --- legitimate teaching rationales (should NOT flag) ---
const legitimate = [
  'O gato mia; pato grasna e cão late.',
  "'Mas' indica oposição entre ideias.",
  'Em CASA: C-A-S-A → a primeira letra é C.',
  'AVIÃO tem V e til (~) em -ão.',
  'O sol é o astro que brilha durante o dia; lua brilha de noite.',
  'Aplique a fórmula de Bhaskara: x = (-b ± √Δ) / 2a.',
  "'Felizmente' deriva de 'feliz' + -mente — mantém Z.",
];
for (const r of legitimate) {
  expect(`legitimate not flagged: "${r.slice(0, 40)}..."`, matchesAny(r), null);
}

// --- isEcho filler-stem detection ---
// Only generic-filler stems should trigger isEcho, not substantive teaching
// that happens to end with the answer in quotes.
expect('echo: filler stem with answer match',
  isEcho("O verbo concorda com o sujeito: 'Os'.", 'Os'),
  true);
expect('echo: filler stem miolo',
  isEcho("O miolo da palavra é escrito em minúsculas: 'asa'.", 'asa'),
  true);
expect('echo: substantive teaching NOT flagged',
  isEcho("Adjetivos longos usam 'more', não -er: 'more beautiful'.", 'more beautiful'),
  false);
expect('echo: answer mismatch NOT flagged',
  isEcho("O verbo concorda com o sujeito: 'Os'.", 'As'),
  false);
expect('echo: no quoted tail NOT flagged',
  isEcho('Some os operandos e obtenha 12.', '12'),
  false);

// --- eval:pt-category classify() ---
expect('classify Eu → pronome pessoal', classify('Eu'), 'pronome pessoal');
expect('classify O → artigo', classify('O'), 'artigo');
expect('classify Meu → pronome possessivo', classify('Meu'), 'pronome possessivo');
expect('classify Este → pronome demonstrativo', classify('Este'), 'pronome demonstrativo');
expect('classify De → preposição', classify('de'), 'preposição');
expect('classify rapidamente → advérbio', classify('rapidamente'), 'advérbio');
expect('classify casa → null (substantivo out of scope)', classify('casa'), null);
expect('classify empty → null', classify(''), null);

// --- RATIONALE_RULES detection ---
function detectRationaleCat(r) {
  for (const rule of RATIONALE_RULES) {
    if (rule.re.test(r)) return rule.cat;
  }
  return null;
}
expect('rationale rule: pronome pessoal',
  detectRationaleCat('Pronome pessoal reto concorda em pessoa com o verbo.'),
  'pronome pessoal');
expect('rationale rule: artigo',
  detectRationaleCat('Artigo concorda em gênero e número com o substantivo.'),
  'artigo');
expect('rationale rule: demonstrativo',
  detectRationaleCat('Demonstrativos situam no tempo/espaço.'),
  'pronome demonstrativo');

// --- compatible() incompatibility detection (the whole point of the evaluator) ---
expect('compat: pronome pessoal ↔ artigo = FALSE',
  compatible('pronome pessoal', 'artigo'), false);
expect('compat: pronome pessoal ↔ pronome pessoal = TRUE',
  compatible('pronome pessoal', 'pronome pessoal'), true);
expect('compat: artigo ↔ pronome pessoal = FALSE',
  compatible('artigo', 'pronome pessoal'), false);
expect('compat: pronome demonstrativo ↔ pronome indefinido = FALSE',
  compatible('pronome demonstrativo', 'pronome indefinido'), false);

// --- eval:example-spoiler ---
expect('normalize strips inline (a/b) choices',
  normalize('Vou para ___ festa. (da/na/para)'),
  'vou para ___ festa.');
expect('normalize lowercases + collapses whitespace',
  normalize('  HELLO   World  '),
  'hello world');

expect('parseExample extracts only Q → A portion (ignores preamble)',
  JSON.stringify(parseExample('Vocab. Ex.: Vermelho → red.')),
  JSON.stringify({ exQ: 'vermelho', exA: 'red' }));
const parsed = parseExample('Type the English word. Ex.: Verde → green');
expect('parseExample exQ', parsed?.exQ, 'verde');
expect('parseExample exA', parsed?.exA, 'green');
expect('parseExample returns null for empty', parseExample(''), null);
expect('parseExample returns null without Ex.:', parseExample('Just a description, no example.'), null);

expect('isSpoiler: same Q and A = true',
  isSpoiler('Color. Ex.: Verde → green', 'Verde', 'green'),
  true);
expect('isSpoiler: different Q = false',
  isSpoiler('Color. Ex.: Verde → green', 'Vermelho', 'red'),
  false);
expect('isSpoiler: same Q different A = false',
  isSpoiler('Color. Ex.: Verde → green', 'Verde', 'verd'),
  false);
expect('isSpoiler: inline choices stripped for comparison',
  isSpoiler('Ex.: Verde → green', 'Verde (options/are/stripped)', 'green'),
  true);

// --- SKIP patterns: drill levels and japanese ---
expect('SKIP: math/1A matches',
  SKIP.some(rx => rx.test('src/levels/math/1A/set_01.yaml')),
  true);
expect('SKIP: math/H does NOT match',
  SKIP.some(rx => rx.test('src/levels/math/H/set_01.yaml')),
  false);
expect('SKIP: portuguese/4A matches',
  SKIP.some(rx => rx.test('src/levels/portuguese/4A/set_01.yaml')),
  true);
expect('SKIP: portuguese/C does NOT match',
  SKIP.some(rx => rx.test('src/levels/portuguese/C/set_01.yaml')),
  false);
expect('SKIP: japanese matches',
  SKIP.some(rx => rx.test('src/levels/japanese/4A/set_01.yaml')),
  true);

// --- Report ---
console.log(c(`\n🧪 ZERO-STATE DETECTOR TESTS`, BOLD));
console.log(`  ${pass + fail} cases run`);
if (fail === 0) {
  console.log(c(`  ✅ ${pass} passed`, GREEN));
  process.exit(0);
}
console.log(c(`  ❌ ${fail} failed, ${pass} passed`, RED));
for (const f of failures) console.log(c(`     ${f}`, RED));
process.exit(1);
