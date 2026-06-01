#!/usr/bin/env node

import fs from 'node:fs';
import YAML from 'yaml';
import { SetProcessor } from '../src/services/SetProcessor.js';

const cases = [
  {
    name: 'keeps phonics slash hints as text input prompts',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/english/6A/set_01.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[0].exercises[0];
      return ex.type === 'english_vocab'
        && !ex.choices
        && ex.question.includes('(tem som /æ/)');
    },
  },
  {
    name: 'extracts nested long inline choices',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/spanish/L/set_20.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[0].exercises[1];
      return ex.type === 'choice'
        && ex.choices.length === 3
        && ex.question.endsWith('universal (set 07)?')
        && ex.choices[1].includes('Sperber/Wilson')
        && ex.choices[1].includes('(conocimiento lingüístico innato en el DAL)');
    },
  },
  {
    name: 'still extracts simple inline choices',
    run:  () => {
      const set = {
        subject: 'math',
        level:   '7A',
        pages:   [{ exercises: [{ type: 'math', question: '2 + 1 = ? (2/3/4)', correctAnswer: 3 }] }],
      };
      const ex = SetProcessor.processSet(set).pages[0].exercises[0];
      return ex.type === 'choice'
        && ex.question === '2 + 1 = ?'
        && ex.choices.join('|') === '2|3|4';
    },
  },
];

let passed = 0;
const failures = [];

for (const testCase of cases) {
  if (testCase.run()) passed += 1;
  else failures.push(testCase.name);
}

console.log(`set processor tests: ${passed} passed, ${failures.length} failed`);

if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
