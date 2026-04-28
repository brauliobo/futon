#!/usr/bin/env node
// Aligns set-level `target:` to the actual exercise count when they
// disagree. The audit reports a hard error when target ≠ actual.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let changed = 0;
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    if (typeof s.target !== 'number') continue;
    const actual = (s.pages || []).reduce((n, p) => n + (p.exercises || []).length, 0);
    if (actual === s.target) continue;
    const newRaw = raw.replace(/^target:\s*\d+\s*$/m, `target: ${actual}`);
    if (newRaw === raw) continue;
    changed++;
    console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `· ${s.target} → ${actual}`);
    if (APPLY) writeFileSync(f, newRaw);
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${changed} change(s).`);
  if (!APPLY && changed) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
