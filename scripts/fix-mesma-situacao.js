#!/usr/bin/env node
// Inlines "Mesma situação: X = ?" follow-ups by substituting the context
// from the prior exercise. Fixes same-page duplicates where two different
// "Mesma situação" questions reference two different prior contexts,
// making the questions look identical to students.
//
// Example:
//   Q: Se cos(x) = 3/5 (1º quadrante), sen(x/2) = ?  → √5/5
//   Q: Mesma situação: cos(x/2) = ?                  → 2√5/5   <-- ambiguous
//   Q: Se cos(x) = 7/25 (1º quadrante), sen(x/2) = ? → 3/5
//   Q: Mesma situação: cos(x/2) = ?                  → 4/5     <-- ambiguous
//
// Rewrites each "Mesma situação" into "Se <prior-context>, <operation>".
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Match "Se <context>, <something> = ?" — pull the context up to the comma.
const PRIOR_RE = /^(Se\s+[^,]+),\s*(.+?)\s*=\s*\?$/;

async function main() {
  const files = await fg('src/levels/math/M/set_*.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;

    for (const p of s.pages || []) {
      let lastContext = null;
      for (const e of p.exercises || []) {
        const q = String(e.question);
        const m = q.match(PRIOR_RE);
        if (m) {
          lastContext = m[1]; // "Se cos(x) = 3/5 (1º quadrante)"
          continue;
        }
        const follow = q.match(/^Mesma situação:\s*(.+?)\s*=\s*\?$/);
        if (!follow || !lastContext) continue;
        const op = follow[1]; // "cos(x/2)"
        const newQ = `${lastContext}, ${op} = ?`;
        if (q === newQ) continue;
        const qEsc = rx(q);
        const re = new RegExp(
          `(question:\\s*)(?:"${qEsc}"|'${qEsc}'|${qEsc})([ \\t]*\\r?\\n)`,
        );
        if (re.test(raw)) {
          raw = raw.replace(re, `$1"${newQ}"$2`);
          changed++;
        }
      }
    }

    if (changed) {
      total += changed;
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `· ${changed} inlined`);
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${total} inlining(s).`);
  if (!APPLY && total) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
