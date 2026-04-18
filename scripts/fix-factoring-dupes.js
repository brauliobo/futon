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

  // First pass: gather every (question → Map<answer, files+exercises>) across
  // the WHOLE math/J level. Any question with >1 distinct factored form is a
  // cross-set ambiguity, not just intra-page.
  const globalQ = new Map();
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const q = String(e.question);
        if (!globalQ.has(q)) globalQ.set(q, new Set());
        globalQ.get(q).add(String(e.correctAnswer));
      }
    }
  }

  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;

    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const q = String(e.question);
        const ambig = globalQ.get(q);
        if (!ambig || ambig.size < 2) continue;
        // Derive a clarifier by comparing this answer's first factor against
        // any other known answer for the same question.
        const otherAns = [...ambig].find(a => a !== String(e.correctAnswer));
        if (!otherAns) continue;
        const map = clarifierFor(String(e.correctAnswer), otherAns);
        if (!map) continue;
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
