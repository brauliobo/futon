#!/usr/bin/env node
// Fix YAML parsing bugs where unquoted tuples like (3, 4) got split at the
// comma, making "4)" a separate key. Applies to math/Q/set_04 (vectors),
// set_07 (vectors), and any future similar case.
//
// Pattern:
//   correctAnswer: (3
//   4):
//   rationale: ...
//
// Replaces with:
//   correctAnswer: "(3, 4)"
//   rationale: ...
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const RE = /correctAnswer:\s*\(([^\n()]+?)\n(\s+)([^\n():]+)\):\n/g;

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const before = raw;
    raw = raw.replace(RE, (m, first, indent, second) => {
      total++;
      return `correctAnswer: "(${first.trim()}, ${second.trim()})"\n`;
    });
    if (raw !== before) {
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''));
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${total} fix(es).`);
  if (!APPLY && total) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
