#!/usr/bin/env node
// Regression tests for scripts/lib/rationale.js categorize().
// Each case: [category, rationale, context?]. Exits 1 on any mismatch so
// `pnpm test:eval` can gate future regex/lexicon edits in CI.

import { categorize } from './lib/rationale.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const CASES = [
  // --- method: imperatives (PT) ---
  ['method', 'Faça 10: 9+1=10, depois +2 = 12.', 'classic faça+depois'],
  ['method', 'Observe a terminação: -mente marca advérbio.', 'observe + termina'],
  ['method', 'Tome 10 emprestado → (12-3) e (4-2).', 'math borrow'],
  ['method', 'Conte de 2 em 2 a partir de 0.', 'conte skip-counting'],
  ['method', 'Use o teste: "quem pratica a ação" → sujeito.', 'use test'],
  ['method', 'Lembre: A, E, I, O, U são vogais.', 'lembre + vogal'],
  ['method', 'Sublinhe a palavra-chave antes de responder.', 'sublinhe'],

  // --- method: reasoning connectors + domain verbs ---
  ['method', 'Primeiro isole x, depois substitua y.', 'primeiro+depois'],
  ['method', 'Barroco: antítese, dualismo, fé vs razão.', 'literature terms'],
  ['method', 'Hipérbole: exagero proposital para intensificar.', 'figures + intensifica'],
  ['method', 'Arranjo A(n,k) = n!/(n-k)!.', 'combinatorics concept'],
  ['method', 'Fatorial: n! = n·(n-1)·...·1.', 'fatorial concept'],

  // --- method: computation / substitution / transformation ---
  ['method', 'f(-4) = 3·(-4) + 8 = -12 + 8 = -4.', 'computation chain'],
  ['method', "'Could' = habilidade geral passada.", 'quoted definition'],
  ['method', 'Desenvolvimento = expandir a ideia central com detalhes.', 'unquoted cap def'],
  ['method', "'study' → 'studied' (backshift present→past).", 'arrow transform'],
  ['method', '3 em kanji escreve-se 三.', 'JP translation'],

  // --- method: digraph / phonetics / JP concepts ---
  ['method', "'chuva' contém o dígrafo CH.", 'dígrafo'],
  ['method', 'いち é a leitura do número 1.', 'kana→digit reading'],

  // --- generic: factual but no method signal ---
  ['generic', 'O sol brilha durante o dia.', 'factoid, no method'],
  ['generic', 'É um animal de grande porte.', 'vague, no method'],

  // --- restatement ---
  ['restatement', "A resposta correta é 'azul'.", 'PT restatement'],
  ['restatement', "A grafia correta é 'mãe'.", 'PT grafia'],
  ['restatement', "A preposição correta aqui é 'de'.", 'preposition restate'],
  ['restatement', 'The correct answer is five.', 'EN restatement'],

  // --- short / long / missing ---
  ['short', 'Ok.', 'too short'],
  ['long', 'A'.repeat(320), 'too long'],
  ['missing', '', 'empty'],
  ['missing', null, 'null'],

  // --- regression guards (iter 59/60 bugfix) ---
  ['method', 'Anterior = conte 1 para trás: 1 → 0.', 'answer 0 / digit'],
];

let passed = 0, failed = 0;
const failures = [];

for (const [expected, input, note] of CASES) {
  const got = categorize(input);
  if (got === expected) passed++;
  else {
    failed++;
    failures.push({ expected, got, input: String(input).slice(0, 50), note });
  }
}

console.log(c('\n🧪 RATIONALE CATEGORIZER TESTS', BOLD));
console.log(`  ${passed} passed · ${failed} failed · ${CASES.length} total\n`);

if (failed) {
  console.log(c('FAILURES:', BOLD + RED));
  for (const f of failures) {
    console.log(`  ${c('✗', RED)} expected ${c(f.expected, YELLOW)} · got ${c(f.got, RED)}  [${f.note}]`);
    console.log(c(`     "${f.input}"`, GRAY));
  }
  process.exit(1);
}

console.log(c('✅ All categorize() cases pass.', GREEN));
