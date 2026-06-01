#!/usr/bin/env node
// Cross-set question duplication detector. Finds identical or near-identical
// questions appearing in multiple sets within the same level. Some recurrence
// is pedagogically valid (spaced review), but heavy duplication across many
// sets weakens the progression.
//
// Reports:
//  - Exact-duplicate questions (same normalized text) appearing in N+ sets
//  - Per-level duplicate density (what % of questions repeat elsewhere)
//
// Exit code 0 on healthy, 1 if any level exceeds the duplication threshold.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { asText } from './lib/i18n.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m';
const c = (t, col) => `${col}${t}${RESET}`;

// Normalize a question for dedup: strip choices parenthetical, whitespace,
// punctuation, and case. Keep the core prompt.
const normalize = s => asText(s)
  .replace(/\([^)]*\/[^)]*\)\s*$/, '') // strip (a/b/c/d) trailing choices
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  // questionText → [{level, set, answer}]
  const byQ = new Map();
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const levelKey = f.match(/src\/levels\/([^/]+)\/([^/]+)\//).slice(1).join('/');
    const setName = f.split('/').pop();
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const q = normalize(e.question);
        if (!q || q.length < 4) continue;
        if (!byQ.has(q)) byQ.set(q, []);
        byQ.get(q).push({ level: levelKey, set: setName, answer: e.correctAnswer });
      }
    }
  }

  // Within-level duplicates: same question in 2+ sets of the same level
  const levelDupes = {}; // levelKey → [{q, count, sets}]
  for (const [q, occs] of byQ) {
    const byLevel = {};
    for (const o of occs) (byLevel[o.level] ||= []).push(o);
    for (const [lvl, list] of Object.entries(byLevel)) {
      const sets = new Set(list.map(o => o.set));
      if (sets.size >= 2) {
        (levelDupes[lvl] ||= []).push({ q, count: sets.size, sets: [...sets] });
      }
    }
  }

  console.log(c('\n🔁 CROSS-SET QUESTION DUPLICATION', BOLD));
  const levels = Object.keys(levelDupes).sort();
  if (!levels.length) {
    console.log(c('  ✅ No within-level cross-set duplicates found.', GREEN));
    process.exit(0);
  }

  // practice arithmetic drill levels (1A-D math, 1A-2A basic portuguese, all
  // japanese kana) intentionally repeat questions for automaticity — a
  // 20% recurrence rate is THE METHOD. Language/reading subjects should
  // have less repetition (varied practice).
  const mathThreshold = 0.25;
  const otherThreshold = 0.15;
  const thresholdFor = lvl => lvl.startsWith('math/') ? mathThreshold : otherThreshold;

  let worstRatio = 0; // density / its threshold
  for (const lvl of levels) {
    const dupes = levelDupes[lvl].sort((a, b) => b.count - a.count);
    const totalDupQs = dupes.length;
    const totalQs = [...byQ.values()].flat().filter(o => o.level === lvl).length;
    const density = totalQs ? totalDupQs / totalQs : 0;
    const threshold = thresholdFor(lvl);
    const ratio = density / threshold;
    if (ratio > worstRatio) worstRatio = ratio;
    const color = ratio > 1.0 ? RED : ratio > 0.5 ? YELLOW : GREEN;
    console.log(c(`\n${lvl}`, BOLD) + `  ${c(totalDupQs, color)} dup questions across ${totalQs} total (${c(Math.round(density*100)+'%', color)}, threshold ${Math.round(threshold*100)}%)`);
    for (const d of dupes.slice(0, 3)) {
      console.log(`    x${d.count} ${d.sets.slice(0, 3).join(', ')}${d.sets.length > 3 ? '…' : ''}`);
      console.log(c(`       "${d.q.slice(0, 80)}"`, '\x1b[90m'));
    }
    if (dupes.length > 3) console.log(c(`    … and ${dupes.length - 3} more`, '\x1b[90m'));
  }

  console.log('\n' + '─'.repeat(60));
  if (worstRatio > 1.0) {
    console.log(c(`⚠️  Some level exceeds its duplication threshold — review curriculum progression.`, YELLOW));
    process.exit(1);
  }
  console.log(c(`✅ All levels under their duplication threshold (math ≤${Math.round(mathThreshold*100)}%, other ≤${Math.round(otherThreshold*100)}%).`, GREEN));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
