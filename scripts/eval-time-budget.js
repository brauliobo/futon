#!/usr/bin/env node
// Estimates total time per set from exerciseCount × passCriteria.
// maxAvgSecondsPerExercise. Kumon guideline: a single worksheet ~15 min,
// hard limit 20 min for regular drill. Flags sets outside [3, 20] min
// so authors can revisit exercise count or per-exercise target.
//
// Usage:
//   node scripts/eval-time-budget.js                # full scan
//   node scripts/eval-time-budget.js --subject math
//   node scripts/eval-time-budget.js --min 5 --max 15
//   node scripts/eval-time-budget.js --json

import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { parse } from 'yaml';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SUBJECT = argVal('--subject');
const CLI_MIN = argVal('--min'), CLI_MAX = argVal('--max');
const JSON_OUT = args.includes('--json');
const SUBJECTS = SUBJECT ? [SUBJECT] : ['math', 'portuguese', 'english', 'japanese', 'spanish', 'biology'];

// Kumon session-length guideline scales with level. Beginner drills are
// short (5-15 min); advanced reasoning sessions run longer. --min/--max
// overrides apply the same flat band across every level.
const LEVEL_BAND = {
  // Beginner: Kumon 5A-A — short drills for age 4-6
  '1A': [3, 12], '2A': [3, 12], '3A': [3, 12], '4A': [3, 12], '5A': [3, 12],
  '6A': [3, 12], '7A': [3, 12], A: [4, 15], B: [5, 18], C: [5, 18], D: [5, 18],
  // Intermediate: tweens
  E: [5, 20], F: [5, 20], G: [5, 20], H: [8, 25], I: [8, 25], J: [8, 25],
  // Advanced: teens / ENEM / calculus
  K: [8, 30], L: [8, 30], M: [10, 45], N: [10, 45], O: [10, 45],
  P: [10, 45], Q: [10, 45],
};
const DEFAULT_BAND = [3, 20];
function bandFor(level) {
  if (CLI_MIN && CLI_MAX) return [parseFloat(CLI_MIN), parseFloat(CLI_MAX)];
  return LEVEL_BAND[level] || DEFAULT_BAND;
}

function loadAll() {
  const sets = [];
  for (const subject of SUBJECTS) {
    const dir = path.join(process.cwd(), 'src', 'levels', subject);
    if (!fs.existsSync(dir)) continue;
    for (const level of fs.readdirSync(dir).sort()) {
      const ld = path.join(dir, level);
      if (!fs.statSync(ld).isDirectory()) continue;
      for (const file of fs.readdirSync(ld).filter(f => /\.ya?ml$/.test(f)).sort()) {
        try {
          const raw = parse(fs.readFileSync(path.join(ld, file), 'utf8'));
          sets.push({ ...raw, subject, level, _file: file });
        } catch { /* validate-sets reports */ }
      }
    }
  }
  return sets;
}

function analyze(set) {
  const exCount = (set.pages || []).reduce((a, p) => a + (p.exercises || []).length, 0);
  const secs = set.passCriteria?.maxAvgSecondsPerExercise;
  if (!exCount || !secs) return null;
  return { exCount, secs, totalMin: (exCount * secs) / 60 };
}

function main() {
  const sets = loadAll();
  const flagged = [];
  for (const s of sets) {
    const a = analyze(s);
    if (!a) continue;
    const [lo, hi] = bandFor(s.level);
    if (a.totalMin > hi || a.totalMin < lo) {
      flagged.push({ file: `${s.subject}/${s.level}/${s._file}`, band: [lo, hi], ...a });
    }
  }

  if (JSON_OUT) { console.log(JSON.stringify(flagged, null, 2)); return; }

  const bandNote = CLI_MIN && CLI_MAX
    ? `flat band ${CLI_MIN}-${CLI_MAX} min`
    : 'level-aware Kumon bands (1A-D: 3-18 min · E-J: 5-25 min · K-Q: 8-45 min)';
  console.log(c('\n⏱️  TIME-BUDGET SCANNER', BOLD + CYAN));
  console.log(c(`Scanned ${sets.length} sets · ${bandNote}\n`, CYAN));

  if (!flagged.length) {
    console.log(c('✅ All sets within time guideline.', GREEN));
    return;
  }

  flagged.sort((a, b) => Math.abs(b.totalMin - 12) - Math.abs(a.totalMin - 12));

  const t = new Table({
    head: ['FILE', 'EX', 'SEC/EX', 'TOTAL MIN', 'DIRECTION'].map(h => c(h, BOLD)),
    style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
    colWidths: [38, 6, 9, 12, 24], wordWrap: true,
  });

  for (const f of flagged.slice(0, 40)) {
    const over = f.totalMin > f.band[1];
    const dir = over ? c(`⚠️  > ${f.band[1]} (shorten)`, RED) : c(`⚠️  < ${f.band[0]} (extend)`, YELLOW);
    const minColor = over ? RED : YELLOW;
    t.push([f.file, f.exCount, f.secs, c(f.totalMin.toFixed(1), minColor), dir]);
  }
  console.log(t.toString());
  if (flagged.length > 40) console.log(c(`  ... and ${flagged.length - 40} more`, GRAY));

  const slow = flagged.filter(f => f.totalMin > f.band[1]).length;
  const fast = flagged.filter(f => f.totalMin < f.band[0]).length;
  console.log(c(`\n${slow} set(s) over level band · ${fast} set(s) under level band`, slow + fast ? YELLOW : GREEN));
  console.log(c('  Tune either exercise count (pages × per-page count) or', GRAY));
  console.log(c('  passCriteria.maxAvgSecondsPerExercise to bring set within guideline.', GRAY));
  process.exit(0); // advisory — never fails CI
}

main();
