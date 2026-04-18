#!/usr/bin/env node
// Regression tests for the rule-based fixer generators. Each case:
// [type, question, answer, expectedSubstring].
// Ensures future rule edits don't silently change generated output.

import { generateRationale } from './fix-placeholder-rationales.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const CASES = [
  // nextprev
  ['nextprev', 'Anterior de 5', '4', 'Anterior = conte 1 para trás: 5 → 4'],
  ['nextprev', 'Próximo de 7', '8', 'Próximo = conte 1 para frente: 7 → 8'],
  ['nextprev', 'Anterior de 1', '0', 'Anterior = conte 1 para trás: 1 → 0'],

  // sequence
  ['sequence', '4, __, 6', '5', 'Entre 4 e 6: conte +1 a partir de 4 → 5'],
  ['sequence', '__, 3, 4', '2', 'Antes de 3: conte -1 → 2'],
  ['sequence', '2, 3, __', '4', 'Depois de 3: conte +1 → 4'],

  // place_value
  ['place_value', 'Quantas unidades tem o número 13?', '3', 'Unidade = último algarismo. 13 → 3 unidades'],
  ['place_value', 'Quantas dezenas tem o número 25?', '2', 'Dezena = algarismo antes da unidade. 25 → 2 dezena'],

  // even_odd
  ['even_odd', 'O número 6 é:', 'par', '6 é par: termina em 0, 2, 4, 6 ou 8'],
  ['even_odd', 'O número 9 é:', 'ímpar', '9 é ímpar: termina em 1, 3, 5, 7 ou 9'],

  // word_problem
  ['word_problem', 'João tem 5 ★. Maria deu mais 3 ★. Quantas?', '8', 'Ele tinha 5 e ganhou 3: some 5 + 3 = 8'],
  ['word_problem', 'Ana tinha 10 ●. Perdeu 4 ●. Quantas?', '6', 'Começou com 10 e perdeu 4: subtraia 10 - 4 = 6'],

  // skip_counting
  ['skip_counting', '2, 4, 6, ?', '8', 'Contagem de +2 em +2: 6 + 2 = 8'],

  // trigonometry
  ['trigonometry', 'arccos(√2/2) = ?', '45°', 'arccos(√2/2) = 45° porque cos(45°) = √2/2'],
  ['trigonometry', 'arcsen(1) = ?', '90°', 'arcsen(1) = 90° porque sen(90°) = 1'],
  ['trigonometry', '1/sen(30°) = ?', '2', '1/sen(30°) = 2 (cossecante)'],

  // Rule-miss cases (expected null — no false-positive fallback)
  ['nextprev', 'Some 5 + 3', '8', null],
  ['sequence', 'algo diferente', '5', null],
];

let passed = 0, failed = 0;
const failures = [];
for (const [type, q, a, expected] of CASES) {
  const got = generateRationale(type, q, a);
  const ok = expected === null ? got === null : (got && got.includes(expected));
  if (ok) passed++;
  else { failed++; failures.push({ type, q, a, expected, got }); }
}

console.log(c('\n🧪 FIXER RULE TESTS', BOLD));
console.log(`  ${passed} passed · ${failed} failed · ${CASES.length} total\n`);
if (failed) {
  console.log(c('FAILURES:', BOLD + RED));
  for (const f of failures) {
    console.log(`  ${c('✗', RED)} ${f.type} "${f.q}" → ${f.a}`);
    console.log(c(`     expected: ${f.expected}`, GRAY));
    console.log(c(`     got:      ${f.got}`, GRAY));
  }
  process.exit(1);
}
console.log(c('✅ All fixer cases pass.', GREEN));
