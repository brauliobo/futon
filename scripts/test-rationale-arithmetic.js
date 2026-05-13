#!/usr/bin/env node
// Regression suite for eval-rationale-arithmetic's checkClaims().
// Each case asserts (a) the expected number of claims found, and (b) the
// pass/fail status of each. Run: node scripts/test-rationale-arithmetic.js

import { checkClaims } from './eval-rationale-arithmetic.js';

const cases = [
  // Clean — common rationale shapes.
  // Chained '= = =' verifies every adjacent pair.
  { text: '9×6 = (10×6)−6 = 60−6 = 54.', expectOk: [true, true, true] },
  { text: '5 − 8 = 5 + (−8). Opostos: 8 − 5 = 3; sinal (-).', expectOk: [true, true] },
  { text: 'Sistema: 2x = 8 → x = 4.', expectOk: [] },
  { text: 'Bhaskara: Δ = 9² - 4·1·14 = 81 - 56 = 25.', expectOk: [true, true] },
  { text: 'C(5,3)·2²·1³ = 10·4·1 = 40.', expectOk: [true] },
  { text: '(1/2) ÷ (1/3) = 3/2.', expectOk: [true] },
  { text: '1/2 ÷ 1/3 = 3/2.', expectOk: [true] },
  { text: 'sqrt(52) = 2·sqrt(13).', expectOk: [] }, // pure-symbolic, no eval
  { text: 'Discriminante: -9^2 - 4·3·6 = 9.', expectOk: [true] }, // (-9)^2 normalization
  { text: '0.5·0.5·0.5 = 0.125.', expectOk: [true] },
  // Approximate equality (≈) has looser tolerance.
  { text: '1/3 ≈ 0.333.', expectOk: [true] },
  { text: '√2 ≈ 1.414.', expectOk: [] }, // LHS lacks operator
  { text: '√2/2 ≈ 0.707.', expectOk: [true] },

  // Real bugs caught (chained '=' verifies every adjacent pair):
  // 9*6=54 vs (9*10)-9=81 mismatches; (9*10)-9=81 vs 90-9=81 ok; 90-9=81 vs 54 mismatches.
  { text: '9*6 = (9*10)-9 = 90-9 = 54.', expectOk: [false, true, false] },
  // 72/96 IS arithmetically 0.75 — checker only catches self-inconsistent claims,
  // not upstream-wrong-but-arithmetically-consistent ones.
  { text: '72/96 = 0.75', expectOk: [true] },

  // Genetics ratios with ':' are skipped (Mendel notation, not arithmetic).
  { text: '(3:1) × (3:1) = 9:3:3:1', expectOk: [] },
  { text: 'Como (3:1) × (3:1) = 9:3:3:1, segregação independente.', expectOk: [] },

  // Mixed '=' / '≈' chain — each pair uses its own tolerance.
  // '5·sqrt(2) ≈ 7.07' is the rightmost pair (LHS has '·' so qualifies as numeric).
  { text: '√50 = 5·√2 ≈ 7.07', expectOk: [true] },
  // Pi-bearing segments are dropped (variables), so only the '3.14·4 ≈ 12.6' pair remains.
  { text: 'V = π·r² = 3.14·4 ≈ 12.6.', expectOk: [true] },

  // Skip cases (no claims).
  { text: 'Aritmética: subtraia 3 de 10 para obter 7.', expectOk: [] },
  { text: 'Use a propriedade distributiva.', expectOk: [] },
  { text: 'f(x) = x + 1.', expectOk: [] },
  { text: '', expectOk: [] },
];

let pass = 0, fail = 0;
for (const t of cases) {
  const got = checkClaims(t.text);
  const okFlags = got.map(g => g.ok);
  const match = JSON.stringify(okFlags) === JSON.stringify(t.expectOk);
  if (match) { pass++; }
  else {
    fail++;
    console.log(`FAIL: "${t.text}"`);
    console.log(`  expected ${JSON.stringify(t.expectOk)}, got ${JSON.stringify(okFlags)}`);
    for (const g of got) console.log(`    ${g.lhs} = ${g.rhs}  (lv=${g.lv}, rv=${g.rv}, ok=${g.ok})`);
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
