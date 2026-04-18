#!/usr/bin/env node
// math/5A/set_03 counting exercises use strategy-focused rationales
// ("Marque cada elemento", "Aponte e conte em voz alta", etc.) but omit
// the count, so students don't see the target number confirmed. Append
// ": total N." to each, preserving the strategy but tying it to the
// specific answer.
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const STRATEGIES = new Set([
  'Marque cada elemento para não repetir.',
  'Aponte e conte em voz alta.',
  'Conte cada símbolo uma vez, seguindo a ordem.',
  'Conte a partir do 1 sem pular.',
  'Verifique contando de novo.',
  'Agrupe de 2 em 2 e some os pares.',
]);

export function appendCount(rationale, n) {
  if (!Number.isFinite(n) || n < 1) return null;
  const trimmed = rationale.replace(/\.$/, '');
  return `${trimmed}: total ${n}.`;
}

async function main() {
  const files = await fg('src/levels/math/5A/set_03.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    let changed = 0;
    // Match any exercise block: capture correctAnswer and the strategy
    // rationale in order. Preserves per-exercise strategy variety —
    // just appends ": total N." to whichever strategy each block has.
    const blockRe = /correctAnswer:\s*(-?\d+)\s*\r?\n([\s\S]*?)rationale:\s*"([^"\n]+)"/g;
    raw = raw.replace(blockRe, (m, ansStr, middle, ratStr) => {
      if (!STRATEGIES.has(ratStr)) return m;
      const n = Number(ansStr);
      if (!Number.isFinite(n) || n < 1) return m;
      changed++;
      return `correctAnswer: ${ansStr}\n${middle}rationale: "${appendCount(ratStr, n)}"`;
    });
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
