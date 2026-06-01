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
  {
    name: 'extracts inline choices around phoneme slash notation',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/spanish/I/set_12.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[1].exercises[2];
      return ex.type === 'choice'
        && ex.question === "¿Qué proceso fonológico ocurre en 'desde' → [dezðe] en habla rápida?"
        && ex.choices.length === 3
        && ex.choices[1].includes('sonorización de /s/ ante /d/')
        && ex.choices[2] === 'metátesis';
    },
  },
  {
    name: 'removes repeated generated boilerplate from dense choices',
    run:  () => {
      const set    = YAML.parse(fs.readFileSync('src/levels/biology/N/set_19.yaml', 'utf8'));
      const choice = SetProcessor.processSet(set).pages[1].exercises[5].choices[0].pt;
      return choice.length < 430
        && !choice.includes('frontier translational scale-up commercial')
        && !choice.includes('emerging next-bio-recycling');
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
