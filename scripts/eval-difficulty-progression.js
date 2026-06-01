#!/usr/bin/env node
// Difficulty progression evaluator. small-step doctrine expects per-page
// difficulty to trend upward across a set (with exceptions for constant-drill
// and consolidation-review patterns the rubric already recognizes). This
// script flags:
//
//   - Noisy: ≥3 page-to-page regressions in a ≥5-page set (student goes
//     back-and-forth between harder and easier rather than climbing).
//   - Regressive: median difficulty of last page < first page (the set
//     ends easier than it began — a structural authoring error).
//
// Constant-drill sets (all pages same difficulty) are ignored — that's a
// legitimate practice pattern for automaticity practice.
//
// Advisory only — exit 0 always. mastery pedagogy tolerates some variance so
// this is surfaced for manual review, not blocked at the gate.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const median = arr => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
};

// Automaticity-drill levels: exercises within a set are intentionally
// interchangeable and per-exercise `difficulty` is noise, so page-level
// progression analysis produces false positives. mastery doctrine says these
// levels test speed+accuracy, not climbing difficulty.
const DRILL_LEVELS = new Set([
  'math/1A', 'math/2A', 'math/3A', 'math/4A',
  'math/5A', 'math/6A', 'math/7A',
  'math/A', 'math/B', 'math/C', // arithmetic-fact automaticity
  'japanese/4A', // hiragana drill
]);

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const noisy = [], regressive = [];
  for (const f of files) {
    const m = f.match(/src\/levels\/([^/]+)\/([^/]+)\//);
    const levelKey = m ? `${m[1]}/${m[2]}` : '';
    if (DRILL_LEVELS.has(levelKey)) continue;
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const pages = (s.pages || []).filter(p => (p.exercises || []).length);
    if (pages.length < 5) continue;
    const difficulties = pages.map(p =>
      median(p.exercises.map(e => e.difficulty || s.difficulty || 3))
    );
    const range = Math.max(...difficulties) - Math.min(...difficulties);
    if (range === 0) continue; // constant-drill — legitimate
    let regCount = 0, advCount = 0;
    for (let i = 1; i < difficulties.length; i++) {
      if (difficulties[i] < difficulties[i - 1]) regCount++;
      else if (difficulties[i] > difficulties[i - 1]) advCount++;
    }
    // Interleaved-drill pattern: small overall range (≤1.0) with roughly
    // balanced ups and downs — practice alternates drill/intro deliberately.
    // Don't flag it.
    const interleaved = range <= 1.0 && Math.abs(regCount - advCount) <= 1;
    const first = difficulties[0], last = difficulties[difficulties.length - 1];
    if (last < first && (last - first) <= -1.0) {
      regressive.push({ f, difficulties, first, last });
    } else if (regCount >= 3 && !interleaved) {
      noisy.push({ f, difficulties, regCount });
    }
  }

  console.log(c('\n📈 DIFFICULTY PROGRESSION', BOLD));
  console.log(`  Checked ${files.length} sets (≥5 pages, non-flat).`);
  console.log(`  Noisy: ≥3 page-to-page regressions. Regressive: last page < first page.\n`);

  if (!noisy.length && !regressive.length) {
    console.log(c('  ✅ Every set has a monotonic-enough progression.', GREEN));
    process.exit(0);
  }

  if (regressive.length) {
    console.log(c(`  ⚠️  ${regressive.length} regressive set(s) (last page easier than first):`, YELLOW));
    regressive.sort((a, b) => (a.last - a.first) - (b.last - b.first));
    for (const r of regressive.slice(0, 15)) {
      console.log(`    ${c('↘', RED)} ${r.f.replace('src/levels/', '').padEnd(32)} ${c('[' + r.difficulties.join(',') + ']', GRAY)}  ${c(r.first + '→' + r.last, RED)}`);
    }
    if (regressive.length > 15) console.log(c(`    … and ${regressive.length - 15} more`, GRAY));
    console.log('');
  }

  if (noisy.length) {
    console.log(c(`  ⚠️  ${noisy.length} noisy set(s) (≥3 regressions page-to-page):`, YELLOW));
    noisy.sort((a, b) => b.regCount - a.regCount);
    for (const n of noisy.slice(0, 15)) {
      console.log(`    ${c('〰', YELLOW)} ${n.f.replace('src/levels/', '').padEnd(32)} ${c('[' + n.difficulties.join(',') + ']', GRAY)}  ${c(n.regCount + ' reg', YELLOW)}`);
    }
    if (noisy.length > 15) console.log(c(`    … and ${noisy.length - 15} more`, GRAY));
  }

  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix options:', YELLOW));
  console.log(`  - Regressive: renumber difficulty so last page ≥ first page, or reorder pages`);
  console.log(`  - Noisy: smooth out dips — a page should rarely be easier than the one before`);
  console.log(`  - Advisory: exit 0 regardless.`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
