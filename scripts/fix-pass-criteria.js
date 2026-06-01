#!/usr/bin/env node
// Backfill missing passCriteria on non-math sets. Math sets already have
// them (math/1A through math/Q); portuguese/english/japanese sets are
// missing them for 448 sets.
//
// Uses level-appropriate defaults derived from math's progression and
// adjusted for language sets (reading exercises are slower than drill
// arithmetic; early-literacy can be fast because of letter recognition).
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');

// Level → {minAccuracyPercent, maxAvgSecondsPerExercise}
// Tuned to land inside the eval:time practice bands (1A-D: 3-18 min,
// E-J: 5-25 min, K-Q: 8-45 min) for sets of ~20 exercises.
const DEFAULTS = {
  // Portuguese: avg ~12 ex, beginner band [3,12], middle [4-5,15-18]
  'portuguese/1A': { min: 85, sec: 25 },
  'portuguese/2A': { min: 85, sec: 25 },
  'portuguese/3A': { min: 85, sec: 28 },
  'portuguese/4A': { min: 85, sec: 28 },
  'portuguese/5A': { min: 85, sec: 28 },
  'portuguese/6A': { min: 85, sec: 25 },
  'portuguese/7A': { min: 85, sec: 28 },
  'portuguese/A': { min: 80, sec: 30 },
  'portuguese/B': { min: 80, sec: 35 },
  'portuguese/C': { min: 80, sec: 40 },
  'portuguese/D': { min: 75, sec: 45 },
  'portuguese/E': { min: 75, sec: 50 },
  'portuguese/F': { min: 75, sec: 50 },
  'portuguese/G': { min: 75, sec: 55 },
  'portuguese/H': { min: 75, sec: 55 },
  'portuguese/I': { min: 75, sec: 60 },
  'portuguese/J': { min: 75, sec: 60 },
  'portuguese/K': { min: 70, sec: 80 },
  'portuguese/L': { min: 70, sec: 80 },
  // English: avg 20 ex — band-compatible defaults
  'english/A': { min: 85, sec: 15 },
  'english/B': { min: 85, sec: 18 },
  'english/C': { min: 80, sec: 20 },
  'english/D': { min: 80, sec: 20 },
  'english/E': { min: 80, sec: 25 },
  'english/F': { min: 80, sec: 25 },
  'english/G': { min: 75, sec: 30 },
  'english/H': { min: 75, sec: 30 },
  'english/I': { min: 75, sec: 35 },
  'english/J': { min: 75, sec: 35 },
  'english/K': { min: 70, sec: 40 },
  'english/L': { min: 70, sec: 40 },
  // Japanese: 20-30 ex
  'japanese/2A': { min: 85, sec: 15 },
  'japanese/3A': { min: 85, sec: 18 },
  'japanese/4A': { min: 85, sec: 18 },
  'japanese/A': { min: 85, sec: 12 },
  'japanese/B': { min: 80, sec: 15 },
  'japanese/C': { min: 80, sec: 18 },
};

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let added = 0;
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    if (s.passCriteria) continue;
    const m = f.match(/src\/levels\/([^/]+)\/([^/]+)\//);
    const key = `${m[1]}/${m[2]}`;
    const def = DEFAULTS[key];
    if (!def) {
      console.log('  [skip]', key, '(no default)');
      continue;
    }
    // Insert passCriteria after the objectives block or authorNotes, before pages.
    // Keep the insertion deterministic: just before the first `pages:` line.
    const ins = `passCriteria:\n  minAccuracyPercent: ${def.min}\n  maxAvgSecondsPerExercise: ${def.sec}\n`;
    if (!/^pages:/m.test(raw)) {
      console.log('  [skip]', f, '(no pages: anchor)');
      continue;
    }
    const newRaw = raw.replace(/^pages:/m, ins + 'pages:');
    added++;
    console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `· ${def.min}% / ${def.sec}s`);
    if (APPLY) writeFileSync(f, newRaw);
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${added} backfill(s).`);
  if (!APPLY && added) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
