#!/usr/bin/env node
// Snapshot-and-diff tracker for the pedagogy rubric. Saves the current
// eval output as a baseline, then on re-run shows per-level deltas so CI
// and reviewers can spot regressions or improvements without eyeballing
// 60+ levels. Baseline lives at PEDAGOGY_SNAPSHOT.json (repo root).
//
// Usage:
//   node scripts/pedagogy-snapshot.js              # diff vs baseline
//   node scripts/pedagogy-snapshot.js --save       # write new baseline
//   node scripts/pedagogy-snapshot.js --threshold -2  # fail if any level drops >=2pts

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SAVE = args.includes('--save');
const DROP_THRESHOLD = parseInt(argVal('--threshold') || '-3', 10); // drop in pp

const SNAPSHOT = path.join(process.cwd(), 'PEDAGOGY_SNAPSHOT.json');

function currentScores() {
  const out = execSync('node scripts/pedagogy-eval.js --json', { encoding: 'utf8' });
  const data = JSON.parse(out);
  const perLevel = {};
  for (const [key, v] of Object.entries(data.levels)) perLevel[key] = v.avgPct;
  // Match the evaluator's own global = average across all sets (not across levels).
  const pctSum = data.sets.reduce((s, r) => s + r.pct, 0);
  const global = data.sets.length ? Math.round(pctSum / data.sets.length) : 0;
  return { global, perLevel, setsCount: data.sets.length };
}

function currentPlaceholders() {
  const out = execSync('node scripts/find-disconnected.js --json', { encoding: 'utf8' });
  const data = JSON.parse(out);
  return {
    templates: data.templates.length,
    affected: data.templates.reduce((s, t) => s + t.count, 0),
  };
}

function snapshotNow() {
  return {
    timestamp: new Date().toISOString(),
    scores: currentScores(),
    placeholders: currentPlaceholders(),
  };
}

function printDelta(baseline, current) {
  const symbol = delta =>
    delta > 0 ? c(`+${delta}`, GREEN) :
    delta < 0 ? c(`${delta}`, delta <= DROP_THRESHOLD ? BOLD + RED : RED) :
    c(`0`, GRAY);

  console.log(c('\n📊 PEDAGOGY SNAPSHOT DELTA', BOLD + CYAN));
  console.log(c(`Baseline: ${baseline.timestamp}`, GRAY));
  console.log(c(`Now:      ${current.timestamp}\n`, GRAY));

  const gDelta = current.scores.global - baseline.scores.global;
  console.log(c(`Global pedagogy: ${baseline.scores.global}% → ${current.scores.global}%  (${symbol(gDelta)})`, BOLD));

  const pDelta = baseline.placeholders.affected - current.placeholders.affected;
  console.log(c(`Placeholder-affected exercises: ${baseline.placeholders.affected} → ${current.placeholders.affected}  (${symbol(pDelta)} fewer)\n`, BOLD));

  const levels = new Set([...Object.keys(baseline.scores.perLevel), ...Object.keys(current.scores.perLevel)]);
  const rows = [];
  for (const l of levels) {
    const b = baseline.scores.perLevel[l];
    const n = current.scores.perLevel[l];
    if (b == null) rows.push({ level: l, b: '—', n, d: null, note: 'new' });
    else if (n == null) rows.push({ level: l, b, n: '—', d: null, note: 'removed' });
    else if (b !== n) rows.push({ level: l, b, n, d: n - b });
  }
  rows.sort((a, b) => (a.d ?? 0) - (b.d ?? 0));

  if (!rows.length) { console.log(c('Per-level scores unchanged.', GREEN)); }
  else {
    console.log(c('Per-level changes:', BOLD));
    for (const r of rows) {
      const delta = r.d == null ? c(`(${r.note})`, CYAN) : symbol(r.d);
      console.log(`  ${r.level.padEnd(16)} ${String(r.b).padStart(4)}% → ${String(r.n).padStart(4)}%  ${delta}`);
    }
  }

  const regressions = rows.filter(r => r.d != null && r.d <= DROP_THRESHOLD);
  if (regressions.length) {
    console.log(c(`\n❌ ${regressions.length} level(s) dropped ≥${-DROP_THRESHOLD}pp (threshold exceeded)`, BOLD + RED));
    return 1;
  }
  return 0;
}

function main() {
  const now = snapshotNow();

  if (SAVE || !fs.existsSync(SNAPSHOT)) {
    fs.writeFileSync(SNAPSHOT, JSON.stringify(now, null, 2), 'utf8');
    console.log(c(`\n✅ Baseline written to PEDAGOGY_SNAPSHOT.json`, GREEN));
    console.log(c(`   Global: ${now.scores.global}%  ·  placeholder-affected: ${now.placeholders.affected}`, CYAN));
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const code = printDelta(baseline, now);
  process.exit(code);
}

main();
