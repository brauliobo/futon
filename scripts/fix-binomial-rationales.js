#!/usr/bin/env node
// Fixes math/J/set_07, 08, 09 — "Álgebra Avançada" binomial-expansion sets
// where 100% of exercises have one of two wrong rationales (a difference-of-
// squares rule that only applies to b=-a, or a Bhaskara rule for SOLVING
// quadratics rather than EXPANDING binomials).
//
// Generates per-exercise rationales using the actual operand pair:
//   (x + a)(x + b) → Soma a+b = S, produto a·b = P → x² + S·x + P.
//
// Dry-run by default; --apply writes files.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const BINOMIAL_Q = /^\(x \+ (-?\d+)\)\(x \+ (-?\d+)\)$/;

export function rationaleFor(a, b) {
  const sum = a + b;
  const prod = a * b;
  // Sum and product are the defining pair for factoring; this is the exact
  // teaching students need for expand-and-reverse drills.
  return `Soma: ${a}+${b}=${sum}; produto: ${a}·${b}=${prod}. Logo x² + ${sum}x + ${prod}.`;
}

// Escape a string for use in a regex.
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  const files = await fg('src/levels/math/J/set_{07,08,09}.yaml');
  let fixed = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const m = String(e.question || '').match(BINOMIAL_Q);
        if (!m) continue;
        const a = Number(m[1]), b = Number(m[2]);
        const newR = rationaleFor(a, b);
        if (e.rationale === newR) continue;
        // Narrow replace: match the block starting with this question and
        // replace the first rationale: line within it. Preserves everything
        // else (indentation, order, other fields).
        const qLine = `question: ${e.question}`;
        const blockRe = new RegExp(
          `(${rx(qLine)}[\\s\\S]*?rationale:\\s*)("[^"\\n]*"|'[^'\\n]*'|[^\\n]*)`,
        );
        if (blockRe.test(raw)) {
          raw = raw.replace(blockRe, (_, a1) => `${a1}"${newR}"`);
          changed++;
        }
      }
    }
    if (changed) {
      fixed += changed;
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `- ${changed} rationale(s) rewritten`);
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${fixed} total rewrite(s).`);
  if (!APPLY && fixed) console.log('Re-run with --apply to write changes.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
