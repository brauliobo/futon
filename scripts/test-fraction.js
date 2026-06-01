#!/usr/bin/env node

import { Fraction } from '../src/utils/Fraction.js';

const cases = [
  {
    name: 'parts formats the first fraction after hasFraction',
    run:  () => {
      Fraction.hasFraction('3/5');

      const fractions = Fraction.parts('1/5 + 2/5 =').filter(part => part.type === 'fraction');
      return fractions.length === 2
        && fractions[0].value === '1/5'
        && fractions[1].value === '2/5';
    },
  },
  {
    name: 'parts formats mixed and simple fractions together',
    run:  () => {
      const parts = Fraction.parts('1 2/3 + 4/3');
      return parts.some(part => part.type === 'mixed' && part.value === '1 2/3')
        && parts.some(part => part.type === 'fraction' && part.value === '4/3');
    },
  },
];

let passed = 0;
const failures = [];

for (const testCase of cases) {
  if (testCase.run()) passed += 1;
  else failures.push(testCase.name);
}

console.log(`fraction tests: ${passed} passed, ${failures.length} failed`);

if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
