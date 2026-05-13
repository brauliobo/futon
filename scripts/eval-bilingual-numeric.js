#!/usr/bin/env node
// Bilingual consistency: for every {pt, en} object in question/choices/
// correctAnswer/rationale, the set of numbers extracted from each side must
// match. Catches translation drift like:
//   pt: "Dose de 25 mg cada 8 horas"  en: "25 mg dose every 6 hours"
// where the 8 vs 6 mismatch is invisible to monolingual review.
//
// Also flags when one half is empty / missing while the other has content.
//
// Skips identical numeric content (most cases) and dates / years that fall
// into 19xx/20xx (common shared dates), unless explicitly diverging.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', DIM = '\x1b[2m';
const c = (t, col) => `${col}${t}${RESET}`;

// Extract every unsigned numeric token (decimal allowed). We deliberately
// ignore leading '-' because hyphenated narrative phrases like '3-by-3' or
// 'near-100%' would otherwise produce phantom negative numbers and cause
// false positives without revealing real translation drift.
// Convert 'século XX' / 'XIX' Roman numerals to their Arabic value so that
// pt 'século XX' and en '20th century' compare equal.
const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
function roman(s) {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]], next = ROMAN[s[i + 1]];
    total += (next && cur < next) ? -cur : cur;
  }
  return total;
}

function numbers(s) {
  if (!s) return [];
  // Only convert Roman numerals in century context, to avoid false matches
  // on medical acronyms (CML, DII, MI all look Roman). Common pt/en pattern:
  //   'século XX' / 'XX century' / 'XIXth century' / 'do século XIX'
  const text = String(s).replace(
    /(?:s[eé]culo\s+)([IVXLCDM]{1,4})\b|\b([IVXLCDM]{1,4})(?:th)?\s+(?:century|séc)/gi,
    (m, p1, p2) => {
      const tok = (p1 || p2 || '').toUpperCase();
      const v = roman(tok);
      return v > 0 && v < 4000 ? m.replace(tok, ` ${v} `) : m;
    },
  );
  return [...text.matchAll(/(?<![.\d])\d+(?:[.,]\d+)?/g)]
    .map(m => Number(m[0].replace(',', '.')))
    .filter(Number.isFinite);
}

function multisetEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

function* bilingualNodes(value, path) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* bilingualNodes(value[i], `${path}[${i}]`);
    return;
  }
  if ('pt' in value && 'en' in value && typeof value.pt !== 'object') {
    yield { path, pt: value.pt, en: value.en };
    return;
  }
  for (const [k, v] of Object.entries(value)) yield* bilingualNodes(v, path ? `${path}.${k}` : k);
}

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let checked = 0;
  const violations = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const [pidx, p] of (s.pages || []).entries()) {
      for (const [eidx, e] of (p.exercises || []).entries()) {
        for (const node of bilingualNodes(e, `pages[${pidx}].exercises[${eidx}]`)) {
          checked++;
          const ptN = numbers(node.pt);
          const enN = numbers(node.en);
          // Empty-side violation: one side has content, the other doesn't.
          if (!node.pt && node.en) {
            violations.push({ file: f.replace('src/levels/', ''), path: node.path, kind: 'missing pt', pt: '', en: String(node.en).slice(0, 80) });
            continue;
          }
          if (!node.en && node.pt) {
            violations.push({ file: f.replace('src/levels/', ''), path: node.path, kind: 'missing en', pt: String(node.pt).slice(0, 80), en: '' });
            continue;
          }
          if (!multisetEqual(ptN, enN)) {
            violations.push({
              file: f.replace('src/levels/', ''),
              path: node.path,
              kind: 'number mismatch',
              ptNums: JSON.stringify(ptN),
              enNums: JSON.stringify(enN),
              pt: String(node.pt).slice(0, 80),
              en: String(node.en).slice(0, 80),
            });
          }
        }
      }
    }
  }
  console.log(c('\n🌐 BILINGUAL NUMERIC CONSISTENCY', BOLD));
  console.log(`  ${checked} bilingual {pt,en} nodes scanned.\n`);
  if (!violations.length) {
    console.log(c('✅ Every pt/en pair has identical numeric content.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${violations.length} bilingual inconsistencies:`, RED));
  for (const v of violations.slice(0, 60)) {
    console.log(`  ${c(v.file, BOLD)} ${v.kind}  ${c(v.path, DIM)}`);
    if (v.kind === 'number mismatch') {
      console.log(`    pt nums=${c(v.ptNums, RED)} · en nums=${c(v.enNums, GREEN)}`);
    }
    console.log(`    ${c('pt: ' + v.pt, DIM)}`);
    console.log(`    ${c('en: ' + v.en, DIM)}`);
  }
  if (violations.length > 60) console.log(`  … and ${violations.length - 60} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
