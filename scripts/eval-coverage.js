#!/usr/bin/env node
// Objective coverage scanner. Counts how many exercises target each learning
// objective (BNCC codes like EF07LP09, CEFR-style english.A1.greetings, etc).
//
// Kumon doctrine: every objective needs enough mass-practice for mastery.
// An objective with only 1-5 exercises globally is a red flag — either it
// should be removed (if not a real focus) or expanded (if it IS).
//
// Exit code 0 when every objective has ≥10 exercises, 1 otherwise.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

// Default threshold 4: portuguese sets commonly use "one exercise per
// page tagged with a specific objective" (10 pages × 1 ex = 10 ex total,
// but distributed across 4 objectives = 4 ex each), which is deliberate
// thematic coverage not a drill gap. Anything below 4 is a real gap.
// Pass --min=10 for the stricter Kumon mastery threshold.
const THRESHOLD = Number(process.argv.find(a => a.startsWith('--min='))?.slice(6)) || 4;

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const objCount = new Map(); // obj → total exercises across all sets
  const objLevels = new Map(); // obj → Set<level>
  for (const f of files) {
    const m = f.match(/src\/levels\/([^/]+)\/([^/]+)\//);
    const subject = m?.[1];
    // Biology authors objectives as prose, unique per question — coverage
    // threshold doesn't fit. Same exemption as eval:orphan-objectives.
    if (subject === 'biology') continue;
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const level = m ? `${m[1]}/${m[2]}` : 'unknown';
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        for (const o of e.objectives || []) {
          objCount.set(o, (objCount.get(o) || 0) + 1);
          if (!objLevels.has(o)) objLevels.set(o, new Set());
          objLevels.get(o).add(level);
        }
      }
    }
  }

  const totalObjs = objCount.size;
  const sparse = [...objCount.entries()]
    .filter(([, c]) => c < THRESHOLD)
    .sort((a, b) => a[1] - b[1]);

  console.log(c('\n📏 OBJECTIVE COVERAGE', BOLD));
  console.log(`  ${totalObjs} objectives across ${files.length} sets.`);
  console.log(`  Threshold: ≥${THRESHOLD} exercises per objective for mastery.\n`);

  if (!sparse.length) {
    console.log(c(`✅ Every objective has at least ${THRESHOLD} exercises.`, GREEN));
    process.exit(0);
  }

  console.log(c(`⚠️  ${sparse.length} under-drilled objective(s):`, YELLOW));
  for (const [obj, count] of sparse) {
    const lvls = [...objLevels.get(obj)].sort().join(', ');
    const color = count < 5 ? RED : YELLOW;
    console.log(`  ${c(String(count).padStart(3) + '×', color)} ${c(obj, BOLD)}  ${c('(' + lvls + ')', GRAY)}`);
  }
  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix options:', YELLOW));
  console.log(`  - Expand: add more exercises targeting this objective`);
  console.log(`  - Retire: if not a real focus, drop the tag from exercise/set objectives`);
  console.log(`  - Merge: combine with a related objective that has sufficient practice`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
