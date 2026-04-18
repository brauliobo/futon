#!/usr/bin/env node
// Tests for src/utils/Shuffle.js. Ensures the seeded shuffle is
// deterministic, permutation-correct, and reasonably distributed so
// the runtime position-bias fix keeps working after future edits.

import { Shuffle } from '../src/utils/Shuffle.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const CASES = [
  {
    name: 'deterministic: same seed → same output',
    run: () => {
      const a = Shuffle.withSeed(['a', 'b', 'c', 'd'], 'seed1').join(',');
      const b = Shuffle.withSeed(['a', 'b', 'c', 'd'], 'seed1').join(',');
      return a === b;
    },
  },
  {
    name: 'different seeds → (usually) different output',
    run: () => {
      const outs = new Set();
      for (let i = 0; i < 5; i++) {
        outs.add(Shuffle.withSeed(['a', 'b', 'c', 'd'], `seed${i}`).join(','));
      }
      return outs.size >= 3; // loose: at least 3 distinct permutations
    },
  },
  {
    name: 'output is a permutation (same elements, same length)',
    run: () => {
      const input = ['cat', 'dog', 'bird', 'fish'];
      const out = Shuffle.withSeed(input, 'x');
      return out.length === input.length
        && [...input].sort().join(',') === [...out].sort().join(',');
    },
  },
  {
    name: 'input not mutated',
    run: () => {
      const input = ['a', 'b', 'c'];
      const copy = [...input];
      Shuffle.withSeed(input, 's');
      return input.join(',') === copy.join(',');
    },
  },
  {
    name: 'empty array → empty array',
    run: () => Shuffle.withSeed([], 's').length === 0,
  },
  {
    name: 'single element → single element',
    run: () => {
      const r = Shuffle.withSeed(['only'], 's');
      return r.length === 1 && r[0] === 'only';
    },
  },
  {
    name: 'rotates correct-answer position across many questions',
    run: () => {
      // Over 100 distinct seed strings, 'a' should land at index 0
      // roughly 1/4 of the time for a 4-element array (permutation).
      let atZero = 0;
      for (let i = 0; i < 100; i++) {
        const out = Shuffle.withSeed(['a', 'b', 'c', 'd'], `q${i}`);
        if (out[0] === 'a') atZero++;
      }
      return atZero >= 10 && atZero <= 50; // 25% ± expected noise
    },
  },
  {
    name: 'hash stable across calls',
    run: () => Shuffle.hash('hello') === Shuffle.hash('hello'),
  },
  {
    name: 'hash differs between inputs',
    run: () => Shuffle.hash('hello') !== Shuffle.hash('world'),
  },
];

let passed = 0, failed = 0;
const failures = [];
for (const tc of CASES) {
  if (tc.run()) passed++;
  else { failed++; failures.push(tc.name); }
}

console.log(c('\n🧪 SHUFFLE TESTS', BOLD));
console.log(`  ${passed} passed · ${failed} failed · ${CASES.length} total\n`);
if (failed) {
  console.log(c('FAILURES:', BOLD + RED));
  for (const name of failures) console.log(`  ${c('✗', RED)} ${name}`);
  process.exit(1);
}
console.log(c('✅ All shuffle cases pass.', GREEN));
