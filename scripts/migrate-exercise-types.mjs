#!/usr/bin/env node
// Rename legacy exercise `type` values to canonical names.
// Usage: node scripts/migrate-exercise-types.mjs [--apply] [--subject math|portuguese|english]
// Default is dry-run; pass --apply to write changes.

import fs from 'fs';
import path from 'path';

const RENAME = {
  english_vocab: 'translation',
  english_phrases: 'translation',
  reading: 'reading_comprehension',
  // Math drill types remain distinct; only collapse exact synonyms.
  fraction_sub: 'fraction_subtract',
};

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const subjectFilter = args.includes('--subject') ? args[args.indexOf('--subject') + 1] : null;
const SUBJECTS = ['math', 'portuguese', 'english'].filter(s => !subjectFilter || s === subjectFilter);

let filesTouched = 0, replacements = 0;

for (const subject of SUBJECTS) {
  const subjectDir = path.join(process.cwd(), 'src', 'levels', subject);
  if (!fs.existsSync(subjectDir)) continue;
  for (const level of fs.readdirSync(subjectDir)) {
    const levelDir = path.join(subjectDir, level);
    if (!fs.statSync(levelDir).isDirectory()) continue;
    for (const f of fs.readdirSync(levelDir).filter(f => /\.ya?ml$/.test(f))) {
      const filePath = path.join(levelDir, f);
      const original = fs.readFileSync(filePath, 'utf8');
      let next = original;
      for (const [from, to] of Object.entries(RENAME)) {
        next = next.replace(new RegExp(`type:\\s*${from}\\b`, 'g'), `type: ${to}`);
      }
      if (next !== original) {
        const delta = (next.match(/type:/g) || []).length - (original.match(/type:/g) || []).length;
        replacements += Math.abs((original.match(new RegExp(`type:\\s*(${Object.keys(RENAME).join('|')})\\b`, 'g')) || []).length);
        filesTouched++;
        if (apply) fs.writeFileSync(filePath, next);
        console.log(`${apply ? 'updated' : 'would update'} ${path.relative(process.cwd(), filePath)}`);
      }
    }
  }
}

console.log(`\n${apply ? 'Updated' : 'Would update'} ${filesTouched} file(s), ${replacements} type rename(s).`);
if (!apply) console.log('Pass --apply to write changes.');
