#!/usr/bin/env node
// Regression tests for the rule-based fixer generators. Each case:
// [type, question, answer, expectedSubstring].
// Ensures future rule edits don't silently change generated output.

import { generateRationale } from './fix-placeholder-rationales.js';
import { generateRationale as generateJP } from './fix-japanese-rationales.js';
import { generateRationale as generateRestatement } from './fix-restatements.js';
import { generateRationale as gen5A } from './fix-5a-rationales.js';
import { rationaleFor as genPower } from './fix-power-root-rationales.js';
import { rationaleFor as genBinomial } from './fix-binomial-rationales.js';
import { rationaleFor as genIntegral } from './fix-integral-rationales.js';
import { rationaleFor as gen6ACount } from './fix-6a-counting-rationales.js';
import { rationaleFor as genSeries } from './fix-series-rationales.js';

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

const JP_CASES = [
  // kanji → digit
  ['japanese_vocab', '一', '1', 'O kanji 一 representa o número 1'],
  // digit → kanji
  ['japanese_vocab', '1', '一', '1 em kanji escreve-se 一'],
  // kanji → kana reading
  ['japanese_vocab', '一', 'いち', '一 lê-se いち'],
  // kanji → Portuguese meaning
  ['japanese_vocab', '犬', 'cachorro', 'O kanji 犬 significa "cachorro"'],
  // katakana → Portuguese (loanword)
  ['japanese_vocab', 'ブラジル', 'Brasil', 'ブラジル (katakana) significa "Brasil"'],
  // hiragana ↔ katakana
  ['kana_writing', 'あ', 'ア', 'あ (hiragana) corresponde a ア em katakana'],
  // kana → romaji
  ['kana_reading', 'あ', 'a', 'あ lê-se "a" (romaji)'],
  // romaji → kana
  ['kana_writing', 'a', 'あ', 'O som "a" em hiragana escreve-se あ'],
  // kana number-reading → digit
  ['japanese_vocab', 'いち', '1', 'いち é a leitura do número 1'],
  // digit → kana reading
  ['japanese_vocab', '1', 'いち', 'O número 1 lê-se "いち"'],
  // mixed-script with kanji falls under kanji→text rule first (by design)
  ['japanese_vocab', '学生ですか', 'Estudante?', 'significa "Estudante?"'],
  // Unknown pair → null
  ['japanese_vocab', '???', 'mystery', null],
];

// fix-5a-rationales: takes {question, correctAnswer} exercise, returns rationale.
const FIVE_A_CASES = [
  [{ question: 'Depois de 5 vem:', correctAnswer: 6 }, 'Sucessor de 5 = 5+1 = 6'],
  [{ question: 'Antes de 10 vem:', correctAnswer: 9 }, 'Antecessor de 10 = 10-1 = 9'],
  [{ question: '3, 4, 5, ?', correctAnswer: 6 }, 'Sequência de +1 em +1: 5 + 1 = 6'],
  [{ question: '2, 4, 6, 8, ?', correctAnswer: 10 }, 'Sequência de +2 em +2: 8 + 2 = 10'],
  [{ question: '5 ? 8', correctAnswer: '<' }, '5 é menor que 8, então 5 < 8'],
  [{ question: '7 ? 7', correctAnswer: '=' }, '7 e 7 são iguais, então 7 = 7'],
  [{ question: '5 + ? = 9', correctAnswer: 4 }, 'Inverso da adição: 9 − 5 = 4'],
  [{ question: '? + 6 = 11', correctAnswer: 5 }, 'Inverso da adição: 11 − 6 = 5'],
  [{ question: '12 - ? = 7', correctAnswer: 5 }, 'Inverso da subtração: 12 − 7 = 5'],
  [{ question: '? - 4 = 6', correctAnswer: 10 }, 'Inverso da subtração: 6 + 4 = 10'],
  [{ question: 'Quantas unidades tem 17?', correctAnswer: 7 }, '17 tem 7 unidades'],
  [{ question: 'unrelated', correctAnswer: 'x' }, null],
];

// fix-power-root-rationales: (question, answer) → rationale
const POWER_CASES = [
  ['6^3', '216', '6^3 = 6·6·6 = 216'],
  ['3^3', '27', '3^3 = 3·3·3 = 27'],
  ['5^2', '25', '5^2 = 5·5 = 25'],
  ['x^3 = 1331', '11', 'Raiz cúbica de 1331 é 11'],
  ['x^2 = 144', '12', 'Raiz quadrada de 144 é 12'],
  ['unrelated', '0', null],
];

// fix-binomial-rationales: (a, b) → rationale
const BINOMIAL_CASES = [
  [7, -6, 'Soma: 7+-6=1; produto: 7·-6=-42. Logo x² + 1x + -42'],
  [1, -2, 'Soma: 1+-2=-1; produto: 1·-2=-2'],
  [6, 4, 'Soma: 6+4=10; produto: 6·4=24'],
];

// fix-series-rationales: question → rationale
const SERIES_CASES = [
  ['Σ 1/n² converge (V/F)?', 'p-série'],
  ['Σ q^n converge se |q| < ?', 'geométrica'],
  ['Σ (1/2)^n = 1 + 1/2 + 1/4 + ... = ?', 'geométrica'],
  ['Σ(-1)^n/n converge? (sim/não)', 'Leibniz'],
  ['Σ 2^n/n!: aₙ₊₁/aₙ = 2/(n+1) → 0. Converge? (sim/não)', 'razão'],
  ['(a+b)³ = a³ + 3a²b + 3ab² + ?', 'a+b'],
  ['Soma dos coef. de (2+x)³ (fazendo x=1): 3³ = ?', 'a+b'],
  ['(cis 30°)² = cis ?°', 'De Moivre'],
  ['i⁴ = cis 360° = ?', 'Potências de i'],
  ['e^(iπ) + 1 = ?', 'Euler'],
  ['Uma raiz cúbica de 1 é 1. As outras duas estão em 120° e ?°', 'Raízes n-ésimas'],
  ['unrelated question with no signal', null],
];

// fix-6a-counting-rationales: n → rationale
const COUNT_CASES = [
  [1, 'Um único símbolo.'],
  [2, 'Conte apontando: 1, 2.'],
  [3, 'Conte apontando: 1, 2, 3.'],
  [4, 'Conte um a um, sem pular: total 4.'],
  [7, 'Conte um a um, sem pular: total 7.'],
];

// fix-integral-rationales: question → rationale
const INTEGRAL_CASES = [
  ['∫ 3sec²(x) dx = ?', 'sec²(x) dx = tan(x) + C'],
  ['∫ 4cos(x) dx = ?', 'cos(x) dx = sen(x) + C'],
  ['∫ 2sen(x) dx = ?', 'sen(x) dx = -cos(x) + C'],
  ['∫ e^{2x} dx = ?', '∫ e^(2x) dx = (1/2)·e^(2x) + C'],
  ['∫ 3e^x dx = ?', 'eˣ dx = eˣ + C'],
  ['∫ sen(2x) dx', null], // unsupported — inner coefficient on trig
];

// Restatement rewriter — takes (question, answer), returns method form.
const RESTATEMENT_CASES = [
  ['Qual é uma vogal? (A/B/C)', 'A', 'A, E, I, O, U são as vogais'],
  ['Qual é uma cor? (AZUL/CASA/PAPAI)', 'AZUL', 'é um(a) cor'],
  ['Qual é um animal? (gato/mesa/flor)', 'gato', 'é um(a) animal'],
  ['Generic question with no category?', 'x', 'Observe as opções'],
];

let passed = 0, failed = 0;
const failures = [];
const run = (fn, label) => ([type, q, a, expected]) => {
  const got = fn(type, q, a);
  const ok = expected === null ? got === null : (got && got.includes(expected));
  if (ok) passed++;
  else { failed++; failures.push({ label, type, q, a, expected, got }); }
};
for (const tc of CASES) run(generateRationale, 'placeholder')(tc);
for (const tc of JP_CASES) run(generateJP, 'japanese')(tc);

// Restatement generator has a different signature (q, a) — wrapper.
for (const [q, a, expected] of RESTATEMENT_CASES) {
  const got = generateRestatement(q, a);
  const ok = got && got.includes(expected);
  if (ok) passed++;
  else { failed++; failures.push({ label: 'restatement', type: '-', q, a, expected, got }); }
}

// fix-5a-rationales
for (const [ex, expected] of FIVE_A_CASES) {
  const got = gen5A(ex);
  const ok = expected === null ? got === null : (got && got.includes(expected));
  if (ok) passed++;
  else { failed++; failures.push({ label: '5a', type: '-', q: ex.question, a: ex.correctAnswer, expected, got }); }
}

// fix-power-root-rationales
for (const [q, a, expected] of POWER_CASES) {
  const got = genPower(q, a);
  const ok = expected === null ? got === null : (got && got.includes(expected));
  if (ok) passed++;
  else { failed++; failures.push({ label: 'power', type: '-', q, a, expected, got }); }
}

// fix-binomial-rationales
for (const [a, b, expected] of BINOMIAL_CASES) {
  const got = genBinomial(a, b);
  const ok = got && got.includes(expected);
  if (ok) passed++;
  else { failed++; failures.push({ label: 'binomial', type: '-', q: `(x+${a})(x+${b})`, a: '', expected, got }); }
}

// fix-integral-rationales
for (const [q, expected] of INTEGRAL_CASES) {
  const got = genIntegral(q);
  const ok = expected === null ? got === null : (got && got.includes(expected));
  if (ok) passed++;
  else { failed++; failures.push({ label: 'integral', type: '-', q, a: '', expected, got }); }
}

// fix-6a-counting-rationales
for (const [n, expected] of COUNT_CASES) {
  const got = gen6ACount(n);
  const ok = got === expected;
  if (ok) passed++;
  else { failed++; failures.push({ label: '6a-count', type: '-', q: `count=${n}`, a: '', expected, got }); }
}

// fix-series-rationales
for (const [q, expected] of SERIES_CASES) {
  const got = genSeries(q);
  const ok = expected === null ? got === null : (got && got.includes(expected));
  if (ok) passed++;
  else { failed++; failures.push({ label: 'series', type: '-', q, a: '', expected, got }); }
}

const totalCases = CASES.length + JP_CASES.length + RESTATEMENT_CASES.length + FIVE_A_CASES.length + POWER_CASES.length + BINOMIAL_CASES.length + INTEGRAL_CASES.length + COUNT_CASES.length + SERIES_CASES.length;
console.log(c('\n🧪 FIXER RULE TESTS', BOLD));
console.log(`  ${passed} passed · ${failed} failed · ${totalCases} total\n`);
if (failed) {
  console.log(c('FAILURES:', BOLD + RED));
  for (const f of failures) {
    console.log(`  ${c('✗', RED)} [${f.label}] ${f.type} "${f.q}" → ${f.a}`);
    console.log(c(`     expected: ${f.expected}`, GRAY));
    console.log(c(`     got:      ${f.got}`, GRAY));
  }
  process.exit(1);
}
console.log(c('✅ All fixer cases pass.', GREEN));
