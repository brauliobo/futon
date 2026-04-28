#!/usr/bin/env node
// Aligns each set's `objectives:` declaration with the union of objectives
// actually tagged on its exercises. Removes orphans (declared but unused),
// adds rogues (used but not declared). Dry-run unless --apply.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');

const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let changed = 0;
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    const declared = s.objectives || [];
    const used = new Set();
    for (const p of s.pages || []) for (const e of p.exercises || []) for (const o of (e.objectives || [])) used.add(o);
    const next = [...used].sort();
    if (eq([...declared].sort(), next)) continue;
    if (!next.length) continue;
    s.objectives = next;
    changed++;
    console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), '→', JSON.stringify(next));
    if (APPLY) writeFileSync(f, YAML.stringify(s, { lineWidth: 0 }));
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${changed} change(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
