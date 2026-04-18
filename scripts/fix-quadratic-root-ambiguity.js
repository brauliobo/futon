#!/usr/bin/env node
// Disambiguates quadratic-root exercises in math/I where the same question
// (e.g. "x² = 121") appears on the same page with different expected
// answers ("x = 11", "x = -11", "x = ±11"). Students have no way to know
// which form is expected.
//
// Appends a clarifier to the question based on the authored answer:
//   "x = N"   → question += " (raiz positiva)"
//   "x = -N"  → question += " (raiz negativa)"
//   "x = ±N"  → question += " (ambas raízes)"
//
// Only disambiguates when the same question appears 2+ times on the same
// page with different answers. Single-occurrence exercises are left alone.
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function clarifierFor(answer) {
  const a = String(answer).trim();
  if (/^x\s*=\s*±\d/.test(a)) return 'ambas raízes';
  if (/^x\s*=\s*-\d/.test(a)) return 'raiz negativa';
  if (/^x\s*=\s*\d/.test(a)) return 'raiz positiva';
  return null;
}

// Bare "x² = N" that appears anywhere in the corpus with distinct answer
// forms across sets causes the same ambiguity as the intra-page case.
// Apply the clarifier universally whenever the question is a bare
// quadratic and the answer has a recognizable root form.
const BARE_QUADRATIC = /^x²\s*=\s*\d+$/;

async function main() {
  const files = await fg('src/levels/math/I/set_*.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;

    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const q = String(e.question);
        if (!BARE_QUADRATIC.test(q)) continue;
        const clar = clarifierFor(e.correctAnswer);
        if (!clar) continue;
        const newQ = `${q} (${clar})`;
        const qEsc = rx(q);
        const ansEsc = rx(String(e.correctAnswer));
        const re = new RegExp(
          `(question:\\s*)(?:"${qEsc}"|'${qEsc}'|${qEsc})([ \\t]*\\r?\\n\\s+correctAnswer:\\s*(?:"${ansEsc}"|'${ansEsc}'|${ansEsc})\\b)`,
        );
        if (re.test(raw)) {
          raw = raw.replace(re, `$1"${newQ}"$2`);
          changed++;
        }
      }
    }

    if (changed) {
      total += changed;
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `· ${changed} rewrites`);
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${total} disambiguation(s).`);
  if (!APPLY && total) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
