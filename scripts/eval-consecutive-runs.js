#!/usr/bin/env node
// Consecutive-answer-run detector. Flags sets where 4+ exercises in a row
// share the same correctAnswer, which lets a student pattern-spot rather
// than evaluate each exercise on its own merits.
//
// Filters (all legitimate Kumon patterns — skipped, not flagged):
//   - Constant-drill sets (≥70% of answers are the same).
//   - Japanese kana drills — repetition is the pedagogy.
//   - Sets with <4 distinct answer values (constant-drill variants).
//   - Drill-level math (1A-7A) — arithmetic automaticity clusters are expected.
//   - Focused-page runs: the whole run fits inside one page AND that page is
//     mostly (≥60%) the same answer value. That's a focused-drill page (e.g.
//     "n - n = 0" page, "sen²+cos² = 1" page).
//
// Advisory only — exit 0 always.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { asText } from './lib/i18n.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const RUN_CEILING = 4;

const DRILL_SKIP = /\/math\/(1A|2A|3A|4A|5A|6A|7A)\//;

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const hits = [];
  for (const f of files) {
    if (f.includes('/japanese/')) continue;
    if (DRILL_SKIP.test(f)) continue;
    const s = YAML.parse(readFileSync(f, 'utf8'));
    // Build flat answers AND page-index per answer position, to tell whether
    // a run stays within one page (focused-drill) or crosses pages.
    const answers = [];
    const pageIdx = [];
    (s.pages || []).forEach((p, pi) => {
      (p.exercises || []).forEach(e => {
        const a = asText(e.correctAnswer).trim();
        if (a) { answers.push(a); pageIdx.push(pi); }
      });
    });
    if (answers.length < 10) continue;
    const uniq = new Set(answers);
    if (uniq.size < 4) continue;
    const counts = new Map();
    for (const a of answers) counts.set(a, (counts.get(a) || 0) + 1);
    const maxCount = Math.max(...counts.values());
    if (maxCount / answers.length >= 0.7) continue;

    let maxRun = 1, curRun = 1, runAns = answers[0];
    let bestStart = 0;
    for (let i = 1; i < answers.length; i++) {
      if (answers[i] === answers[i - 1]) {
        curRun++;
        if (curRun > maxRun) {
          maxRun = curRun;
          bestStart = i - curRun + 1;
          runAns = answers[i];
        }
      } else curRun = 1;
    }
    if (maxRun < RUN_CEILING) continue;

    // Focused-page filter: run fits inside one page AND ≥60% of that page's
    // answers match the run value → legitimate focused-drill page, skip.
    const runEnd = bestStart + maxRun - 1;
    if (pageIdx[bestStart] === pageIdx[runEnd]) {
      const pi = pageIdx[bestStart];
      const pageAnswers = answers.filter((_, i) => pageIdx[i] === pi);
      const pageMatch = pageAnswers.filter(a => a === runAns).length;
      if (pageMatch / pageAnswers.length >= 0.6) continue;
    }
    // Cross-page focused-drill filter: when the same answer value
    // accounts for ≥30% of the entire set (e.g. trig identities that
    // simplify to coefficient 1), runs of that value across pages are
    // pedagogy-driven, not pattern-spotting cues.
    const runAnsCount = counts.get(runAns) || 0;
    if (runAnsCount / answers.length >= 0.25) continue;

    hits.push({ f: f.replace('src/levels/', ''), maxRun, start: bestStart, ans: runAns, total: answers.length });
  }

  console.log(c('\n↔ CONSECUTIVE-ANSWER RUNS', BOLD));
  console.log(`  Checked ${files.length} sets (excl. japanese, constant-drill, <10 exercises).`);
  console.log(`  Flag: ≥${RUN_CEILING} consecutive exercises with the same correct answer.\n`);

  if (!hits.length) {
    console.log(c('  ✅ No long consecutive-answer runs.', GREEN));
    process.exit(0);
  }
  hits.sort((a, b) => b.maxRun - a.maxRun);
  console.log(c(`  ⚠️  ${hits.length} set(s) with long runs:`, YELLOW));
  for (const h of hits.slice(0, 20)) {
    const col = h.maxRun >= 8 ? RED : YELLOW;
    console.log(`    ${h.f.padEnd(32)}  ${c('run×' + h.maxRun, col)} of ${h.total}  ${c(`(starts @${h.start+1}, ans="${h.ans.slice(0, 20)}")`, GRAY)}`);
  }
  if (hits.length > 20) console.log(c(`    … and ${hits.length - 20} more`, GRAY));
  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix options:', YELLOW));
  console.log(`  - Reorder exercises within a page so consecutive answers differ`);
  console.log(`  - Insert distractor-answer exercises between the run to break pattern`);
  console.log(`  - Advisory: exit 0 regardless.`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
