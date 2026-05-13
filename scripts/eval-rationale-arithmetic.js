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
  return String(s)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, ch => `^${SUP[ch]}`)
    .replace(/[·×]/g, '*')
    .replace(/−/g, '-')
    .replace(/√(\d+)/g, 'sqrt($1)')
    .replace(/√\(([^)]+)\)/g, 'sqrt($1)')
    // Fractions adjacent to '÷' are atomic operands.
    .replace(/(\d+)\/(\d+)\s*÷\s*(\d+)\/(\d+)/g, '($1/$2)/($3/$4)')
    .replace(/(\d+)\/(\d+)\s*÷\s*(\d+)/g, '($1/$2)/$3')
    .replace(/(\d+)\s*÷\s*(\d+)\/(\d+)/g, '$1/($2/$3)')
    .replace(/÷/g, '/');
}

// LHS: at least one binary op. Digits, ., parens, ops, ^ allowed.
// RHS: a single number (possibly fractional, possibly negative).
// Both LHS and RHS can be arithmetic expressions. Compare evaluated values.
// TOKEN allows a leading sign and supports nested sqrt(...) / parenthesized exprs.
const TOKEN = '(?:-?sqrt\\([^()]*\\)|-?\\d+(?:\\.\\d+)?|-?\\([^()]*\\))';
const EXPR = `${TOKEN}(?:\\s*[+\\-*/^]\\s*${TOKEN})*`;
const LHS_RE = new RegExp(
  `(?<![\\w.+\\-*/^])(${TOKEN}(?:\\s*[+\\-*/^]\\s*${TOKEN})+)\\s*=\\s*(${EXPR})(?![\\w+\\-*/^])`,
  'g'
);

export function checkClaims(text) {
  const out = [];
  const norm = normalize(text);
  for (const m of norm.matchAll(LHS_RE)) {
    const lhs = m[1].trim();
    const rhsStr = m[2].replace(/\s+/g, '');
    if (!/[+\-*/^]/.test(lhs.replace(/^-/, ''))) continue;
    // Skip if either side contains variables (allow 'sqrt' as a known function).
    const stripSqrt = (s) => s.replace(/sqrt/gi, '');
    if (/[a-zA-Zα-ωΑ-Ωçãéõá-úÀ-ÿ_₀-₉]/.test(stripSqrt(lhs))) continue;
    if (/[a-zA-Zα-ωΑ-Ωçãéõá-úÀ-ÿ_₀-₉]/.test(stripSqrt(rhsStr))) continue;
    const lhsN = lhs.replace(/(^|[^.\d)])-(\d+)\^(\d+)/g, '$1(-$2)^$3');
    const lv = toNumber(tryEval(lhsN));
    const rv = toNumber(tryEval(rhsStr));
    if (lv == null || rv == null) continue;
    out.push({ lhs, rhs: rhsStr, lv, rv, ok: Math.abs(lv - rv) < 1e-3 });
  }
  return out;
}

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
  const accept = (file, page, q, source, text) => {
    if (!text) return;
    for (const cl of checkClaims(text)) {
      checked++;
      if (!cl.ok) mismatches.push({ file: file.replace('src/levels/', ''), page, q, source, expr: `${cl.lhs} = ${cl.rhs}`, computed: cl.lv });
    }
  };
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    if (typeof s.example === 'string') accept(f, '-', '(example)', 'example', s.example);
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        accept(f, p.pageNumber, e.question, 'rationale', e.rationale ? String(e.rationale) : '');
      }
    }
  }
  console.log(c('\n📝 RATIONALE ARITHMETIC CHECK', BOLD));
  console.log(`  ${checked} numeric claims (rationales + examples) verified.\n`);
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
