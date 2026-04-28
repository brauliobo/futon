#!/usr/bin/env node
// Schema-driven validation for all sets. Reports structural errors, duplicate
// exercises, and near-duplicate sets within each level.

import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { parse } from 'yaml';
import { validate as validateSchema } from '../src/domain/schema/setSchema.js';
import { familyOf } from '../src/domain/schema/exerciseTypes.js';
import SetModel from '../src/domain/Set.js';
import { SkillTree } from '../src/domain/SkillTree.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', BLUE = '\x1b[34m', CYAN = '\x1b[36m';
const c = (text, color) => `${color}${text}${RESET}`;
const tableStyle = { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 };

const SUBJECTS = ['math', 'portuguese', 'english', 'japanese', 'spanish'];

// Build level→theme map per subject for coverage checks
const themeIndex = Object.fromEntries(SUBJECTS.map(s => {
  const nodes = SkillTree.forSubject(s);
  const map = {};
  nodes.forEach(n => n.levels.forEach(lvl => { map[lvl] = n.id; }));
  return [s, map];
}));

function loadAll(rootDir) {
  const all = [];
  for (const subject of SUBJECTS) {
    const subjectDir = path.join(rootDir, 'src', 'levels', subject);
    if (!fs.existsSync(subjectDir)) continue;
    for (const level of fs.readdirSync(subjectDir)) {
      const levelDir = path.join(subjectDir, level);
      if (!fs.statSync(levelDir).isDirectory()) continue;
      for (const file of fs.readdirSync(levelDir).filter(f => /\.ya?ml$/.test(f))) {
        const filePath = path.join(levelDir, file);
        try {
          const raw = parse(fs.readFileSync(filePath, 'utf8'));
          all.push({ ...raw, subject, level, sourceFile: file, filePath });
        } catch (err) {
          all.push({ subject, level, sourceFile: file, filePath, parseError: err.message });
        }
      }
    }
  }
  return all;
}

function normalizeQuestion(q) {
  return String(q || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Bounded Ukkonen levenshtein: returns Infinity once distance exceeds `max`.
// Skips comparison entirely when length difference already exceeds the cap.
function boundedLevenshtein(a, b, max) {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > max) return Infinity;
  if (!la || !lb) return Math.max(la, lb);
  let prev = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    const cur = new Array(lb + 1);
    cur[0] = i;
    const lo = Math.max(1, i - max), hi = Math.min(lb, i + max);
    let rowMin = cur[0];
    for (let j = 1; j < lo; j++) cur[j] = Infinity;
    for (let j = lo; j <= hi; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    for (let j = hi + 1; j <= lb; j++) cur[j] = Infinity;
    if (rowMin > max) return Infinity;
    prev = cur;
  }
  return prev[lb];
}

function nearDupRatio(sets) {
  // Language/reading only: near-dup question strings indicate copy-paste templates.
  // Drill families (math arithmetic) are exempt — "2+3=" and "2+4=" are legitimate variety.
  const pairs = sets.flatMap(s => (s.pages || []).flatMap(p => (p.exercises || []).map(e => ({
    question: normalizeQuestion(e.question),
    family: familyOf(e.type),
  }))));
  const relevant = pairs.filter(p => p.family && p.family !== 'drill');
  if (relevant.length < 2) return 0;
  // Index by question length so we only compare strings within ±max chars.
  // This drops the O(n²) cost to ~O(n × bucket_size) for typical content.
  const exact = new Set();
  const byLen = new Map(); // len → string[]
  let dup = 0;
  for (const { question: q } of relevant) {
    if (!q) continue;
    if (exact.has(q)) { dup++; continue; }
    if (q.length <= 8) { exact.add(q); continue; }
    const max = Math.min(3, Math.floor(q.length * 0.15));
    let hit = false;
    for (let l = q.length - max; l <= q.length + max && !hit; l++) {
      const bucket = byLen.get(l);
      if (!bucket) continue;
      for (const s of bucket) {
        if (boundedLevenshtein(q, s, max) <= max) { hit = true; break; }
      }
    }
    if (hit) dup++;
    else {
      exact.add(q);
      const arr = byLen.get(q.length);
      if (arr) arr.push(q); else byLen.set(q.length, [q]);
    }
  }
  return +(dup / relevant.length).toFixed(3);
}

function validateSet(raw) {
  if (raw.parseError) return { raw, issues: [`Parse error: ${raw.parseError}`], warnings: [], exercises: 0, pages: 0, randomness: null };
  const { valid, errors } = validateSchema(raw);
  const issues = valid ? [] : errors;
  const warnings = [];

  const model = new SetModel(raw);
  const { total, duplicates } = model.countExercises();
  const randomness = model.randomness;

  if (raw.subject === 'math' && !raw.comingSoon) {
    const pages = (raw.pages || []).length;
    // 20-page sets are intentionally tile-doubled for Kumon massed practice;
    // 10-page is the pre-expansion baseline. Anything else is suspicious.
    if (pages !== 10 && pages !== 20) warnings.push(`Expected 10 or 20 pages, found ${pages}`);
    if (total < 90) warnings.push(`Expected ≥90 exercises, found ${total}`);
    // Tiled 20-page sets have ~50% randomness by construction; drill-level
    // Kumon math (1A-7A) repeats facts by design, so allow even lower.
    // Math drill levels (1A-7A pre-reading; A-D arithmetic facts) are pure
    // massed practice — 10 unique exercises repeated many times per set IS
    // the pedagogy. For post-drill levels (E+), expect more variety.
    const level = String(raw.level || '');
    const isDrillLevel = /^[1-7]A$/.test(level) || /^[A-D]$/.test(level);
    // 20-page tiled sets commonly run 15-25% with fact-drill repetition across
    // the tile; only flag below 10% as potential authoring issue.
    const minRand = isDrillLevel ? 0.03 : (pages === 20 ? 0.1 : 0.6);
    if (randomness !== null && randomness < minRand) warnings.push(`Randomness ${Math.round(randomness * 100)}% < ${Math.round(minRand * 100)}%`);
  }
  if (['portuguese', 'english'].includes(raw.subject) && randomness !== null && randomness < 0.5) {
    warnings.push(`Randomness ${Math.round(randomness * 100)}% < 50%`);
  }
  (raw.pages || []).forEach((p, i) => {
    if (p.pageNumber && p.pageNumber !== i + 1) warnings.push(`Page ${i + 1} wrong pageNumber: ${p.pageNumber}`);
    if (!p.exercises?.length) warnings.push(`Page ${i + 1} has no exercises`);
  });
  // Runtime/user state must not be committed in content YAML. Student
  // progress lives in profile storage; stale `progress:` blocks here are
  // test leakage.
  const theme = themeIndex[raw.subject]?.[raw.level];
  if (!theme) issues.push(`No SkillTree theme covers ${raw.subject}/${raw.level} — add a node in SkillTree.js`);

  if (raw.progress !== undefined) {
    issues.push(`Stale "progress" field committed (belongs in profile storage, not content YAML)`);
  }
  // Unknown exercise fields almost always indicate a YAML-parse accident
  // where an unquoted multi-word answer got split at the colon (e.g.
  // `correctAnswer: (3` / `4):` → "(3" and "4)" as separate keys).
  const KNOWN = new Set(['type','question','correctAnswer','rationale','objectives','difficulty','choices','answer']);
  for (const p of raw.pages || []) {
    for (const [eIdx, e] of (p.exercises || []).entries()) {
      const unknown = Object.keys(e).filter(k => !KNOWN.has(k));
      if (unknown.length) {
        issues.push(`Page ${p.pageNumber ?? '?'} exercise ${eIdx + 1}: unknown field(s) ${JSON.stringify(unknown)} — likely YAML-parse accident (quote multi-word correctAnswer).`);
      }
      // Every exercise must carry the core pedagogy triple: rationale
      // (teaches why), difficulty (rubric gradient input), and objectives
      // (progress tracking). Rationale and difficulty backfilled across
      // the corpus in iter 82-104, so this is a regression guard.
      if (!e.rationale) issues.push(`Page ${p.pageNumber ?? '?'} exercise ${eIdx + 1}: missing rationale.`);
      if (e.difficulty === undefined || e.difficulty === null) issues.push(`Page ${p.pageNumber ?? '?'} exercise ${eIdx + 1}: missing difficulty.`);
      if (!Array.isArray(e.objectives) || !e.objectives.length) issues.push(`Page ${p.pageNumber ?? '?'} exercise ${eIdx + 1}: missing objectives.`);
    }
  }

  return { raw, issues, warnings, exercises: total, pages: (raw.pages || []).length, duplicates, randomness };
}

function summarize(results) {
  const grouped = {};
  for (const r of results) {
    const key = `${r.raw.subject}-${r.raw.level}`;
    if (!grouped[key]) grouped[key] = { subject: r.raw.subject, level: r.raw.level, sets: [], issues: 0, warnings: 0, pages: 0, exercises: 0, duplicates: 0, randomnessSum: 0 };
    const g = grouped[key];
    g.sets.push(r);
    g.issues += r.issues.length;
    g.warnings += r.warnings.length;
    g.pages += r.pages;
    g.exercises += r.exercises;
    g.duplicates += r.duplicates || 0;
    if (r.randomness !== null) g.randomnessSum += r.randomness;
  }
  return Object.values(grouped).sort((a, b) => (a.subject + a.level).localeCompare(b.subject + b.level));
}

function printSummary(groups) {
  console.log(c('\n📊 SUMMARY BY DISCIPLINE & LEVEL', BOLD + CYAN));
  const t = new Table({ head: ['SUBJECT', 'LEVEL', 'SETS', 'PAGES', 'EXERCISES', 'ISSUES', 'WARNINGS', 'RANDOM', 'NEAR-DUP'].map(h => c(h, BOLD)), style: tableStyle });
  for (const g of groups) {
    const nearDup = nearDupRatio(g.sets.map(s => s.raw));
    const avgRand = g.sets.length ? g.randomnessSum / g.sets.length : 0;
    t.push([
      g.subject,
      g.level,
      g.sets.length,
      g.pages,
      g.exercises,
      c(g.issues, g.issues ? RED : GREEN),
      c(g.warnings, g.warnings ? YELLOW : GREEN),
      c(`${Math.round(avgRand * 100)}%`, avgRand >= 0.6 ? GREEN : YELLOW),
      c(`${Math.round(nearDup * 100)}%`, nearDup < 0.15 ? GREEN : YELLOW),
    ]);
  }
  console.log(t.toString());
}

function printDetail(results) {
  console.log(c('\n📋 DETAILED SET VALIDATION', BOLD + BLUE));
  const t = new Table({ head: ['#', 'SUBJECT', 'LEVEL', 'TITLE', 'PAGES', 'EX', 'RANDOM', 'STATUS'].map(h => c(h, BOLD)), style: tableStyle, wordWrap: true });
  results.forEach((r, i) => {
    let status = '✅ OK', color = GREEN;
    if (r.issues.length) { status = `❌ ${r.issues.length} errors`; color = RED; }
    else if (r.warnings.length) { status = `⚠️  ${r.warnings.length} warn`; color = YELLOW; }
    const rand = r.randomness === null ? '-' : `${Math.round(r.randomness * 100)}%`;
    t.push([i + 1, r.raw.subject, r.raw.level, (r.raw.title || '-').slice(0, 44), r.pages, r.exercises, rand, c(status, color)]);
    for (const issue of r.issues) console.log('      ' + c(`❌ ${r.raw.sourceFile}: ${issue}`, RED));
    for (const warn of r.warnings) console.log('      ' + c(`⚠️  ${r.raw.sourceFile}: ${warn}`, YELLOW));
  });
  console.log(t.toString());
}

function main() {
  console.log(c('🔍 FUTON SET VALIDATION', BOLD + BLUE));
  const all = loadAll(process.cwd());
  console.log(c(`Loaded ${all.length} sets`, CYAN));
  const results = all.map(validateSet);
  const groups = summarize(results);
  printSummary(groups);
  printDetail(results);

  const totalIssues = results.reduce((s, r) => s + r.issues.length, 0);
  const totalWarnings = results.reduce((s, r) => s + r.warnings.length, 0);
  console.log('\n' + ''.padEnd(80, '='));
  if (totalIssues) {
    console.log(c(`❌ FAILED: ${totalIssues} errors, ${totalWarnings} warnings`, BOLD + RED));
    process.exit(1);
  }
  console.log(c(`✅ PASSED${totalWarnings ? ` (${totalWarnings} warnings)` : ''}`, BOLD + (totalWarnings ? YELLOW : GREEN)));
}

main();
