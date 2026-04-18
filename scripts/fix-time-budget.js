#!/usr/bin/env node
// Nudges passCriteria.maxAvgSecondsPerExercise down for sets that
// currently overshoot their Kumon level band. Does NOT touch sets under
// the band (those need more exercises, not shorter time).
//
// Uses the same band table as eval-time-budget.js.
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');

const LEVEL_BAND = {
  '1A': [3, 12], '2A': [3, 12], '3A': [3, 12], '4A': [3, 12], '5A': [3, 12],
  '6A': [3, 12], '7A': [3, 12], A: [4, 15], B: [5, 18], C: [5, 18], D: [5, 18],
  E: [5, 20], F: [5, 20], G: [5, 20], H: [8, 25], I: [8, 25], J: [8, 25],
  K: [8, 30], L: [8, 30], M: [10, 45], N: [10, 45], O: [10, 45],
  P: [10, 45], Q: [10, 45],
};

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let tuned = 0;
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    if (!s.passCriteria?.maxAvgSecondsPerExercise) continue;
    const band = LEVEL_BAND[s.level];
    if (!band) continue;
    const exCount = (s.pages || []).reduce((a, p) => a + (p.exercises || []).length, 0);
    if (!exCount) continue;
    const currentSec = s.passCriteria.maxAvgSecondsPerExercise;
    const totalMin = (exCount * currentSec) / 60;
    let targetSec;
    if (totalMin > band[1]) {
      // Over-band: tighten sec/ex to hit the ceiling.
      targetSec = Math.floor((band[1] * 60) / exCount);
      if (targetSec < 3 || targetSec >= currentSec) continue;
    } else if (totalMin < band[0]) {
      // Under-band: loosen sec/ex to hit the floor.
      targetSec = Math.ceil((band[0] * 60) / exCount);
      if (targetSec <= currentSec) continue;
    } else {
      continue; // within band
    }
    const newRaw = raw.replace(
      new RegExp(`(maxAvgSecondsPerExercise:\\s*)${currentSec}(\\s)`),
      `$1${targetSec}$2`,
    );
    if (newRaw === raw) continue;
    tuned++;
    console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `· ${currentSec}s → ${targetSec}s (${totalMin.toFixed(1)}min → ${((exCount * targetSec)/60).toFixed(1)}min)`);
    if (APPLY) writeFileSync(f, newRaw);
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${tuned} tune(s).`);
  if (!APPLY && tuned) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
