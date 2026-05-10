#!/usr/bin/env node
// Library-backed answer-correctness check for math sets, using mathjs.
// Extends eval-arithmetic.js (which only handles "a OP b =") to cover:
//
//   • fractions / decimals (e.g. "1/4 + 2/4 =", "0.7 + 0.5 =")
//   • multi-operand arithmetic (e.g. "(2+3)×4 =")
//   • linear equations of the form "<expr> = <expr>, x =", where the
//     correctAnswer is the value of x
//
// Skips anything mathjs cannot parse (variable forms in non-equation
// questions, word problems with text, etc.). Exits non-zero on mismatch.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { create, all } from 'mathjs';

const math = create(all, { number: 'BigNumber', precision: 32 });

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m';
const c = (t, col) => `${col}${t}${RESET}`;

const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

const normalize = (s) =>
  String(s)
    // Group bare "a/b" fractions before reducing ÷ to / so that
    // "2/6 ÷ 3/4" parses as (2/6) ÷ (3/4), not ((2/6)/3)/4.
    // Don't grab the digits inside "√N/M" — that's a separate sqrt.
    .replace(/(?<![a-zA-Z\d\)√])(-?\d+\/\d+)(?![a-zA-Z\d])/g, '($1)')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\bsen\b/g, 'sin')
    .replace(/\bcosseno\b/g, 'cos')
    .replace(/\btg\b/g, 'tan')
    .replace(/\bcotg\b/g, 'cot')
    // "(N°)" → "(N deg)" so mathjs treats the argument as degrees
    .replace(/(-?\d+(?:\.\d+)?)\s*°/g, '($1 deg)')
    // Convert "N²" / "x³" → "(N)^2" / "(x)^3"
    .replace(/([\)\]a-zA-Z\d])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, base, sups) => {
      const exp = [...sups].map(ch => SUP[ch] || ch).join('');
      return `${base}^${exp}`;
    })
    // √N or √(expr) → sqrt(N) / sqrt(expr)
    .replace(/√\s*\(([^)]+)\)/g, 'sqrt($1)')
    .replace(/√\s*(-?\d+(?:\.\d+)?)/g, 'sqrt($1)')
    .replace(/\s+/g, ' ')
    .trim();

function tryEval(expr) {
  try { return math.evaluate(expr); } catch { return null; }
}

function toNumber(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v?.toNumber === 'function') {
    const n = v.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'object' && 'n' in v && 'd' in v) {
    return Number(v.n) / Number(v.d);
  }
  return null;
}

const EQ_RE = /^(.+?)\s*=\s*(.+?)\s*,\s*x\s*=\s*$/i;
const FN_RE = /^f\(x\)\s*=\s*(.+?)\s*,\s*f\((-?\d+(?:\.\d+)?)\)\s*=\s*\??\s*$/i;
const LIM_RE = /^lim\s*\(\s*x\s*→\s*(-?\d+(?:\.\d+)?)\s*\)\s*(.+?)\s*=\s*\??\s*$/i;
const LIM_INF_RE = /^lim\s*\(\s*x\s*→\s*(-?∞|-?infty?|-?inf)\s*\)\s*(.+?)\s*=\s*\??\s*$/i;
const NEXT_RE = /^(?:depois|ap[óo]s)\s+de\s+(-?\d+)\s+vem:?\s*$/i;
const PREV_RE = /^antes\s+de\s+(-?\d+)\s+vem:?\s*$/i;
const MENTAL_HINT_RE = /^(.+?)\s*=\s*\([^)]+\)\s*$/;       // "7 + 9 = (7 + 10 - 1)" → LHS = "7 + 9"
const SQUARE_ROOT_RE = /^[a-zσ]\^?2\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*[a-zσ]\s*=\s*\??\s*$/i;
const AREA_RECT_RE = /^[áa]rea\s+do\s+(?:ret[âa]ngulo|quadrado)\s+(\d+)\s*[×*]\s*(\d+)\s*=\s*\??\s*$/i;
const PERIM_RECT_RE = /^per[íi]metro\s+do\s+(?:ret[âa]ngulo|quadrado)\s+(\d+)\s*[×*]\s*(\d+)\s*=\s*\??\s*$/i;

// Probe-verify two expressions are equivalent by evaluating at several x.
function probeEquivalent(expr1, expr2) {
  const xs = [0.31, 1.7, -2.3, 4.1, -5.9, 3];
  for (const x of xs) {
    let v1, v2;
    try { v1 = math.evaluate(expr1, { x }); } catch { return null; }
    try { v2 = math.evaluate(expr2, { x }); } catch { return null; }
    const n1 = toNumber(v1), n2 = toNumber(v2);
    if (n1 == null || n2 == null) return null;
    if (Math.abs(n1 - n2) > Math.max(1e-6, Math.abs(n1) * 1e-6)) return false;
  }
  return true;
}

function verify(question, answer, type) {
  const q = normalize(question);
  const a = normalize(answer);

  // Polynomial-factoring form: question is an expression, answer is its
  // factored product. Both depend on x; probe at several values.
  if (type === 'factoring' || type === 'algebraic_expression') {
    // Strip parenthesized hints like "(começa com …)".
    const qExpr = q.replace(/\s*\([^)]*com[^)]*\)\s*$/i, '').trim();
    const result = probeEquivalent(qExpr, a);
    if (result === true) return { ok: true, computed: 'expanded match', kind: 'factoring' };
    if (result === false) return { ok: false, computed: 'expansions differ', kind: 'factoring' };
  }

  // "<expr> = (hint)" mental-math form: compute LHS, ignore the hint.
  const hint = q.match(MENTAL_HINT_RE);
  if (hint) {
    const lv = tryEval(normalize(hint[1]));
    const an = toNumber(tryEval(a));
    const ln = toNumber(lv);
    if (ln != null && an != null) {
      return { ok: Math.abs(ln - an) < 1e-6, computed: `${ln}`, kind: 'mental_hint' };
    }
  }
  // "Área do retângulo/quadrado a×b = ?" → a*b
  const area = q.match(AREA_RECT_RE);
  if (area) {
    const expected = Number(area[1]) * Number(area[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'area_rect' };
  }
  // "Perímetro do retângulo a×b = ?" → 2*(a+b)
  const perim = q.match(PERIM_RECT_RE);
  if (perim) {
    const expected = 2 * (Number(perim[1]) + Number(perim[2]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'perim_rect' };
  }
  // "v² = N → v = ?" — positive square root of N.
  const sqr = q.match(SQUARE_ROOT_RE);
  if (sqr) {
    const target = Number(sqr[1]);
    if (target >= 0) {
      const expected = Math.sqrt(target);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(expected - an) < 1e-9, computed: `${expected}`, kind: 'sqrt_eq' };
    }
  }
  // "Depois de N vem:" → answer N+1
  const next = q.match(NEXT_RE);
  if (next) {
    const expected = Number(next[1]) + 1;
    const an = toNumber(tryEval(a));
    if (an == null) return null;
    return { ok: an === expected, computed: `${expected}`, kind: 'successor' };
  }
  // "Antes de N vem:" → answer N-1
  const prev = q.match(PREV_RE);
  if (prev) {
    const expected = Number(prev[1]) - 1;
    const an = toNumber(tryEval(a));
    if (an == null) return null;
    return { ok: an === expected, computed: `${expected}`, kind: 'predecessor' };
  }

  // Function-evaluation form: "f(x) = <expr>, f(N) = ?"
  const fn = q.match(FN_RE);
  if (fn) {
    const xVal = Number(fn[2]);
    const fv = (() => { try { return math.evaluate(fn[1], { x: xVal }); } catch { return null; } })();
    const av = tryEval(a);
    const fn_n = toNumber(fv), an = toNumber(av);
    if (fn_n == null || an == null) return null;
    return { ok: Math.abs(fn_n - an) < 1e-9, computed: `${fn_n}`, kind: 'function' };
  }

  // Limit (substitution-friendly): "lim(x→N) <expr> = ?"
  const lim = q.match(LIM_RE);
  if (lim) {
    const xVal = Number(lim[1]);
    const lv = (() => { try { return math.evaluate(lim[2], { x: xVal }); } catch { return null; } })();
    const av = tryEval(a);
    const ln = toNumber(lv), an = toNumber(av);
    if (ln == null || an == null) return null;
    return { ok: Math.abs(ln - an) < 1e-9, computed: `${ln}`, kind: 'limit' };
  }

  // Limit at infinity: evaluate at a very large value as numeric proxy.
  const liminf = q.match(LIM_INF_RE);
  if (liminf) {
    const sign = liminf[1].trim().startsWith('-') ? -1 : 1;
    const xVal = sign * 1e8;
    const lv = (() => { try { return math.evaluate(liminf[2], { x: xVal }); } catch { return null; } })();
    const av = tryEval(a);
    const ln = toNumber(lv), an = toNumber(av);
    if (ln == null || an == null) return null;
    // Loose tolerance — convergence isn't exact at finite x.
    const tol = Math.max(1e-4, Math.abs(an) * 1e-4);
    return { ok: Math.abs(ln - an) < tol, computed: `${ln}`, kind: 'limit∞' };
  }

  // Equation form. Two accepted shapes:
  //   "<lhs> = <rhs>, x ="    (correctAnswer is x)
  //   "<lhs> = <rhs>"         (type=equation; correctAnswer is x)
  if (type === 'equation' || /,\s*x\s*=\s*$/i.test(q)) {
    let lhsExpr, rhsExpr;
    const m = q.match(EQ_RE);
    if (m) { lhsExpr = m[1]; rhsExpr = m[2]; }
    else {
      const eqIdx = q.indexOf('=');
      if (eqIdx < 0) return null;
      lhsExpr = q.slice(0, eqIdx).trim();
      rhsExpr = q.slice(eqIdx + 1).trim();
    }
    const xVal = tryEval(a);
    if (xVal == null) return null;
    const scope = { x: xVal };
    const lhs = (() => { try { return math.evaluate(lhsExpr, scope); } catch { return null; } })();
    const rhs = (() => { try { return math.evaluate(rhsExpr, scope); } catch { return null; } })();
    const ln = toNumber(lhs), rn = toNumber(rhs);
    if (ln == null || rn == null) return null;
    return { ok: Math.abs(ln - rn) < 1e-9, computed: `LHS=${ln}, RHS=${rn}`, kind: 'equation' };
  }

  // Plain "<expr> = [?]" form or bare expression (radical/exponent forms
  // sometimes omit the '='). Strip trailing '?' / '=' and evaluate.
  if (/^[A-Za-z]$/.test(a.trim())) return null;
  const lhs = q.replace(/\s*\?\s*$/, '').replace(/\s*=\s*$/, '').trim();
  if (!lhs) return null;
  // Try direct numeric evaluation first; if it relies on x, probe at x=1.
  let lv = tryEval(lhs);
  let identity = false;
  if (lv == null) {
    try { lv = math.evaluate(lhs, { x: 1 }); identity = lv != null; } catch {}
  }
  if (lv == null) return null;
  const av = tryEval(a);
  const ln = toNumber(lv), an = toNumber(av);
  if (ln == null || an == null) return null;
  const tol = identity ? 1e-6 : 1e-6;
  return { ok: Math.abs(ln - an) < tol, computed: `${ln}`, kind: identity ? 'identity' : 'expression' };
}

async function main() {
  const files = await fg('src/levels/math/**/set_*.yaml');
  let checked = 0, byKind = { equation: 0, expression: 0, function: 0, limit: 0, 'limit∞': 0, identity: 0, successor: 0, predecessor: 0, mental_hint: 0, sqrt_eq: 0, area_rect: 0, perim_rect: 0, factoring: 0 };
  const mismatches = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const r = verify(e.question, e.correctAnswer, e.type);
        if (!r) continue;
        checked++;
        byKind[r.kind]++;
        if (!r.ok) {
          mismatches.push({
            file: f.replace('src/levels/', ''),
            page: p.pageNumber,
            type: e.type,
            q: e.question,
            authored: e.correctAnswer,
            computed: r.computed,
            kind: r.kind,
          });
        }
      }
    }
  }

  console.log(c('\n🧮 MATH CORRECTNESS (mathjs)', BOLD));
  const summary = Object.entries(byKind).filter(([, n]) => n > 0).map(([k, n]) => `${k}: ${n}`).join(', ');
  console.log(`  ${checked} exercises verified  (${summary}).\n`);
  if (!mismatches.length) {
    console.log(c('✅ All authored answers match library evaluation.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${mismatches.length} mismatches:`, RED));
  for (const m of mismatches.slice(0, 50)) {
    console.log(`  ${c(m.file, BOLD)} p${m.page} [${m.kind}/${m.type}]  ${m.q}  authored=${c(m.authored, RED)} · ${c(m.computed, GREEN)}`);
  }
  if (mismatches.length > 50) console.log(`  … and ${mismatches.length - 50} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
