#!/usr/bin/env node
// Emit an empty YAML skeleton for hand-authoring a new set.
// Usage: node scripts/scaffold-set.mjs <subject> <level> <setNumber> [--pages N]
// Example: node scripts/scaffold-set.mjs english G 01 --pages 5

import fs from 'fs';
import path from 'path';

const [, , subject, level, setNumber, ...rest] = process.argv;

if (!subject || !level || !setNumber) {
  console.error('Usage: scaffold-set.mjs <subject> <level> <setNumber> [--pages N]');
  process.exit(1);
}
if (!['math', 'portuguese', 'english'].includes(subject)) {
  console.error(`Unknown subject: ${subject}`);
  process.exit(1);
}

const pagesArg = rest.indexOf('--pages');
const pageCount = pagesArg >= 0 ? parseInt(rest[pagesArg + 1], 10) : (subject === 'math' ? 10 : 5);
const padded = String(setNumber).padStart(2, '0');
const dir = path.join(process.cwd(), 'src', 'levels', subject, level);
const file = path.join(dir, `set_${padded}.yaml`);

if (fs.existsSync(file)) {
  console.error(`Refusing to overwrite ${file}`);
  process.exit(1);
}

fs.mkdirSync(dir, { recursive: true });

const pages = Array.from({ length: pageCount }, (_, i) => `  - pageNumber: ${i + 1}
    title: ""
    description: ""
    exercises:
      - type: ""
        question: ""
        correctAnswer: ""
        difficulty: 1
        rationale: ""
        objectives: []`).join('\n');

const content = `title: ""
level: ${level}
subject: ${subject}
difficulty: 1
objectives: []
authorNotes: ""
example: ""
pages:
${pages}
target: ${pageCount * 10}
`;

fs.writeFileSync(file, content);
console.log(`Created ${file}`);
