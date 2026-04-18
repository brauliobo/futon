#!/usr/bin/env node
// Auto-fixes math set examples flagged by eval:example-alignment — appends a
// second worked example to show the missing operator, sourced from the first
// exercise in the set that uses that operator.
//
// Dry-run by default. Pass --apply to write files.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const NUMERIC_OP = /(?<=\d\s?)[+\-×÷](?=\s?\d)/g;

async function main() {
  const files = await fg('src/levels/math/**/set_*.yaml');
  let fixed = 0;
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    const ex = String(s.example || '');
    const exOps = new Set(ex.match(NUMERIC_OP) || []);
    if (!exOps.size) continue;
    const qOps = new Set();
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        for (const op of (String(e.question || '').match(NUMERIC_OP) || [])) qOps.add(op);
      }
    }
    const missing = [...qOps].filter(o => !exOps.has(o));
    if (!missing.length) continue;

    // Find one exercise per missing op to borrow
    const samples = {};
    for (const op of missing) {
      const opRe = new RegExp(`(?<=\\d\\s?)\\${op}(?=\\s?\\d)`);
      for (const p of s.pages || []) {
        for (const e of p.exercises || []) {
          const q = String(e.question || '');
          if (opRe.test(q) && e.correctAnswer != null) {
            samples[op] = { q: q.replace(/\s*=\s*$/, '').trim(), a: e.correctAnswer };
            break;
          }
        }
        if (samples[op]) break;
      }
    }

    const addendum = Object.entries(samples)
      .map(([, v]) => `${v.q} = → ${v.a}`)
      .join('; ');
    if (!addendum) continue;
    const newExample = ex.replace(/\.?\s*$/, '') + `; ${addendum}.`;
    if (newExample === ex) continue;

    // Preserve formatting by running a narrow string replace on the raw YAML.
    // The example is always a single-line scalar. Match the most common shapes:
    //   example: "…"
    //   example: '…'
    //   example: …
    const escaped = ex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replacers = [
      new RegExp(`(example:\\s*")${escaped}(")`),
      new RegExp(`(example:\\s*')${escaped}(')`),
      new RegExp(`(example:\\s*)${escaped}($)`, 'm'),
    ];
    let newRaw = raw;
    let replaced = false;
    for (const r of replacers) {
      if (r.test(newRaw)) {
        newRaw = newRaw.replace(r, (m, a, b = '') => a + newExample + b);
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      console.log('  [skip]', f, '(could not locate example in raw YAML)');
      continue;
    }

    fixed++;
    console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''));
    console.log('         was:', ex.slice(0, 80));
    console.log('         now:', newExample.slice(0, 100));
    if (APPLY) writeFileSync(f, newRaw);
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${fixed} fix(es).`);
  if (!APPLY && fixed) console.log('Re-run with --apply to write changes.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
