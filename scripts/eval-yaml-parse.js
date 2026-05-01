#!/usr/bin/env node
// Fail loudly when any set YAML doesn't parse. Existing validate-sets.js
// records parse errors but they roll up as "0 pages, 0 exercises" — easy to
// miss visually. This eval exits non-zero with a clean per-file report so
// CI / eval:gates catches silent regressions.
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

const SUBJECTS = ['math', 'portuguese', 'english', 'japanese', 'spanish', 'biology'];
const root = path.resolve(process.cwd(), 'src/levels');

const failures = [];
for (const subject of SUBJECTS) {
  const subjectDir = path.join(root, subject);
  if (!fs.existsSync(subjectDir)) continue;
  for (const level of fs.readdirSync(subjectDir)) {
    const levelDir = path.join(subjectDir, level);
    if (!fs.statSync(levelDir).isDirectory()) continue;
    for (const file of fs.readdirSync(levelDir).filter(f => /\.ya?ml$/.test(f))) {
      const fp = path.join(levelDir, file);
      try { parse(fs.readFileSync(fp, 'utf8')); }
      catch (e) { failures.push({ fp, msg: e.message.split('\n')[0] }); }
    }
  }
}

if (failures.length === 0) {
  console.log(`✅ All set YAML files parse cleanly`);
  process.exit(0);
}

console.log(`❌ ${failures.length} YAML parse failure(s):`);
for (const { fp, msg } of failures) console.log(`  ${path.relative(process.cwd(), fp)}: ${msg}`);
process.exit(1);
