#!/usr/bin/env node
// Flags rationales that *conclude* with an arithmetic `= N` whose value
// disagrees with the authored correctAnswer. Strict: only matches when the
// rationale's trailing tokens are literally `… = N.` (or `… ≈ N`), so the
// rationale is asserting N as its computed conclusion.
//
// Skips:
//   - non-numeric correctAnswers (text choices, fractions handled below)
//   - rationales whose final token isn't a pure number
//   - cases where N matches correctAnswer (within tolerance)
//   - sign-flipped magnitudes (rationale states |answer|, sign described in prose)

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', DIM = '\x1b[2m';
const c = (t, col) => `${col}${t}${RESET}`;

function flatten(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(flatten).join(' ');
  if (typeof v === 'object') {
    if ('pt' in v || 'en' in v) return [v.pt, v.en].filter(Boolean).map(flatten).join(' ');
    return Object.values(v).map(flatten).join(' ');
  }
  return String(v);
}

function parseFraction(s) {
  if (typeof s === 'number') return s;
  const str = String(s).trim();
  if (/^-?\d+(?:\.\d+)?$/.test(str)) return Number(str);
  const f = str.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (f) return Number(f[1]) / Number(f[2]);
  return null;
}

// Matches the trailing 'op N.' at the very end of the rationale, allowing
// closing parens/quotes but no further alphanumeric content.
const TAIL_RE = /[=≈]\s*(-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)(?:[.)\s"'’”»]+)?$/;

async function main() {
  // All subjects with potentially numeric answers — math, biology, physics, etc.
  const files = await fg('src/levels/**/set_*.yaml');
  let checked = 0;
  const mismatches = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const ansN = parseFraction(e.correctAnswer);
        if (ansN == null) continue;
        const r = flatten(e.rationale).trim();
        if (!r) continue;
        const m = r.match(TAIL_RE);
        if (!m) continue;
        // Reject when the match is inside an unclosed parenthetical — those
        // are pedagogical hints like '… (3+7=10).' not the rationale's conclusion.
        const before = r.slice(0, m.index);
        const opens = (before.match(/\(/g) || []).length;
        const closes = (before.match(/\)/g) || []).length;
        if (opens > closes) continue;
        const tail = m[1].trim();
        const tailN = parseFraction(tail);
        if (tailN == null) continue;
        // Accept if the rationale has ANY '= N' (not in parens) matching answer.
        // Soma dos dígitos / verification hints often append after the conclusion.
        const allEqs = [...r.matchAll(/[=≈]\s*(-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)/g)];
        const anyMatch = allEqs.some(am => {
          const op = (r.slice(0, am.index).match(/\(/g) || []).length;
          const cl = (r.slice(0, am.index).match(/\)/g) || []).length;
          if (op > cl) return false; // skip in-paren
          const v = parseFraction(am[1].trim());
          return v != null && (Math.abs(v - ansN) < 0.05 || Math.abs(v + ansN) < 0.05);
        });
        if (anyMatch) { checked++; continue; }
        // Accept if answer appears as a bare number in the rationale.
        const ansLiteral = String(e.correctAnswer).trim();
        const bareRe = new RegExp(`(?<![\\w.])-?${ansN.toString().replace('.', '\\.')}(?!\\d|\\.\\d)`);
        if (bareRe.test(r) || r.includes(ansLiteral)) { checked++; continue; }
        // Allow exact, near-exact, and sign-flipped agreement (final tail).
        if (Math.abs(tailN - ansN) < 0.05) { checked++; continue; }
        if (Math.abs(tailN + ansN) < 0.05) { checked++; continue; }
        checked++;
        mismatches.push({
          file: f.replace('src/levels/', ''),
          page: p.pageNumber,
          q: typeof e.question === 'string' ? e.question : JSON.stringify(e.question),
          ans: e.correctAnswer,
          tail,
          rationale: r.length > 120 ? r.slice(0, 120) + '…' : r,
        });
      }
    }
  }
  console.log(c('\n🎯 RATIONALE CONCLUSION CHECK', BOLD));
  console.log(`  ${checked} rationales ending in '= N' checked vs correctAnswer.\n`);
  if (!mismatches.length) {
    console.log(c('✅ Every concluding rationale value matches its authored answer.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${mismatches.length} rationale(s) concluding with a different value:`, RED));
  for (const m of mismatches.slice(0, 60)) {
    console.log(`  ${c(m.file, BOLD)} p${m.page}  authored=${c(m.ans, RED)} · rationale ends '= ${m.tail}'`);
    console.log(`    ${c(m.q, DIM)}`);
    console.log(`    ${c(m.rationale, DIM)}`);
  }
  if (mismatches.length > 60) console.log(`  … and ${mismatches.length - 60} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
