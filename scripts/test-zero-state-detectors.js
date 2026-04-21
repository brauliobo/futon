#!/usr/bin/env node
// Unit tests for the three zero-state hard-fail detectors.
// Guards against detector-side regression (regex changes that accidentally
// stop catching known bad patterns, or start flagging legitimate teaching).
//
// Runs under pnpm test:eval.

import { PATTERNS, isEcho } from './eval-tautological-rationales.js';

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
