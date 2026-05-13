#!/usr/bin/env node
// Verifies arithmetic claims embedded inside rationales: each "<expr> = <val>"
// substring where LHS is pure numeric arithmetic is evaluated and compared to
// the RHS. Catches typos like "72/96 = 0.75" (should be 0.6 with /120).
//
// Conservative on purpose: skips expressions containing variables, ?, ≈, ±,
// units, or non-arithmetic punctuation. Math (mathjs) handles fractions and
// exponents; superscripts/middle-dots are normalized first.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { create, all } from 'mathjs';

const math = create(all, { number: 'BigNumber', precision: 32 });
const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', DIM = '\x1b[2m';
const c = (t, col) => `${col}${t}${RESET}`;

const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

function normalize(s) {
  return s
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, ch => `^${SUP[ch]}`)
    .replace(/[·×]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/√(\d+)/g, 'sqrt($1)')
    .replace(/√\(([^)]+)\)/g, 'sqrt($1)');
}

// LHS: at least one binary op. Digits, ., parens, ops, ^ allowed.
// RHS: a single number (possibly fractional, possibly negative).
// Both LHS and RHS can be arithmetic expressions. Compare evaluated values.
// TOKEN allows a leading sign so 'a + -b' / 'a * -b' parse cleanly.
const TOKEN = '(?:-?\\d+(?:\\.\\d+)?|-?\\([^()]*\\))';
const EXPR = `${TOKEN}(?:\\s*[+\\-*/^]\\s*${TOKEN})*`;
const LHS_RE = new RegExp(
  `(?<![\\w.+\\-*/^])(${TOKEN}(?:\\s*[+\\-*/^]\\s*${TOKEN})+)\\s*=\\s*(${EXPR})(?![\\w+\\-*/^])`,
  'g'
);

function toNumber(x) {
  try {
    const n = typeof x === 'object' && x?.toNumber ? x.toNumber() : Number(x);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

function tryEval(expr) {
  try { return math.evaluate(expr); } catch { return null; }
}

async function main() {
  const files = await fg('src/levels/math/**/set_*.yaml');
  let checked = 0;
  const mismatches = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const r = e.rationale ? String(e.rationale) : '';
        if (!r) continue;
        const text = normalize(r);
        // Skip rationale fragments with variables — pure numeric only.
        for (const m of text.matchAll(LHS_RE)) {
          const lhs = m[1].trim();
          const rhsStr = m[2].replace(/\s+/g, '');
          if (!/[+\-*/^]/.test(lhs.replace(/^-/, ''))) continue;
          // Skip if either side contains letters/variables — pure numeric only.
          if (/[a-zA-Zα-ωΑ-Ωçãéõá-úÀ-ÿ_₀-₉]/.test(lhs) || /[a-zA-Zα-ωΑ-Ωçãéõá-úÀ-ÿ_₀-₉]/.test(rhsStr)) continue;
          // Operator-precedence ambiguous: '-N^M' (author means (-N)^M, mathjs reads -(N^M)).
          // Normalize so author's intent is evaluated.
          const lhsN = lhs.replace(/(^|[^.\d)])-(\d+)\^(\d+)/g, '$1(-$2)^$3');
          const lv = toNumber(tryEval(lhsN));
          const rv = toNumber(tryEval(rhsStr));
          if (lv == null || rv == null) continue;
          checked++;
          if (Math.abs(lv - rv) > 1e-3) {
            mismatches.push({
              file: f.replace('src/levels/', ''),
              page: p.pageNumber,
              q: e.question,
              expr: `${lhs} = ${rhsStr}`,
              computed: lv,
            });
          }
        }
      }
    }
  }
  console.log(c('\n📝 RATIONALE ARITHMETIC CHECK', BOLD));
  console.log(`  ${checked} numeric claims in rationales verified.\n`);
  if (!mismatches.length) {
    console.log(c('✅ All rationale arithmetic claims check out.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${mismatches.length} mismatches:`, RED));
  for (const m of mismatches.slice(0, 50)) {
    console.log(`  ${c(m.file, BOLD)} p${m.page}  ${c(m.expr, RED)} (= ${c(m.computed, GREEN)})`);
    console.log(`    ${c(m.q, DIM)}`);
  }
  if (mismatches.length > 50) console.log(`  … and ${mismatches.length - 50} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
