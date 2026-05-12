#!/usr/bin/env node
// Content fix: math/H/set_06, set_07, set_08, set_14, set_20 — inequality
// answers for negative-coefficient forms forgot the sign flip when dividing.
// For 'ax + b op c' the correct answer is the closest integer strictly in
// the (sign-flipped) solution set.
//
// Strategy:
//   bound = (c - b) / a
//   - if a > 0 and op = '<' → x < bound,  answer = bound-1 (or floor(bound) for non-int)
//   - if a > 0 and op = '>' → x > bound,  answer = bound+1 (or ceil(bound))
//   - if a < 0 and op = '<' → x > bound,  answer = bound+1 (or ceil(bound))
//   - if a < 0 and op = '>' → x < bound,  answer = bound-1 (or floor(bound))

import { readFileSync, writeFileSync } from 'fs';

const FILES = [
  'src/levels/math/H/set_06.yaml',
  'src/levels/math/H/set_07.yaml',
  'src/levels/math/H/set_08.yaml',
  'src/levels/math/H/set_14.yaml',
  'src/levels/math/H/set_20.yaml',
];

const QRE = /^(-?\d+)\s*x\s*\+\s*(-?\d+)\s*(<=|>=|<|>)\s*(-?\d+)$/;

const apply = process.argv.includes('--apply');
let totalFixed = 0, totalAlready = 0;

for (const path of FILES) {
  const src = readFileSync(path, 'utf8');
  let fixed = 0, already = 0;
  const out = src.replace(/(\s+question:\s*([^\n]+)\n\s+correctAnswer:\s*)("[^"]*"|[^\n]+)/g, (m, head, q, oldA) => {
    const mq = q.trim().match(QRE);
    if (!mq) return m;
    const a = Number(mq[1]), b = Number(mq[2]), op = mq[3], c = Number(mq[4]);
    if (a === 0) return m;
    const bound = (c - b) / a;
    const flipped = a < 0 ? (op === '<' ? '>' : op === '>' ? '<' : op) : op;
    let answer;
    const isInt = Number.isInteger(bound);
    if (flipped === '<') answer = isInt ? bound - 1 : Math.floor(bound);
    else if (flipped === '>') answer = isInt ? bound + 1 : Math.ceil(bound);
    else return m;
    const oldNum = Number(String(oldA).replace(/"/g, ''));
    if (oldNum === answer) { already++; return m; }
    fixed++;
    return `${head}"${answer}"`;
  });
  if (apply && fixed) writeFileSync(path, out);
  console.log(`${path}: ${fixed} would be fixed, ${already} already correct`);
  totalFixed += fixed; totalAlready += already;
}
console.log(`\nTotal: ${totalFixed} fixed, ${totalAlready} already correct ${apply ? '(written)' : '(dry-run, use --apply)'}`);
