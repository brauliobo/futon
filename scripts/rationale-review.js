#!/usr/bin/env node
// Per-exercise rationale drill-down. Given a set file (or subject/level), lists
// each exercise with its rationale category so reviewers can target rewrites.
// Usage:
//   node scripts/rationale-review.js <path/to/set.yaml>
//   node scripts/rationale-review.js --subject portuguese --level C
//   node scripts/rationale-review.js --subject math --level B --only restatement,missing,short

import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { parse } from 'yaml';
import { categorize } from './lib/rationale.js';
import { localize, asText } from './lib/i18n.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SUBJECT = argVal('--subject');
const LEVEL = argVal('--level');
const ONLY = (argVal('--only') || '').split(',').filter(Boolean);
const positional = args.filter(a => !a.startsWith('--') && !['--subject', '--level', '--only'].includes(args[args.indexOf(a) - 1]));
const SINGLE_FILE = positional[0];

const CAT_COLORS = {
  method: GREEN, generic: YELLOW, missing: RED, short: RED, long: YELLOW, restatement: RED,
};

function loadOne(file) {
  const raw = localize(parse(fs.readFileSync(file, 'utf8')));
  return { ...raw, _file: path.basename(file), _path: file };
}

function loadDir() {
  const root = process.cwd();
  const subjects = SUBJECT ? [SUBJECT] : ['math', 'portuguese', 'english', 'japanese', 'spanish', 'biology'];
  const sets = [];
  for (const subject of subjects) {
    const dir = path.join(root, 'src', 'levels', subject);
    if (!fs.existsSync(dir)) continue;
    for (const level of fs.readdirSync(dir).sort()) {
      if (LEVEL && level !== LEVEL) continue;
      const ld = path.join(dir, level);
      if (!fs.statSync(ld).isDirectory()) continue;
      for (const file of fs.readdirSync(ld).filter(f => /\.ya?ml$/.test(f)).sort()) {
        try { sets.push({ ...loadOne(path.join(ld, file)), subject, level }); }
        catch { /* validate-sets reports */ }
      }
    }
  }
  return sets;
}

function auditSet(set) {
  const rows = [];
  const counts = { method: 0, generic: 0, missing: 0, short: 0, long: 0, restatement: 0 };
  for (const page of set.pages || []) {
    for (const ex of page.exercises || []) {
      const cat = categorize(ex.rationale);
      counts[cat]++;
      if (ONLY.length && !ONLY.includes(cat)) continue;
      rows.push({
        page: page.pageNumber,
        question: asText(ex.question).slice(0, 60),
        answer: asText(ex.correctAnswer).slice(0, 20),
        rationale: asText(ex.rationale).slice(0, 80),
        cat,
      });
    }
  }
  return { set, rows, counts };
}

function printAudit(audit) {
  const { set, rows, counts } = audit;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const header = `${set.subject || ''}/${set.level || ''}/${set._file}`;
  const methodPct = total ? Math.round(100 * counts.method / total) : 0;
  const headColor = methodPct >= 70 ? GREEN : methodPct >= 40 ? YELLOW : RED;
  console.log(c(`\n📝 ${header}`, BOLD + CYAN));
  const tally = Object.entries(counts).filter(([, v]) => v).map(([k, v]) => c(`${k}:${v}`, CAT_COLORS[k] || '')).join(' · ');
  console.log(`  ${tally}  ${c(`· method ${methodPct}%`, BOLD + headColor)}`);
  if (!rows.length) { console.log(c('  (no rows match filter)', GRAY)); return; }

  const t = new Table({
    head: ['p', 'CAT', 'QUESTION', 'ANSWER', 'RATIONALE'].map(h => c(h, BOLD)),
    style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
    colWidths: [3, 12, 42, 16, 60], wordWrap: true,
  });
  for (const r of rows) {
    t.push([r.page, c(r.cat, CAT_COLORS[r.cat] || ''), r.question, r.answer, r.rationale || c('—', GRAY)]);
  }
  console.log(t.toString());
}

function main() {
  const sets = SINGLE_FILE ? [loadOne(SINGLE_FILE)] : loadDir();
  if (!sets.length) { console.error('No sets found'); process.exit(1); }

  const audits = sets.map(auditSet);

  if (audits.length === 1) {
    printAudit(audits[0]);
    return;
  }

  // Summary across multiple sets
  console.log(c(`\n📋 RATIONALE REVIEW — ${audits.length} sets`, BOLD + CYAN));
  const summary = new Table({
    head: ['SET', 'TOTAL', 'METHOD%', 'MISSING', 'RESTATEMENT', 'SHORT', 'LONG', 'GENERIC'].map(h => c(h, BOLD)),
    style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
  });
  const byPct = [...audits].sort((a, b) => {
    const ta = Object.values(a.counts).reduce((x, y) => x + y, 0);
    const tb = Object.values(b.counts).reduce((x, y) => x + y, 0);
    return (a.counts.method / ta) - (b.counts.method / tb);
  });
  for (const a of byPct) {
    const tot = Object.values(a.counts).reduce((x, y) => x + y, 0);
    const pct = tot ? Math.round(100 * a.counts.method / tot) : 0;
    const col = pct >= 70 ? GREEN : pct >= 40 ? YELLOW : RED;
    summary.push([
      `${a.set.subject}/${a.set.level}/${a.set._file}`,
      tot, c(`${pct}%`, col),
      a.counts.missing || '', a.counts.restatement || '',
      a.counts.short || '', a.counts.long || '', a.counts.generic || '',
    ]);
  }
  console.log(summary.toString());
  console.log(c('\nPass a single file path to drill into exercise-level rows.', CYAN));
  console.log(c('Filter with --only missing,restatement,short to focus the rewrite list.', CYAN));
}

main();
