#!/usr/bin/env node
// Normalizes math/6A counting rationales. Many symbol-counting exercises
// share the generic rationale "Conte seguindo a sequência." — less teaching
// than the count-specific form ("Conte apontando: 1, 2." or "Conte um a um,
// sem pular: total N").
//
// Each exercise is "<symbol>×N → N". Generate a count-specific rationale
// matching the pre-existing shape authors used for other counts.
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const GENERIC = 'Conte seguindo a sequência.';

export function rationaleFor(n) {
  if (n === 1) return 'Um único símbolo.';
  if (n === 2) return 'Conte apontando: 1, 2.';
  if (n === 3) return 'Conte apontando: 1, 2, 3.';
  // 4+: use the "um a um" form
  return `Conte um a um, sem pular: total ${n}.`;
}

async function main() {
  const files = await fg('src/levels/math/{6A,7A}/set_*.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        if (String(e.rationale || '').trim() !== GENERIC) continue;
        const n = Number(e.correctAnswer);
        if (!Number.isFinite(n) || n < 1) continue;
        const newR = rationaleFor(n);
        if (newR === GENERIC) continue;
        const qEsc = rx(String(e.question));
        const blockRe = new RegExp(
          `(question:\\s*(?:"${qEsc}"|'${qEsc}'|${qEsc})[ \\t]*\\r?\\n[\\s\\S]*?rationale:\\s*)("[^"\\n]*"|'[^'\\n]*'|[^\\n]*)`,
          'g',
        );
        let hit = false;
        raw = raw.replace(blockRe, (m, prefix) => { hit = true; return `${prefix}"${newR}"`; });
        if (hit) changed++;
      }
    }
    if (changed) {
      total += changed;
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `- ${changed} rewritten`);
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${total} rewrite(s).`);
  if (!APPLY && total) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
