#!/usr/bin/env node
// Add set-level difficulty, objectives, authorNotes to YAML files that lack them.
// Usage: node scripts/backfill-metadata.mjs <subject> <level> [--apply]

import fs from 'fs';
import path from 'path';

const [, , subject, level, ...rest] = process.argv;
const apply = rest.includes('--apply');

if (!subject || !level) {
  console.error('Usage: backfill-metadata.mjs <subject> <level> [--apply]');
  process.exit(1);
}

const DIFFICULTY_BY_LEVEL = {
  math: {
    '7A': 1, '6A': 1, '5A': 1, '4A': 1, '3A': 1, '2A': 1, '1A': 1,
    'A': 2, 'B': 2, 'C': 2, 'D': 2,
    'E': 3, 'F': 3, 'G': 3, 'H': 3,
    'I': 4, 'J': 4, 'K': 4,
    'L': 5, 'M': 5, 'N': 5, 'O': 5,
    'P': 4, 'Q': 4,
  },
  portuguese: {
    '7A': 1, '6A': 1, '5A': 1, '4A': 1, '3A': 1, '2A': 1, '1A': 1,
    'A': 2, 'B': 2, 'C': 3, 'D': 3,
  },
  english: { A: 1, B: 1, C: 2, D: 2 },
};

const OBJECTIVES_BY_LEVEL = {
  math: {
    '7A': 'math.counting.basic',
    '6A': 'math.counting.intermediate',
    '5A': 'math.numeracy',
    '4A': 'math.addition.basic',
    '3A': 'math.addition.advanced',
    '2A': 'math.subtraction',
    '1A': 'math.add_sub_0_10',
    A: 'math.addition.within_20', B: 'math.add_sub.regrouping',
    C: 'math.multiplication', D: 'math.division',
    E: 'math.fractions.add_sub', F: 'math.fractions_decimals',
    G: 'math.integers_expressions', H: 'math.linear_equations',
    I: 'math.quadratics_exponents', J: 'math.advanced_algebra',
    K: 'math.functions_graphs', L: 'math.trigonometry',
    M: 'math.trigonometry.advanced', N: 'math.differential_calculus',
    O: 'math.integral_calculus', P: 'math.probability_statistics',
    Q: 'math.geometry_linalg',
  },
  portuguese: {
    '7A': 'pt.pre_reading', '6A': 'pt.pre_reading',
    '5A': 'pt.literacy', '4A': 'pt.literacy', '3A': 'pt.literacy', '2A': 'pt.literacy',
    '1A': 'pt.basic_literacy',
    A: 'pt.sentence_building', B: 'pt.sentence_building', C: 'pt.sentence_building',
    D: 'pt.paragraph_building',
  },
  english: { A: 'en.vocab', B: 'en.phrases', C: 'en.past_simple', D: 'en.future_comparison' },
};

const levelDir = path.join(process.cwd(), 'src', 'levels', subject, level);
if (!fs.existsSync(levelDir)) {
  console.error(`Missing directory ${levelDir}`);
  process.exit(1);
}

const difficulty = DIFFICULTY_BY_LEVEL[subject]?.[level];
const objective = OBJECTIVES_BY_LEVEL[subject]?.[level];
if (!difficulty || !objective) {
  console.error(`Unknown level mapping for ${subject}/${level}`);
  process.exit(1);
}

const files = fs.readdirSync(levelDir).filter(f => /\.ya?ml$/.test(f)).sort();
let touched = 0;

for (const file of files) {
  const filePath = path.join(levelDir, file);
  const text = fs.readFileSync(filePath, 'utf8');
  if (/^difficulty:/m.test(text) || /^objectives:/m.test(text)) continue;

  const metaBlock = `difficulty: ${difficulty}\nobjectives: [${objective}]\nauthorNotes: Conjunto de ${subject}/${level}.\n`;
  // Insert after the subject: line (canonical header for these sets).
  const next = text.replace(/(^subject:.*\n)/m, `$1${metaBlock}`);
  if (next === text) continue;
  touched++;
  if (apply) fs.writeFileSync(filePath, next);
  console.log(`${apply ? 'updated' : 'would update'} ${path.relative(process.cwd(), filePath)}`);
}

console.log(`\n${apply ? 'Updated' : 'Would update'} ${touched} file(s).`);
if (!apply) console.log('Pass --apply to write changes.');
