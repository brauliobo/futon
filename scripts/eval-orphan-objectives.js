#!/usr/bin/env node
// Orphan objectives detector. A set's `objectives:` list should match the
// objectives actually used on its exercises. Codes declared at set-level
// but never tagged on any exercise are dangling promises — progress
// tracking breaks because the objective shows up in the set header but
// never accumulates exercise credit.
//
// Also flags the reverse: an exercise tags an objective that isn't in
// the set's declared list (unexpected scope).
//
// Exit 0 clean, 1 on any orphan.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const orphans = [];
  const rogue = [];
  for (const f of files) {
    const subject = f.match(/src\/levels\/([^/]+)\//)?.[1];
    // Biology sets author objectives as prose, not codes — set-level
    // sentences won't match exercise-level topic labels by string equality.
    if (subject === 'biology') continue;
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const setObjs = new Set(s.objectives || []);
    const usedObjs = new Set();
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        for (const o of (e.objectives || [])) usedObjs.add(o);
      }
    }
    const orphaned = [...setObjs].filter(o => !usedObjs.has(o));
    const rogued = [...usedObjs].filter(o => !setObjs.has(o));
    if (orphaned.length) orphans.push({ file: f.replace('src/levels/', ''), orphans: orphaned });
    if (rogued.length) rogue.push({ file: f.replace('src/levels/', ''), rogue: rogued });
  }

  console.log(c('\n🏷️  OBJECTIVE SCOPE CHECK', BOLD));
  if (!orphans.length && !rogue.length) {
    console.log(c('✅ Every set objective matches at least one exercise; no exercise tags an undeclared objective.', GREEN));
    process.exit(0);
  }
  if (orphans.length) {
    console.log(c(`❌ ${orphans.length} set(s) with orphan objectives (declared but never used):`, RED));
    for (const o of orphans.slice(0, 20)) {
      console.log(`  ${c(o.file, BOLD)}  ${c(JSON.stringify(o.orphans), GRAY)}`);
    }
    if (orphans.length > 20) console.log(c(`  … and ${orphans.length - 20} more`, GRAY));
  }
  if (rogue.length) {
    console.log(c(`\n❌ ${rogue.length} set(s) with rogue exercise objectives (used but not declared):`, RED));
    for (const r of rogue.slice(0, 20)) {
      console.log(`  ${c(r.file, BOLD)}  ${c(JSON.stringify(r.rogue), GRAY)}`);
    }
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
