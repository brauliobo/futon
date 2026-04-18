#!/usr/bin/env node
// Arithmetic answer-correctness sanity check. Parses pure numeric-operation
// questions (e.g. "5 + 3 =", "23 - 7 =", "6 × 4 =", "12 ÷ 3 =") and verifies
// that the authored correctAnswer matches the computation.
//
// Deliberately strict: skips anything with ? _ letters or fractions (where
// the numeric field has non-arithmetic semantics). So this catches only
// typos in pure-arithmetic drill sets.
//
// Exit code 0 on clean, 1 on any mismatch.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m';
const c = (t, col) => `${col}${t}${RESET}`;

const OP_RE = /^(-?\d+)\s*([+\-×÷*\/])\s*(-?\d+)\s*=$/;

function compute(x, op, y) {
  if (op === '+') return x + y;
  if (op === '-') return x - y;
  if (op === '×' || op === '*') return x * y;
  if ((op === '÷' || op === '/') && y !== 0) return x / y;
  return null;
}

async function main() {
  const files = await fg('src/levels/math/**/set_*.yaml');
  let checked = 0;
  const mismatches = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const q = String(e.question || '').trim();
        // Skip if question has unknowns, variables, or fraction form
        if (/[?_a-zA-Z]/.test(q.replace(/=/, ''))) continue;
        const m = q.match(OP_RE);
        if (!m) continue;
        const a = Number(e.correctAnswer);
        if (!Number.isFinite(a)) continue;
        const computed = compute(Number(m[1]), m[2], Number(m[3]));
        if (computed == null) continue;
        checked++;
        if (Math.abs(computed - a) > 0.001) {
          mismatches.push({ file: f.replace('src/levels/', ''), q, authored: a, computed });
        }
      }
    }
  }

  console.log(c('\n🧮 ARITHMETIC CORRECTNESS CHECK', BOLD));
  console.log(`  ${checked} pure arithmetic exercises verified.\n`);
  if (!mismatches.length) {
    console.log(c('✅ All authored answers match computation.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${mismatches.length} mismatches:`, RED));
  for (const m of mismatches.slice(0, 30)) {
    console.log(`  ${c(m.file, BOLD)}  ${m.q}  authored=${c(m.authored, RED)} · computed=${c(m.computed, GREEN)}`);
  }
  if (mismatches.length > 30) console.log(`  … and ${mismatches.length - 30} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
