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
  {
    name: 'answerFromParts emits whole-only mixed answers',
    run:  () => {
      return Fraction.answerFromParts({ whole: '2', numerator: '', denominator: '' }) === '2'
        && Fraction.answerFromParts({ whole: '2', numerator: '1', denominator: '3' }) === '2 1/3';
    },
  },
  {
    name: 'parts formats parenthesized numeric coefficients as stacked fractions',
    run:  () => {
      const parts     = Fraction.parts('(1/2)x^2 + C');
      const fractions = parts.filter(part => part.type === 'fraction');
      const text      = parts.filter(part => part.type === 'text').map(part => part.value).join('');

      return fractions.length === 1
        && fractions[0].value === '(1/2)'
        && fractions[0].numerator === '1'
        && fractions[0].denominator === '2'
        && text === 'x^2 + C';
    },
  },
  {
    name: 'parts formats variable denominator proportions for display',
    run:  () => {
      const fractions = Fraction.parts('5/10 = 2/x')
        .filter(part => part.type === 'fraction');

      return fractions.length === 2
        && fractions[0].numerator === '5'
        && fractions[0].denominator === '10'
        && fractions[1].numerator === '2'
        && fractions[1].denominator === 'x';
    },
  },
  {
    name: 'parts formats radical fractions for display',
    run:  () => {
      const fractions = Fraction.parts('sen(60°) = √3/2 e cos(225°) = -√2/2')
        .filter(part => part.type === 'fraction');

      return fractions.length === 2
        && fractions[0].numerator === '√3'
        && fractions[0].denominator === '2'
        && fractions[1].numerator === '-√2'
        && fractions[1].denominator === '2';
    },
  },
  {
    name: 'parts formats trig function denominators for display',
    run:  () => {
      const fractions = Fraction.parts('1/sen(300°) = ? e 1/cos(210°) = ?')
        .filter(part => part.type === 'fraction');

      return fractions.length === 2
        && fractions[0].numerator === '1'
        && fractions[0].denominator === 'sen(300°)'
        && fractions[1].denominator === 'cos(210°)';
    },
  },
  {
    name: 'hasFraction stays numeric-only for fraction keypad',
    run:  () => {
      return Fraction.hasFraction('3/5')
        && !Fraction.hasFraction('√3/2')
        && !Fraction.hasFraction('1/sen(300°)');
    },
  },
  {
    name: 'parts formats parenthesized trig expressions for display',
    run:  () => {
      const fractions = Fraction.parts('tan(x/2) = (1-cos x)/sen x')
        .filter(part => part.type === 'fraction');

      return fractions.length === 2
        && fractions[0].numerator === 'x'
        && fractions[0].denominator === '2'
        && fractions[1].numerator === '(1-cos x)'
        && fractions[1].denominator === 'sen x'
        && !Fraction.hasFraction('(1-cos x)/sen x');
    },
  },
  {
    name: 'parts formats bare trig denominators for display',
    run:  () => {
      const fractions = Fraction.parts('csc = 1/sen e sec = 1/cos')
        .filter(part => part.type === 'fraction');

      return fractions.length === 2
        && fractions[0].numerator === '1'
        && fractions[0].denominator === 'sen'
        && fractions[1].denominator === 'cos'
        && !Fraction.hasFraction('1/sen');
    },
  },
  {
    name: 'parts formats triangle ratio labels for display',
    run:  () => {
      const fractions = Fraction.parts('sen θ = CO/H; cos θ = CA/H')
        .filter(part => part.type === 'fraction');

      return fractions.length === 2
        && fractions[0].numerator === 'CO'
        && fractions[0].denominator === 'H'
        && fractions[1].numerator === 'CA'
        && fractions[1].denominator === 'H';
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
