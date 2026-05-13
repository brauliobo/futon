#!/usr/bin/env node
// Answer-position bias scanner. Choices in Futon render in YAML order (no
// runtime shuffle), so if one position consistently holds the correct answer
// students learn to pick it without reading — a classic Kumon-breaking bug.
//
// For each set, computes the % of choice exercises whose correct answer sits
// at each position (0=first, 1=second, ...). Flags sets where:
//   - one position carries ≥50% of answers (strong bias), OR
//   - any position carries 0% when 3+ positions exist (unused position).
//
// Usage:
//   node scripts/find-answer-bias.js                          # repo scan
//   node scripts/find-answer-bias.js --subject portuguese
//   node scripts/find-answer-bias.js --min-choices 6          # only flag sets with ≥6 choice exercises
//   node scripts/find-answer-bias.js --json

import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { parse } from 'yaml';
import { asText } from './lib/i18n.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SUBJECT = argVal('--subject');
const LEVEL = argVal('--level');
const MIN_CHOICES = parseInt(argVal('--min-choices') || '5', 10);
const JSON_OUT = args.includes('--json');
import { SUBJECTS as ALL_SUBJECTS } from './lib/subjects.js';
const SUBJECTS = SUBJECT ? [SUBJECT] : ALL_SUBJECTS;

// Reject parens containing "?" (fill-in-the-blank math like "(3/?)") since
// those aren't real multi-choice lists — same guard as pedagogy-eval.
const CHOICE_RE = /\(([^)?]+\/[^)?]+)\)\s*$/;
// Exact match (trimmed only). Neither case-folding nor accent-stripping:
// portuguese/1A teaches uppercase-vs-lowercase letter recognition
// ('C' vs 'c'), and accents ('a' vs 'à'). Normalizing either collapses
// distinct choices and produces false 100%-bias reports.
const norm = s => asText(s).trim();

function choicesOf(ex) {
  if (Array.isArray(ex.choices)) return ex.choices;
  const m = CHOICE_RE.exec(asText(ex.question));
  return m ? m[1].split('/').map(s => s.trim()) : null;
}

function loadAll() {
  const sets = [];
  for (const subject of SUBJECTS) {
    const dir = path.join(process.cwd(), 'src', 'levels', subject);
    if (!fs.existsSync(dir)) continue;
    for (const level of fs.readdirSync(dir).sort()) {
      if (LEVEL && level !== LEVEL) continue;
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

function analyzeSet(set) {
  const positions = new Map(); // choiceCount → position → count
  let totalChoice = 0;
  for (const p of set.pages || []) {
    for (const ex of p.exercises || []) {
      const ch = choicesOf(ex);
      if (!ch || ch.length < 2) continue;
      const a = norm(ex.correctAnswer);
      const idx = ch.findIndex(c => norm(c) === a);
      if (idx < 0) continue;
      totalChoice++;
      const key = ch.length;
      const bucket = positions.get(key) || new Array(key).fill(0);
      bucket[idx]++;
      positions.set(key, bucket);
    }
  }
  if (totalChoice < MIN_CHOICES) return null;

  const issues = [];
  let dominantPct = 0;
  for (const [k, counts] of positions) {
    const sum = counts.reduce((a, b) => a + b, 0);
    if (sum < 3) continue;
    const max = Math.max(...counts);
    const pct = max / sum;
    // Small-sample exemption: with only 4-5 exercises in a choice-count
    // bucket, a 3/1 or 4/1 split is the arithmetic minimum for "not
    // perfectly balanced" and not evidence of authoring bias. Only let
    // pct contribute to the severity score when sum ≥ 6.
    if (sum >= 6 && pct > dominantPct) dominantPct = pct;
    if (pct >= 0.5) {
      const winner = counts.indexOf(max);
      issues.push(`${k}-choice: ${Math.round(pct * 100)}% at position ${winner + 1} (${counts.join('/')})`);
    } else if (k >= 3 && counts.some(v => v === 0)) {
      const zero = counts.map((v, i) => v === 0 ? i + 1 : null).filter(v => v !== null);
      issues.push(`${k}-choice: position(s) ${zero.join(',')} unused (${counts.join('/')})`);
    }
  }
  return { totalChoice, positions: Object.fromEntries(positions), issues, dominantPct };
}

function main() {
  const sets = loadAll();
  const flagged = [];
  for (const s of sets) {
    const a = analyzeSet(s);
    if (!a || !a.issues.length) continue;
    flagged.push({ file: `${s.subject}/${s.level}/${s._file}`, ...a });
  }

  if (JSON_OUT) { console.log(JSON.stringify(flagged, null, 2)); return; }

  console.log(c('\n🎯 ANSWER-POSITION BIAS SCANNER', BOLD + CYAN));
  console.log(c(`Scanned sets with ≥${MIN_CHOICES} choice exercises · flagged ${flagged.length}\n`, CYAN));

  if (!flagged.length) { console.log(c('✅ No biased answer-position distributions.', GREEN)); return; }

  flagged.sort((a, b) => b.dominantPct - a.dominantPct);
  const t = new Table({
    head: ['FILE', 'CHOICE EX', 'ISSUE'].map(h => c(h, BOLD)),
    style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
    colWidths: [38, 11, 80], wordWrap: true,
  });
  for (const f of flagged.slice(0, 40)) {
    const sev = f.dominantPct >= 0.7 ? RED : YELLOW;
    t.push([f.file, f.totalChoice, c(f.issues.join('; '), sev)]);
  }
  console.log(t.toString());
  if (flagged.length > 40) console.log(c(`  ... and ${flagged.length - 40} more`, GRAY));

  const severe = flagged.filter(f => f.dominantPct >= 0.7).length;
  console.log(c(`\n${severe} set(s) with strong bias (≥70% at one position)`, severe ? YELLOW : GREEN));
  console.log(c('  Note: Shuffle.withSeed() randomizes choice order at render time —', GRAY));
  console.log(c('  this scan is advisory (content-review aid), not a learner-facing bug.', GRAY));
  // Advisory — content-side bias is neutralized at runtime by Shuffle.js, so we
  // exit 0 regardless. The data is still useful for content reviewers who want
  // to see whether distractor variety reads naturally in YAML.
  process.exit(0);
}

main();
