#!/usr/bin/env node
// Fixes integral-rationale mismatches in math/O/set_10, set_13. The
// sec²(x) exercises were getting the power-rule rationale ∫xⁿ dx =
// xⁿ⁺¹/(n+1) + C, which doesn't apply — correct rule is
// ∫ sec²(x) dx = tan(x) + C.
//
// Also simplifies the exponential and trig rationales to include only
// the specific rule that applies (not both sen+cos or both eˣ+1/x).
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function rationaleFor(q) {
  // Extract leading coefficient if any: "3sen(x)", "-2e^{2x}"
  const coefM = q.match(/(-?\d*(?:\.\d+)?)\s*(sec²|sen|cos|tan|e\^|1\/x)/);
  const k = coefM && coefM[1] && coefM[1] !== '-' ? coefM[1] : '';
  if (/sec²\(x\)/.test(q)) {
    return `∫ sec²(x) dx = tan(x) + C${k ? ` (constante ${k} sai da integral)` : ''}.`;
  }
  if (/sen\(x\)/.test(q)) {
    return `∫ sen(x) dx = -cos(x) + C${k ? ` (constante ${k} sai da integral)` : ''}.`;
  }
  if (/cos\(x\)/.test(q)) {
    return `∫ cos(x) dx = sen(x) + C${k ? ` (constante ${k} sai da integral)` : ''}.`;
  }
  // e^{2x} needs u-sub (divide by inner-derivative)
  const eM = q.match(/e\^\{?(-?\d+(?:\.\d+)?)x\}?/);
  if (eM) {
    const inner = Number(eM[1]);
    if (inner === 1) return `Integral: ∫ eˣ dx = eˣ + C${k ? ` (constante ${k} sai da integral)` : ''}.`;
    return `Integral com u-sub (u=${inner}x): ∫ e^(${inner}x) dx = (1/${inner})·e^(${inner}x) + C${k ? ` (constante ${k} sai da integral)` : ''}.`;
  }
  if (/e\^x/.test(q)) {
    return `∫ eˣ dx = eˣ + C${k ? ` (constante ${k} sai da integral)` : ''}.`;
  }
  if (/1\/x/.test(q)) {
    return `∫ (1/x) dx = ln|x| + C${k ? ` (constante ${k} sai da integral)` : ''}.`;
  }
  return null;
}

async function main() {
  const files = await fg('src/levels/math/O/set_{10,13}.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const q = String(e.question || '').trim();
        const newR = rationaleFor(q);
        if (!newR) continue;
        if (e.rationale === newR) continue;
        const qEsc = rx(q);
        const blockRe = new RegExp(
          `(question:\\s*(?:"${qEsc}"|'${qEsc}'|${qEsc})[\\s\\S]*?rationale:\\s*)("[^"\\n]*"|'[^'\\n]*'|[^\\n]*)`,
        );
        if (blockRe.test(raw)) {
          raw = raw.replace(blockRe, (_, prefix) => `${prefix}"${newR}"`);
          changed++;
        }
      }
    }
    if (changed) {
      total += changed;
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `- ${changed} rationales rewritten`);
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${total} rewrite(s).`);
  if (!APPLY && total) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
