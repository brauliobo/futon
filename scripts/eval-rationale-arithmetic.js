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

// TOKEN allows a leading sign and supports nested sqrt(...) / parenthesized exprs.
const TOKEN = '(?:-?sqrt\\([^()]*\\)|-?\\d+(?:\\.\\d+)?|-?\\([^()]*\\))';
const EXPR_BODY = `${TOKEN}(?:\\s*[+\\-*/^]\\s*${TOKEN})*`;
// Match a chain: EXPR (= EXPR){1+}, where '=' may be '=' or '≈'.
const CHAIN_RE = new RegExp(
  `(?<![\\w.+\\-*/^])(${EXPR_BODY}(?:\\s*[=≈]\\s*${EXPR_BODY})+)(?![\\w+\\-*/^])`,
  'g'
);

function hasVarsOutsideSqrt(s) {
  return /[a-zA-Zα-ωΑ-Ωçãéõá-úÀ-ÿ_₀-₉]/.test(s.replace(/sqrt/gi, ''));
}

function normalizePrecedence(expr) {
  return expr.replace(/(^|[^.\d)])-(\d+)\^(\d+)/g, '$1(-$2)^$3');
}

export function checkClaims(text) {
  const out = [];
  const norm = normalize(text);
  for (const m of norm.matchAll(CHAIN_RE)) {
    // Skip when the chain start is actually a continuation of an outer
    // expression: e.g., in '4! / (2!*2!) = 24/4', the match starts at
    // '(2!*2!)' even though there's an operator earlier through whitespace.
    const before = norm.slice(0, m.index).match(/[+\-*/^]\s*$/);
    if (before) continue;
    const chain = m[1];
    // Split on '=' and '≈', keeping track of which operator separates each pair.
    const parts = chain.split(/\s*[=≈]\s*/);
    const seps = [...chain.matchAll(/[=≈]/g)].map(x => x[0]);
    if (parts.length < 2) continue;
    // Require at least one segment to contain an op (otherwise it's an
    // identity like "5 = 5" — uninteresting).
    if (!parts.some(p => /[+\-*/^]/.test(p.replace(/^-/, '')))) continue;
    // Skip if any segment has variables (outside sqrt) — keep pure-numeric.
    if (parts.some(hasVarsOutsideSqrt)) continue;
    const vals = parts.map(p => toNumber(tryEval(normalizePrecedence(p))));
    if (vals.some(v => v == null)) continue;
    // Verify each adjacent pair. Skip "definitional" pairs where LHS is a
    // bare number — these are typically prose framing ("Sucessor de 5 = 5+1 = 6").
    for (let i = 0; i < vals.length - 1; i++) {
      const lhs = parts[i].trim();
      const lhsHasOp = /[+\-*/^]/.test(lhs.replace(/^-/, ''));
      if (!lhsHasOp) continue;
      const tol = seps[i] === '≈' ? 0.05 : 1e-3;
      const ok = Math.abs(vals[i] - vals[i + 1]) < tol;
      out.push({
        lhs,
        rhs: parts[i + 1].trim(),
        sep: seps[i],
        lv: vals[i],
        rv: vals[i + 1],
        ok,
      });
    }
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
      if (!cl.ok) mismatches.push({ file: file.replace('src/levels/', ''), page, q, source, expr: `${cl.lhs} ${cl.sep} ${cl.rhs}`, computed: cl.lv });
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
