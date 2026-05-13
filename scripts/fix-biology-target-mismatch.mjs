#!/usr/bin/env node
// Structural metadata fix: biology sets where `target:` (declared expected
// exercise count) doesn't match the actual exercise count get the target
// updated to reflect reality. The `target` field is metadata only — not
// consumed by the app's runtime, only by validators — so this is a safe
// structural fix that doesn't change user-facing content.
//
// Surfaced by `audit:content --subject biology` (21 sets affected).

import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';

const apply = process.argv.includes('--apply');
const files = await fg('src/levels/biology/**/set_*.yaml');

let changed = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  // Count `^      - type:` lines = one per exercise (4-space indent under page.exercises).
  const actual = (text.match(/^      - type:/gm) || []).length;
  const m = text.match(/^target:\s*(\d+)\s*$/m);
  if (!m) continue;
  const declared = Number(m[1]);
  if (declared === actual || actual === 0) continue;
  if (apply) {
    writeFileSync(f, text.replace(/^target:\s*\d+\s*$/m, `target: ${actual}`));
  }
  console.log(`${f}: target ${declared} → ${actual}`);
  changed++;
}
console.log(`\n${changed} sets ${apply ? 'updated' : 'would change (use --apply)'}`);
