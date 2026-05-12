#!/usr/bin/env node
// One-off content fix: math/H/set_02.yaml authored answers divide by the
// wrong factor (drop the denominator's '2' when solving '(N/2)x + b = c').
// Recompute correct answer + rebuild rationale for each linear_equation,
// preserving question/difficulty/objectives.
//
// Pattern: '(N/2)x + B = C' → x = (C - B) * 2 / N
// Pattern: 'Nx + B = C'     → x = (C - B) / N (already-correct shape kept)

import { readFileSync, writeFileSync } from 'fs';

const path = 'src/levels/math/H/set_02.yaml';
const src = readFileSync(path, 'utf8');

const QRE = /\(\s*(-?\d+)\s*\/\s*(\d+)\s*\)\s*x\s*\+\s*(-?\d+)\s*=\s*(-?\d+)/;

let total = 0, fixed = 0;
const out = src.replace(/(\s+question:\s*([^\n]+)\n\s+correctAnswer:\s*)("[^"]*"|[^\n]+)(\n\s+rationale:\s*)("[^"]*"|[^\n]+)/g, (m, head, q, oldA, midR, oldR) => {
  total++;
  const mq = q.match(QRE);
  if (!mq) return m;
  const num = Number(mq[1]), den = Number(mq[2]), B = Number(mq[3]), C = Number(mq[4]);
  const lhsCoeff = num / den;
  if (!Number.isFinite(lhsCoeff) || lhsCoeff === 0) return m;
  const x = (C - B) / lhsCoeff;
  if (!Number.isInteger(x)) return m;  // non-integer result — leave alone
  fixed++;
  const newR = `"Isole x: (${mq[1]}/${mq[2]})x = ${C} - ${B} = ${C - B}. x = (${C - B})·(${den}/${num}) = ${x}."`;
  return `${head}"${x}"${midR}${newR}`;
});

if (process.argv.includes('--apply')) {
  writeFileSync(path, out);
  console.log(`Updated ${path} — ${fixed}/${total} exercises rewritten.`);
} else {
  console.log(`DRY-RUN — would update ${fixed}/${total} exercises in ${path} (use --apply to write).`);
}
