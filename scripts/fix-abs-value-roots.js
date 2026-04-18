#!/usr/bin/env node
// Disambiguate |x + N| = M equations. Each has two valid solutions; when
// the same question appears with both answers (within a page or across
// sets), append "(raiz menor)" or "(raiz maior)" to distinguish.
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ABS_Q = /^\|x\s*\+\s*-?\d+\|\s*=\s*\d+$/;

async function main() {
  const files = await fg('src/levels/math/**/set_*.yaml');
  // Gather all answers per bare absolute-value question across the corpus.
  const allAnswers = new Map();
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) for (const e of p.exercises || []) {
      const q = String(e.question);
      if (!ABS_Q.test(q)) continue;
      if (!allAnswers.has(q)) allAnswers.set(q, new Set());
      allAnswers.get(q).add(Number(e.correctAnswer));
    }
  }

  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;

    for (const p of s.pages || []) for (const e of p.exercises || []) {
      const q = String(e.question);
      if (!ABS_Q.test(q)) continue;
      const answers = allAnswers.get(q);
      if (!answers || answers.size < 2) continue;
      const a = Number(e.correctAnswer);
      const others = [...answers].filter(x => x !== a);
      if (!others.length) continue;
      const maxOther = Math.max(...others);
      const minOther = Math.min(...others);
      let clar;
      if (a < minOther) clar = 'raiz menor';
      else if (a > maxOther) clar = 'raiz maior';
      else continue;
      const newQ = `${q} (${clar})`;
      const qEsc = rx(q);
      const ansEsc = rx(String(e.correctAnswer));
      const re = new RegExp(
        `(question:\\s*)(?:"${qEsc}"|'${qEsc}'|${qEsc})([ \\t]*\\r?\\n\\s+correctAnswer:\\s*(?:"${ansEsc}"|'${ansEsc}'|${ansEsc})(?=\\r?\\n))`,
      );
      if (re.test(raw)) {
        raw = raw.replace(re, `$1"${newQ}"$2`);
        changed++;
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
