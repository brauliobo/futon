#!/usr/bin/env node
// Second-pass bias rebalancer for the residual sets where deterministic
// shuffle (fix-answer-position-bias) still lands biased. Explicitly
// rotates every other biased exercise so no position dominates >60%.
//
// Only touches sets currently flagged by find-answer-bias as having
// ≥70% bias. Conservative: rotates minimally (enough to drop below
// 70%), preserves question text structure.
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const CHOICE_RE = /\(([^)?]+\/[^)?]+)\)(\s*)$/;

function rotate(arr) {
  return [...arr.slice(-1), ...arr.slice(0, -1)];
}

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let totalRotated = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);

    // First find per-(ch-count) position-counts on this set.
    const posBy = new Map(); // N → [count0, count1, ...]
    for (const p of s.pages || []) for (const e of p.exercises || []) {
      const q = String(e.question);
      const m = q.match(CHOICE_RE);
      if (!m) continue;
      const parts = m[1].split('/').map(x => x.trim());
      const idx = parts.indexOf(String(e.correctAnswer));
      if (idx < 0) continue;
      const n = parts.length;
      if (!posBy.has(n)) posBy.set(n, new Array(n).fill(0));
      posBy.get(n)[idx]++;
    }

    // Which ch-counts need rebalancing (≥70% at one position, total ≥3)?
    const needFix = new Set();
    for (const [n, counts] of posBy) {
      const sum = counts.reduce((a, b) => a + b, 0);
      if (sum < 3) continue;
      const maxP = Math.max(...counts) / sum;
      if (maxP >= 0.7) needFix.add(n);
    }
    if (!needFix.size) continue;

    // Compute the minimum rotations needed per ch-count to drop the
    // majority below 70%. For sum=7 at 5/2 → need 1 rotation to reach
    // 4/3 (57%). For sum=10 at 7/3 → need 2 rotations to reach 5/5.
    const rotateTargetBy = new Map(); // ch-count → rotations needed
    for (const n of needFix) {
      const counts = posBy.get(n);
      const sum = counts.reduce((a, b) => a + b, 0);
      const maxC = Math.max(...counts);
      // Find smallest k such that (maxC - k) / sum < 0.7.
      const target = Math.max(0, Math.ceil(maxC - 0.695 * sum));
      rotateTargetBy.set(n, target);
    }

    let rotatedHere = 0;
    const seen = new Map();
    for (const p of s.pages || []) for (const e of p.exercises || []) {
      const q = String(e.question);
      const m = q.match(CHOICE_RE);
      if (!m) continue;
      const parts = m[1].split('/').map(x => x.trim());
      const idx = parts.indexOf(String(e.correctAnswer));
      if (idx < 0) continue;
      const n = parts.length;
      if (!needFix.has(n)) continue;
      const counts = posBy.get(n);
      const majority = counts.indexOf(Math.max(...counts));
      if (idx !== majority) continue;
      const k = `${n}`;
      const already = seen.get(k) || 0;
      if (already >= rotateTargetBy.get(n)) continue;
      seen.set(k, already + 1);
      const rotated = rotate(parts);
      const newParens = `(${rotated.join('/')})${m[2]}`;
      const newQ = q.replace(CHOICE_RE, newParens);
      // Regex-replace with care: match by full question string.
      const qEsc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(question:\\s*)(?:"${qEsc}"|'${qEsc}'|${qEsc})(\\s*[\\n,}])`);
      if (re.test(raw)) {
        raw = raw.replace(re, (mm, prefix, trail) => `${prefix}"${newQ}"${trail}`);
        rotatedHere++;
      }
    }
    if (rotatedHere) {
      totalRotated += rotatedHere;
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `· ${rotatedHere} exercises rotated`);
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${totalRotated} rotation(s).`);
  if (!APPLY && totalRotated) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
