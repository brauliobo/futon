#!/usr/bin/env node
// Structural rationale completion for math/I/set_09 and math/I/set_14:
// - '√A OP √B' questions: replace partial rationale ('√A = a pois a² = A.')
//   with complete computation ('√A OP √B = a OP b = result.').
// - 'x^2 = N' questions with bare-numeric answer (no '±'): replace generic
//   rationale with concrete ('x² = N → x = √N = M.').
//
// Idempotent. Run with --apply to write; default is dry-run.

import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';

const FILES = [
  ...await fg('src/levels/math/I/set_*.yaml'),
  ...await fg('src/levels/math/M/set_*.yaml'),
  ...await fg('src/levels/math/P/set_*.yaml'),
];

const SQRT_OP_RE = /^√(\d+)\s*([+×])\s*√(\d+)$/;

function sqrtN(n) {
  const r = Math.sqrt(n);
  return Number.isInteger(r) ? r : null;
}

function apply(path) {
  const src = readFileSync(path, 'utf8');
  let count = 0;
  const out = src.replace(
    /(\s+question:\s*([^\n]+)\n\s+correctAnswer:\s*([^\n]+)\n\s+rationale:\s*)("[^"]*"|[^\n]+)/g,
    (m, head, q, ans, oldR) => {
      const qt = q.trim();
      const at = ans.trim().replace(/^["']|["']$/g, '');
      // Pattern 1: √A op √B
      const sm = qt.match(SQRT_OP_RE);
      if (sm) {
        const a = sqrtN(Number(sm[1])), b = sqrtN(Number(sm[3]));
        const op = sm[2];
        if (a == null || b == null) return m;
        const result = op === '+' ? a + b : a * b;
        if (Number(at) !== result) return m;
        const newR = `${qt} = ${a} ${op} ${b} = ${result}.`;
        count++;
        return `${head}${JSON.stringify(newR)}`;
      }
      // Pattern 2: x^2 = N with bare-numeric answer
      const xm = qt.match(/^x\^2\s*=\s*(\d+)$/);
      if (xm && /^\d+$/.test(at)) {
        const N = Number(xm[1]), M = Number(at);
        if (sqrtN(N) === M) {
          const newR = `x² = ${N} → x = √${N} = ${M}.`;
          count++;
          return `${head}${JSON.stringify(newR)}`;
        }
      }
      // Pattern 3: factorial 'N! = ?'
      const fm = qt.match(/^(\d+)!\s*=\s*\?$/);
      if (fm) {
        const N = Number(fm[1]);
        if (N >= 0 && N <= 10 && /^\d+$/.test(at)) {
          let prod = 1;
          for (let i = N; i >= 1; i--) prod *= i;
          if (prod === Number(at)) {
            const chain = N <= 1 ? `${N}!` : Array.from({ length: N }, (_, i) => N - i).join('·');
            const newR = N <= 1
              ? `${N}! = ${prod} (por convenção).`
              : `${N}! = ${chain} = ${prod}.`;
            count++;
            return `${head}${JSON.stringify(newR)}`;
          }
        }
      }
      // Pattern 4: complementary probability "P(não X) = ?"
      // Specific authored forms:
      //   'Se P(chuva)=0.3, P(não chuva)=?' → ans = 1 - 0.3
      //   'P(não cara) em moeda = ?'        → ans = 1 - 1/2 = 1/2
      //   'P(não 6 em dado) = ?'            → ans = 1 - 1/6 = 5/6
      //   'P(não ás em baralho) = ?'        → ans = 1 - 1/13 = 12/13
      const cp = qt.match(/^Se P\([^)]+\)\s*=\s*([\d.]+)\s*,\s*P\(não\s+\w+\)\s*=\s*\?$/);
      if (cp) {
        const p = Number(cp[1]);
        const expected = 1 - p;
        if (Math.abs(expected - Number(at)) < 1e-6) {
          const newR = `Complementar: P(Ā) = 1 − ${p} = ${expected}.`;
          count++;
          return `${head}${JSON.stringify(newR)}`;
        }
      }
      const cpMap = {
        'P(não cara) em moeda = ?': { p: '1/2', neg: '1/2' },
        'P(não 6 em dado) = ?':     { p: '1/6', neg: '5/6' },
        'P(não ás em baralho) = ?': { p: '1/13', neg: '12/13' },
      };
      if (cpMap[qt] && at === cpMap[qt].neg) {
        const { p, neg } = cpMap[qt];
        const newR = `Complementar: P(Ā) = 1 − ${p} = ${neg}.`;
        count++;
        return `${head}${JSON.stringify(newR)}`;
      }
      // Pattern 5: 'P(A)=p → P(Ā) = ?'
      const cp2 = qt.match(/^P\(A\)\s*=\s*([\d.]+)\s*→\s*P\(Ā\)\s*=\s*\?$/);
      if (cp2) {
        const p = Number(cp2[1]);
        const expected = 1 - p;
        if (Math.abs(expected - Number(at)) < 1e-6) {
          const newR = `Complementar: P(Ā) = 1 − ${p} = ${expected}.`;
          count++;
          return `${head}${JSON.stringify(newR)}`;
        }
      }
      // Pattern 5b: 'P(A)=p1, P(B)=p2, mutuamente exclusivos → P(A∪B) = ?'
      const me = qt.match(/^P\(A\)\s*=\s*([\d.]+)\s*,\s*P\(B\)\s*=\s*([\d.]+)\s*,\s*mutuamente\s+exclusivos\s*→\s*P\(A∪B\)\s*=\s*\?$/);
      if (me) {
        const p1 = Number(me[1]), p2 = Number(me[2]);
        const expected = p1 + p2;
        if (Math.abs(expected - Number(at)) < 1e-6) {
          const newR = `Mutuamente exclusivos: P(A∪B) = P(A) + P(B) = ${p1} + ${p2} = ${expected}.`;
          count++;
          return `${head}${JSON.stringify(newR)}`;
        }
      }
      // Pattern 7: trig 'Se sen(x) = a/c (x agudo), tan(x) = ?' with Pythag triple
      const tm = qt.match(/^Se\s+sen\(x\)\s*=\s*(\d+)\/(\d+)\s*\(x\s+agudo\)\s*,\s*tan\(x\)\s*=\s*\?$/);
      if (tm) {
        const a = Number(tm[1]), c = Number(tm[2]);
        const b2 = c * c - a * a;
        const b = Math.sqrt(b2);
        if (Number.isInteger(b)) {
          const expectedStr = `${a}/${b}`;
          if (at === expectedStr) {
            const newR = `cos x = ${b}/${c} (sen²+cos²=1); tan x = sen/cos = (${a}/${c})/(${b}/${c}) = ${a}/${b}.`;
            count++;
            return `${head}${JSON.stringify(newR)}`;
          }
        }
      }
      // Pattern 8: Euler identity 'e^(iπ) = ?' answer -1
      if (qt === 'e^(iπ) = ?' && at === '-1') {
        const newR = `Fórmula de Euler: e^(iπ) = cos π + i·sen π = −1 + 0i = −1.`;
        count++;
        return `${head}${JSON.stringify(newR)}`;
      }
      // Pattern 6: 'ŷ = A + Bx — intercepto a = ?'
      const im = qt.match(/^ŷ\s*=\s*(-?\d+(?:\.\d+)?)\s*\+\s*(-?\d+(?:\.\d+)?)x\s*[—-]+\s*intercepto\s+a\s*=\s*\?$/);
      if (im && Math.abs(Number(im[1]) - Number(at)) < 1e-6) {
        const newR = `ŷ = ${im[1]} + ${im[2]}·0 = ${im[1]}.`;
        count++;
        return `${head}${JSON.stringify(newR)}`;
      }
      return m;
    },
  );
  if (process.argv.includes('--apply')) writeFileSync(path, out);
  console.log(`${path}: ${count} ${process.argv.includes('--apply') ? 'rewritten' : 'would rewrite'}`);
  return count;
}

let total = 0;
for (const f of FILES) total += apply(f);
console.log(`\nTotal: ${total} ${process.argv.includes('--apply') ? '(written)' : '(dry-run, use --apply)'}`);
