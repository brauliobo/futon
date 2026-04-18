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

async function main() {
  const files = await fg('src/levels/math/I/set_*.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;

    for (const p of s.pages || []) {
      // Find questions with ≥2 occurrences and different answers
      const byQ = new Map();
      for (const e of p.exercises || []) {
        const q = String(e.question);
        if (!byQ.has(q)) byQ.set(q, []);
        byQ.get(q).push(e);
      }
      for (const [q, exs] of byQ) {
        if (exs.length < 2) continue;
        const answers = new Set(exs.map(e => String(e.correctAnswer)));
        if (answers.size < 2) continue;
        // Disambiguate by appending clarifier to each occurrence's question
        for (const e of exs) {
          const clar = clarifierFor(e.correctAnswer);
          if (!clar) continue;
          const newQ = `${q} (${clar})`;
          const qEsc = rx(q);
          const ansEsc = rx(String(e.correctAnswer));
          // Match the specific question+answer pair to avoid touching other
          // exercises with different answers for the same question.
          const re = new RegExp(
            `(question:\\s*)(?:"${qEsc}"|'${qEsc}'|${qEsc})([ \\t]*\\r?\\n\\s+correctAnswer:\\s*(?:"${ansEsc}"|'${ansEsc}'|${ansEsc})\\b)`,
          );
          if (re.test(raw)) {
            raw = raw.replace(re, `$1"${newQ}"$2`);
            changed++;
          }
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
