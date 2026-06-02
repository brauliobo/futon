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
    name: 'removes dangling colon from short extracted choice prompts',
    run:  () => {
      const set       = YAML.parse(fs.readFileSync('src/levels/portuguese/2A/set_02.yaml', 'utf8'));
      const processed = SetProcessor.processSet(set);
      const prompts   = processed.pages.slice(0, 6).map(page => page.exercises[0].question);
      return prompts.join('|') === 'Escolha a letra B|Escolha a letra C|Escolha a letra D|B de|C de|D de';
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
    name: 'extracts article-led choices with phoneme markers',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/spanish/I/set_12.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[1].exercises[9];
      return ex.type === 'choice'
        && ex.question === '¿Cuál es la diferencia entre un alófono y un fonema?'
        && ex.choices.length === 3
        && ex.choices[1].includes('/p/ vs. /b/')
        && ex.choices[2] === 'el alófono es un error';
    },
  },
  {
    name: 'keeps short morpheme markers inside long choices',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/spanish/L/set_09.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[1].exercises[9];
      return ex.type === 'choice'
        && ex.choices.length === 3
        && ex.choices[1].includes('/fu-/')
        && ex.choices[1].includes('/v-/ en el presente indicativo')
        && ex.choices[1].includes('/i-/ como raíz por defecto');
    },
  },
  {
    name: 'extracts long portuguese inline choices with arrows',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/portuguese/G/set_15.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[9].exercises[0];
      return ex.type === 'choice'
        && ex.question === 'Qual é a ordem cronológica das gerações românticas brasileiras?'
        && ex.choices.length === 4
        && ex.choices[1] === 'Indianismo → Ultrarromantismo → Condoreirismo';
    },
  },
  {
    name: 'extracts final question-mark inline choices',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/P/set_17.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[0].exercises[0];
      return ex.type === 'choice'
        && ex.question === 'r = 1 indica correlação'
        && ex.choices.join('|') === 'perfeita positiva|nenhuma';
    },
  },
  {
    name: 'extracts long portuguese sentence choices after slash-leading capitals',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/portuguese/D/set_08.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[8].exercises[0];
      return ex.type === 'choice'
        && ex.question === 'Qual frase encadeia causa e efeito corretamente?'
        && ex.choices.length === 4
        && ex.choices[0] === 'A chuva forte alagou ruas; portanto, o trânsito parou';
    },
  },
  {
    name: 'extracts keyed inline choices as learner-facing labels',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/Q/set_17.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[2].exercises[0];
      return ex.type === 'choice'
        && ex.question === '(1,2) e (2,4): são L.D.?'
        && ex.choices.join('|') === 'sim|não'
        && ex.correctAnswer === 'sim';
    },
  },
  {
    name: 'extracts portuguese inline choices separated by chevrons',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/portuguese/I/set_19.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[2].exercises[0];
      return ex.type === 'choice'
        && ex.question === 'Um parágrafo de desenvolvimento bem construído contém:'
        && ex.choices.length === 3
        && ex.choices[1] === 'tópico frasal + argumento + evidência + análise + comentário + fechamento';
    },
  },
  {
    name: 'adds equals sign to bare math expression prompts',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/F/set_02.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[0].exercises[0];
      return ex.type === 'fraction_multiply'
        && ex.question === '3/5 × 2/3 =';
    },
  },
  {
    name: 'keeps single fraction prompts unchanged',
    run:  () => {
      const set = {
        subject: 'math',
        level:   'F',
        pages:   [{ exercises: [{ type: 'math', question: '3/5', correctAnswer: 0.6 }] }],
      };
      const ex = SetProcessor.processSet(set).pages[0].exercises[0];
      return ex.question === '3/5';
    },
  },
  {
    name: 'adds readable spacing to brace sequence prompts',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/M/set_12.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[2].exercises[0];
      return ex.type === 'sequence'
        && ex.question === 'PA {2, 5, 8, 11, ...} — razão = ?';
    },
  },
  {
    name: 'adds readable spacing to inline sequence prompts',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/M/set_13.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[4].exercises[0];
      return ex.type === 'sequence'
        && ex.question === 'PG 2, 4, 8, 16 — S₄ = ?';
    },
  },
  {
    name: 'adds readable spacing to trig equation prompts',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/M/set_19.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[4].exercises[0];
      return ex.type === 'trigonometry'
        && ex.question === 'sen(x) = 1 → x em [0°, 360°) = ?';
    },
  },
  {
    name: 'adds readable spacing to probability multiplication prompts',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/P/set_15.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[2].exercises[1];
      return ex.type === 'mental_math'
        && ex.question === 'Bin(3, 0.5) — P(X = 1) = 3 × 0.5 × 0.25 = ?';
    },
  },
  {
    name: 'adds readable comma spacing to interval prompts',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/M/set_19.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[4].exercises[0];
      return ex.type === 'trigonometry'
        && ex.question === 'sen(x) = 1 → x em [0°, 360°) = ?';
    },
  },
  {
    name: 'adds readable comma spacing to frequency-list prompts',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/P/set_05.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[4].exercises[0];
      return ex.type === 'mental_math'
        && ex.question === 'Para [1, 2, 3, 4] com frequências [2, 3, 4, 1], acumulada até 3 = ?';
    },
  },
  {
    name: 'keeps decimal-comma values intact in math delimiters',
    run:  () => {
      const set = {
        subject: 'math',
        level:   'M',
        pages:   [{ exercises: [{ type: 'math', question: 'valor (0,5) = ?', correctAnswer: 0.5 }] }],
      };
      const ex = SetProcessor.processSet(set).pages[0].exercises[0];
      return ex.question === 'valor (0,5) = ?';
    },
  },
  {
    name: 'adds readable comma spacing to half-open intervals',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/P/set_05.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[6].exercises[0];
      return ex.type === 'choice'
        && ex.question === 'Intervalo [10, 20) inclui 20?';
    },
  },
  {
    name: 'simplifies generated linear equation signs',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/H/set_03.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[0].exercises[0];
      return ex.type === 'linear_equation'
        && ex.question === '-(x - 9) = -10';
    },
  },
  {
    name: 'simplifies generated algebraic expression signs',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/G/set_06.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[0].exercises[9];
      return ex.type === 'algebraic_expression'
        && ex.question === 'Se x = 2, então -x - 6 =';
    },
  },
  {
    name: 'simplifies double-negative quadratic factors',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/I/set_03.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[0].exercises[0];
      return ex.type === 'quadratic'
        && ex.question === '(x + 9)(x - 1) = 0';
    },
  },
  {
    name: 'simplifies zero-root quadratic factors',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/I/set_03.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[0].exercises[7];
      return ex.type === 'quadratic'
        && ex.question === 'x(x + 5) = 0';
    },
  },
  {
    name: 'removes neutral zero terms from algebraic expressions',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/G/set_06.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[6].exercises[3];
      return ex.type === 'algebraic_expression'
        && ex.question === 'Se x = 8, então -5x =';
    },
  },
  {
    name: 'removes neutral zero terms from parenthesized equations',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/H/set_03.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[2].exercises[1];
      return ex.type === 'linear_equation'
        && ex.question === '5x = 5';
    },
  },
  {
    name: 'removes neutral zero terms after coefficient cleanup',
    run:  () => {
      const set = YAML.parse(fs.readFileSync('src/levels/math/K/set_11.yaml', 'utf8'));
      const ex  = SetProcessor.processSet(set).pages[4].exercises[3];
      return ex.type === 'linear_equation'
        && ex.question === 'f(x) = x/(x + 4), f(-1) = ?';
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
