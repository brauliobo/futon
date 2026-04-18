#!/usr/bin/env node
// Corrects `inputType: number` on sets whose answers are not all numeric.
// The app forces a decimal mobile keyboard for "number" regardless of the
// individual exercise, so fraction/algebraic/word answers get the wrong
// input affordance. Changing the field to "text" (or removing it for
// sets with mixed types) lets the app pick per-exercise.
//
// Rules:
//   - all answers purely numeric  → keep `number` (or add if missing)
//   - majority (>70%) numeric      → keep `number`
//   - otherwise                    → change to `text`
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');

function isPureNumeric(a) {
  const s = String(a ?? '').trim();
  return /^-?\d+(?:\.\d+)?$/.test(s);
}

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let changed = 0;
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    if (s.inputType !== 'number') continue;
    const answers = (s.pages || []).flatMap(p => (p.exercises || []).map(e => e.correctAnswer));
    const numericPct = answers.filter(isPureNumeric).length / Math.max(1, answers.length);
    if (numericPct >= 0.7) continue;
    // Change inputType to "text"
    const newRaw = raw.replace(/^inputType:\s*number\s*$/m, 'inputType: text');
    if (newRaw === raw) continue;
    changed++;
    console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `· ${Math.round(numericPct*100)}% numeric → text`);
    if (APPLY) writeFileSync(f, newRaw);
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${changed} change(s).`);
  if (!APPLY && changed) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
