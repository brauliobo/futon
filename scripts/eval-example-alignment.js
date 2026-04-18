#!/usr/bin/env node
// Example-to-exercise alignment check. A worked example should demonstrate
// EVERY operation the student will encounter. If a mixed-operations set has
// exercises with both + and − but the example only shows +, students meet
// subtraction without a model.
//
// Checks numerically-anchored operators (digit op digit) so we don't flag
// hyphens in words. Reports per-set: operators used in exercises that don't
// appear in the example.
//
// Exit code 0 on clean, 1 when any set has missing operators.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m';
const c = (t, col) => `${col}${t}${RESET}`;

// Matches +/−/×/÷ only when flanked by digits on both sides, so hyphens
// in words ("T-shirt") or negative signs ("-5") aren't counted as operators.
const NUMERIC_OP = /(?<=\d\s?)[+\-×÷](?=\s?\d)/g;

async function main() {
  const files = await fg('src/levels/math/**/set_*.yaml');
  const issues = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const ex = String(s.example || '');
    const exOps = new Set(ex.match(NUMERIC_OP) || []);
    const qOps = new Set();
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        for (const op of (String(e.question || '').match(NUMERIC_OP) || [])) qOps.add(op);
      }
    }
    const missing = [...qOps].filter(o => !exOps.has(o));
    if (missing.length && exOps.size) {
      issues.push({
        file: f.replace('src/levels/', ''),
        example: ex.slice(0, 70),
        exOps: [...exOps].sort(),
        qOps: [...qOps].sort(),
        missing,
      });
    }
  }

  console.log(c('\n🎯 EXAMPLE-EXERCISE OPERATOR ALIGNMENT', BOLD));
  console.log(`  Scanned ${files.length} math sets.\n`);
  if (!issues.length) {
    console.log(c('✅ Every example demonstrates all operators used in its exercises.', GREEN));
    process.exit(0);
  }
  console.log(c(`⚠️  ${issues.length} set(s) have exercises using operators the example omits:\n`, YELLOW));
  for (const i of issues.slice(0, 40)) {
    console.log(`  ${c(i.file, BOLD)}`);
    console.log(`    example shows: ${i.exOps.join(' ')} · exercises use: ${i.qOps.join(' ')} · ${c('missing: ' + i.missing.join(' '), RED)}`);
    console.log(c(`    "${i.example}"`, '\x1b[90m'));
  }
  if (issues.length > 40) console.log(c(`  … and ${issues.length - 40} more`, '\x1b[90m'));
  console.log('\n' + '─'.repeat(60));
  console.log(c(`Recommended fix: extend the example to show the missing operator(s).`, YELLOW));
  console.log(c(`  e.g. "Ex.: 4 + 4 = → 8; 6 − 2 = → 4" for mixed-ops sets.`, '\x1b[90m'));
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
