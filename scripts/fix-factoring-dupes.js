#!/usr/bin/env node
// Disambiguates intra-page factoring-order duplicates in math/J where the
// same polynomial appears twice with commutative-swap factorings
// (e.g. "(2x+2)(1x-5)" vs "(1x-5)(2x+2)"). Appends a clarifier to one of
// them based on which factor leads.
//
// Appends "(fator com maior coef. 1º)" or "(fator com menor coef. 1º)"
// based on the leading-coefficient order in the answer.
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Extract the first factor, e.g. "(4x + -1)(..)" → "(4x + -1)".
function firstFactor(answer) {
  const m = String(answer).match(/^\([^)]+\)/);
  return m ? m[0] : null;
}

function clarifierFor(a, b) {
  const aF = firstFactor(a);
  const bF = firstFactor(b);
  if (!aF || !bF || aF === bF) return null;
  return {
    [a]: `começa com ${aF}`,
    [b]: `começa com ${bF}`,
  };
}

async function main() {
  const files = await fg('src/levels/math/J/set_*.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;

    for (const p of s.pages || []) {
      const byQ = new Map();
      for (const e of p.exercises || []) {
        const k = String(e.question);
        if (!byQ.has(k)) byQ.set(k, []);
        byQ.get(k).push(e);
      }
      for (const [q, exs] of byQ) {
        if (exs.length !== 2) continue;
        const [a, b] = exs.map(e => String(e.correctAnswer));
        if (a === b) continue;
        const map = clarifierFor(a, b);
        if (!map) continue;
        for (const e of exs) {
          const clar = map[String(e.correctAnswer)];
          if (!clar) continue;
          const newQ = `${q} (${clar})`;
          const qEsc = rx(q);
          const aEsc = rx(String(e.correctAnswer));
          const re = new RegExp(
            `(question:\\s*)(?:"${qEsc}"|'${qEsc}'|${qEsc})([ \\t]*\\r?\\n\\s+correctAnswer:\\s*(?:"${aEsc}"|'${aEsc}'|${aEsc})(?=\\r?\\n))`,
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
