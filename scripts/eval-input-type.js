#!/usr/bin/env node
// inputType-mismatch detector. Flags sets declaring inputType=number whose
// answers are mostly non-numeric. The app forces a decimal mobile
// keyboard for "number" regardless of the individual exercise, so
// students typing letters/operators/expressions get the wrong keyboard.
//
// Threshold: flag when >30% of answers are non-numeric.
//
// Exit 0 clean, 1 when any set crosses the threshold.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { asText } from './lib/i18n.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const bad = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    if (s.inputType !== 'number') continue;
    const answers = (s.pages || []).flatMap(p => (p.exercises || []).map(e => asText(e.correctAnswer)));
    if (!answers.length) continue;
    const nonNumeric = answers.filter(a => !NUMERIC_RE.test(a.trim())).length;
    const pct = nonNumeric / answers.length;
    if (pct > 0.3) {
      bad.push({ file: f.replace('src/levels/', ''), total: answers.length, nonNumeric, pct });
    }
  }

  console.log(c('\n⌨️  INPUT-TYPE MISMATCH CHECK', BOLD));
  if (!bad.length) {
    console.log(c('✅ Every inputType=number set has ≥70% numeric answers.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${bad.length} set(s) with wrong inputType:`, RED));
  for (const b of bad.slice(0, 30)) {
    console.log(`  ${c(b.file, BOLD)}  ${Math.round(b.pct * 100)}% non-numeric (${b.nonNumeric}/${b.total})`);
  }
  if (bad.length > 30) console.log(c(`  … and ${bad.length - 30} more`, GRAY));
  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix: change to `inputType: text` (see scripts/fix-input-type.js).', RED));
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
