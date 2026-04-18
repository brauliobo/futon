#!/usr/bin/env node
// One-screen pedagogy health check. Runs pedagogy-eval, find-disconnected,
// and find-answer-bias in JSON mode and renders a compact summary with
// snapshot delta. For CI / daily review / pre-commit.
//
// Usage:
//   node scripts/pedagogy-dashboard.js           # summary
//   node scripts/pedagogy-dashboard.js --strict  # exit 1 if global < 85 or any
//                                                # regression vs snapshot

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;
const STRICT = process.argv.includes('--strict');

function runJson(cmd) {
  return JSON.parse(execSync(cmd, { encoding: 'utf8' }));
}

const ped = runJson('node scripts/pedagogy-eval.js --json');
const disc = runJson('node scripts/find-disconnected.js --json');
const bias = runJson('node scripts/find-answer-bias.js --json');

const global = Math.round(ped.sets.reduce((s, r) => s + r.pct, 0) / ped.sets.length);
const below70 = ped.sets.filter(r => r.pct < 70).length;
const below85 = ped.sets.filter(r => r.pct < 85).length;
const excellent = ped.sets.filter(r => r.pct >= 85).length;
const top90 = ped.sets.filter(r => r.pct >= 90).length;
const top95 = ped.sets.filter(r => r.pct >= 95).length;
const top100 = ped.sets.filter(r => r.pct >= 100).length;

const placeholderSets = disc.templates.length;
const placeholderAffected = disc.templates.reduce((s, t) => s + t.count, 0);

const biasedSets = bias.filter(b => b.dominantPct >= 0.7).length;
const anyBias = bias.length;

const snapshotPath = path.join(process.cwd(), 'PEDAGOGY_SNAPSHOT.json');
let delta = null;
if (fs.existsSync(snapshotPath)) {
  const snap = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  delta = {
    global: global - snap.scores.global,
    affected: placeholderAffected - snap.placeholders.affected,
    regressions: Object.entries(snap.scores.perLevel)
      .map(([k, v]) => ({ k, delta: (ped.levels[k]?.avgPct ?? v) - v }))
      .filter(r => r.delta <= -3),
  };
}

// ── Render ──────────────────────────────────────────────────────────────────

const scoreColor = v => v >= 85 ? GREEN : v >= 70 ? YELLOW : RED;
const sign = n => n > 0 ? c(`+${n}`, GREEN) : n < 0 ? c(`${n}`, RED) : c('0', GRAY);
const pct = n => c(`${n}%`, scoreColor(n));

console.log(c('\n🩺 FUTON PEDAGOGY DASHBOARD', BOLD + CYAN));
console.log(c('─'.repeat(60), GRAY));
console.log(`  Global score          ${pct(global)} ${delta ? `(${sign(delta.global)} vs snapshot)` : ''}`);
console.log(`  Sets evaluated        ${c(ped.sets.length, BOLD)} across ${c(Object.keys(ped.levels).length, BOLD)} levels`);
console.log(`  Excellent (≥85%)      ${c(excellent, GREEN)}`);
console.log(`  Acceptable (70-84%)   ${c(ped.sets.length - excellent - below70, YELLOW)}`);
console.log(`  Needs rework (<70%)   ${c(below70, below70 ? RED : GREEN)}`);
console.log(c('\n  Quality tiers', BOLD));
console.log(`  Top-tier (≥95%)       ${c(top95, GREEN)}  ${c(`(${Math.round(100 * top95 / ped.sets.length)}% of sets)`, GRAY)}`);
console.log(`  High (≥90%)           ${c(top90, GREEN)}  ${c(`(${Math.round(100 * top90 / ped.sets.length)}% of sets)`, GRAY)}`);
console.log(`  Perfect (100%)        ${c(top100, top100 ? GREEN : GRAY)}`);
console.log(c('\n  Content signals', BOLD));
console.log(`  Placeholder templates ${c(placeholderSets, placeholderSets ? YELLOW : GREEN)} (affecting ${c(placeholderAffected, placeholderAffected ? YELLOW : GREEN)} exercises)`);
console.log(`  Biased choice sets    ${c(biasedSets, biasedSets ? YELLOW : GREEN)} authored, ${c('neutralized at runtime', GRAY)}`);

if (delta?.regressions.length) {
  console.log(c('\n  ❌ Regressions since snapshot:', BOLD + RED));
  for (const r of delta.regressions.slice(0, 5)) {
    console.log(`    ${r.k.padEnd(16)} ${sign(r.delta)} pp`);
  }
}

console.log(c('\n  Top 5 levels needing work', BOLD));
const byLevel = Object.entries(ped.levels)
  .map(([k, v]) => ({ k, ...v }))
  .sort((a, b) => a.avgPct - b.avgPct)
  .slice(0, 5);
for (const { k, avgPct, sets } of byLevel) {
  console.log(`    ${k.padEnd(16)} ${pct(avgPct)}  (${sets} sets)`);
}

console.log(c('\n' + '─'.repeat(60), GRAY));
const ok = global >= 85 && !(STRICT && delta?.regressions.length);
console.log(c(ok ? '✅ Healthy' : '⚠️  Review needed', BOLD + (ok ? GREEN : YELLOW)));
process.exit(STRICT && !ok ? 1 : 0);
