#!/usr/bin/env node
// Specializes the generic "Potência — aⁿ = a·a·…·a (n fatores)." and similar
// universal-rule rationales in math/I/set_04, set_08 into per-exercise ones.
//
// Patterns handled:
//   N^K        → "N^K = N·N·...·N (K fatores) = result."
//   x^K = M    → "K-ésima raiz de M é x. Verifique: x·x·...·x = M."
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function ordinalRoot(k) {
  if (k === 2) return 'quadrada';
  if (k === 3) return 'cúbica';
  return `${k}-ésima`;
}

export function rationaleFor(q, a) {
  let m;
  // N^K
  if ((m = q.match(/^(-?\d+)\^(-?\d+)$/))) {
    const n = Number(m[1]), k = Number(m[2]);
    if (k === 1) return `Potência de expoente 1: ${n}^1 = ${n}.`;
    if (k === 0) return `Toda potência de expoente 0 é 1: ${n}^0 = 1.`;
    if (k >= 2 && k <= 5) {
      const factors = Array(k).fill(n).join('·');
      return `${n}^${k} = ${factors} = ${a}.`;
    }
    return `${n}^${k} = ${n} multiplicado ${k} vezes por si mesmo = ${a}.`;
  }
  // x^K = M
  if ((m = q.match(/^x\^(-?\d+)\s*=\s*(-?\d+)$/))) {
    const k = Number(m[1]);
    const M = Number(m[2]);
    const verify = (k >= 2 && k <= 4) ? ` Verifique: ${Array(k).fill(a).join('·')} = ${M}.` : '';
    return `Raiz ${ordinalRoot(k)} de ${M} é ${a}.${verify}`;
  }
  return null;
}

async function main() {
  const files = await fg('src/levels/math/I/set_{04,08}.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const q = String(e.question || '').trim();
        const a = String(e.correctAnswer ?? '').trim();
        const newR = rationaleFor(q, a);
        if (!newR || e.rationale === newR) continue;
        const qEsc = rx(q);
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
