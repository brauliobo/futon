#!/usr/bin/env node
// Kumon-grade pedagogy evaluator. Scores each set (0-100) on 7 dimensions
// plus a per-level progression score. Complements audit-content.js (mechanical)
// and lint-content.js (coverage). See docs/PEDAGOGY.md for the rubric.
// Usage: node scripts/pedagogy-eval.js [--subject S] [--level L] [--worst N] [--json]

import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { parse } from 'yaml';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m';
const c = (t, col) => `${col}${t}${RESET}`;
const colorPct = v => v >= 85 ? GREEN : v >= 70 ? YELLOW : RED;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SUBJECT = argVal('--subject');
const LEVEL = argVal('--level');
const WORST_N = parseInt(argVal('--worst') || '10', 10);
const JSON_OUT = args.includes('--json');
const SUBJECTS = SUBJECT ? [SUBJECT] : ['math', 'portuguese', 'english', 'japanese'];

const THRESHOLDS = { excellent: 85, acceptable: 70 };

// ── Load ────────────────────────────────────────────────────────────────────

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
        } catch { /* validate-sets reports parse errors */ }
      }
    }
  }
  return sets;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const allExercises = set => (set.pages || []).flatMap(p => p.exercises || []);
const pageDiffAvgs = set => (set.pages || []).map(p => {
  const ds = (p.exercises || []).map(e => e.difficulty).filter(Number.isFinite);
  return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : 0;
});

const CHOICE_RE = /\(([^)]+\/[^)]+)\)\s*$/;
const choicesOf = ex => ex.choices?.length ? ex.choices
  : CHOICE_RE.test(String(ex.question || '')) ? ex.question.match(CHOICE_RE)[1].split('/').map(s => s.trim())
  : null;

// ── Scorers (each returns {score, max, issue}) ──────────────────────────────

// 1. Worked example presence & quality (10)
function scoreExample(set) {
  const ex = set.example;
  if (!ex || typeof ex !== 'string') return { score: 0, max: 10, issue: 'no example field' };
  if (ex.length < 12) return { score: 3, max: 10, issue: 'example too short' };
  const hasModel = /ex\.?:|e\.g\.:|→|=/i.test(ex);
  return hasModel ? { score: 10, max: 10, issue: null }
    : { score: 6, max: 10, issue: 'example lacks worked model (Ex.: / → / =)' };
}

// 2. Within-set difficulty gradient (20)
function scoreGradient(set) {
  const diffs = pageDiffAvgs(set).filter(Boolean);
  if (diffs.length < 2) return { score: 10, max: 20, issue: null };
  let score = 0;
  const issues = [];
  if (diffs[0] <= 2.4) score += 5;
  else issues.push(`first page hot-start (${diffs[0].toFixed(1)})`);
  const maxJump = Math.max(...diffs.slice(1).map((d, i) => Math.abs(d - diffs[i])));
  if (maxJump <= 1.0) score += 10;
  else if (maxJump <= 1.5) { score += 5; issues.push(`page jump ${maxJump.toFixed(1)}`); }
  else issues.push(`large page jump ${maxJump.toFixed(1)}`);
  if (diffs[diffs.length - 1] >= diffs[0] - 0.2) score += 5;
  else issues.push('difficulty decreases end-to-start');
  return { score, max: 20, issue: issues.join('; ') || null };
}

// 3. Rationale pedagogical quality (25)
const METHOD_RE = /\b(faça|conte|some|subtraia|divida|multiplique|primeiro|depois|porque|então|basta|lembr[ea]|dobro|metade|veja|compare|observe|aplique|troque|use|note|fórmula|regra|first|then|because|count|add|subtract|multiply|divide|double|half|step|notice|start|rule|pattern)/i;
const RESTATE_RE = /^\s*(a\s+resposta\s+é|resposta:|answer:|é\s+\d|is\s+\d)/i;

function rationaleCategory(ex) {
  const r = ex.rationale;
  if (!r || typeof r !== 'string') return 'missing';
  const s = r.trim();
  if (s.length < 10) return 'short';
  if (s.length > 300) return 'long';
  if (RESTATE_RE.test(s)) return 'restatement';
  if (METHOD_RE.test(s)) return 'method';
  return 'generic';
}
function scoreRationales(set) {
  const exs = allExercises(set);
  if (!exs.length) return { score: 0, max: 25, issue: 'no exercises' };
  const counts = { method: 0, generic: 0, missing: 0, short: 0, long: 0, restatement: 0 };
  for (const e of exs) counts[rationaleCategory(e)]++;
  const n = exs.length;
  const methodPts = Math.round(15 * counts.method / n);
  const coverPts = Math.round(5 * (1 - counts.missing / n));
  const qualityPts = Math.round(5 * (n - counts.restatement - counts.short - counts.long) / n);
  const score = methodPts + coverPts + qualityPts;
  const issues = [];
  if (counts.missing > n * 0.05) issues.push(`${counts.missing} missing`);
  if (counts.restatement) issues.push(`${counts.restatement} restatements`);
  if (counts.short) issues.push(`${counts.short} too-short`);
  if (counts.long) issues.push(`${counts.long} too-long`);
  if (counts.method < n * 0.5) issues.push(`only ${Math.round(counts.method/n*100)}% teach a method`);
  return { score, max: 25, issue: issues.join('; ') || null };
}

// 4. Objectives tagging (5)
function scoreObjectives(set) {
  const exs = allExercises(set);
  if (!exs.length) return { score: 0, max: 5, issue: null };
  const tagged = exs.filter(e => Array.isArray(e.objectives) && e.objectives.length).length;
  const pct = tagged / exs.length;
  return { score: Math.round(5 * pct), max: 5,
    issue: pct < 1 ? `${exs.length - tagged}/${exs.length} untagged` : null };
}

// 5. Answer distribution skew (10)
function scoreAnswerDistribution(set) {
  let score = 10;
  const issues = [];
  for (const p of set.pages || []) {
    const ans = (p.exercises || []).map(e => String(e.correctAnswer || '').trim().toLowerCase()).filter(Boolean);
    if (ans.length < 4) continue;
    const freq = {};
    for (const a of ans) freq[a] = (freq[a] || 0) + 1;
    const maxFreq = Math.max(...Object.values(freq));
    if (maxFreq / ans.length > 0.6) {
      score -= 3;
      issues.push(`p${p.pageNumber}: ${Math.round(maxFreq/ans.length*100)}% "${Object.entries(freq).find(([,v])=>v===maxFreq)[0].slice(0,12)}"`);
    }
  }
  return { score: Math.max(0, score), max: 10, issue: issues.slice(0, 3).join('; ') || null };
}

// 6. Choice distractor quality (10)
function scoreDistractors(set) {
  const exs = allExercises(set);
  const choiceExs = exs.filter(e => choicesOf(e));
  if (!choiceExs.length) return { score: 10, max: 10, issue: null };
  let weak = 0;
  for (const e of choiceExs) {
    const ch = choicesOf(e);
    const norm = ch.map(s => s.toLowerCase().trim());
    if (new Set(norm).size < ch.length) { weak++; continue; }
    const lens = ch.map(s => s.length);
    if (Math.max(...lens) / Math.max(1, Math.min(...lens)) > 6) weak++;
  }
  const pct = 1 - weak / choiceExs.length;
  return { score: Math.round(10 * pct), max: 10,
    issue: weak ? `${weak}/${choiceExs.length} weak distractors (duplicate/length-mismatch)` : null };
}

// 7. Question length sanity (10)
function scoreQuestionLength(set) {
  const exs = allExercises(set);
  if (!exs.length) return { score: 0, max: 10, issue: null };
  let bad = 0;
  for (const e of exs) {
    if (e.type === 'cloze') continue;
    const q = String(e.question || '');
    if (q.length < 3 || q.length > 250) bad++;
  }
  const pct = 1 - bad / exs.length;
  return { score: Math.round(10 * pct), max: 10,
    issue: bad ? `${bad} question(s) under 3 or over 250 chars` : null };
}

// Per-set aggregate
const DIMS = [
  ['example', scoreExample],
  ['gradient', scoreGradient],
  ['rationale', scoreRationales],
  ['objectives', scoreObjectives],
  ['answerDist', scoreAnswerDistribution],
  ['distractors', scoreDistractors],
  ['qLength', scoreQuestionLength],
];

function scoreSet(set) {
  const parts = DIMS.map(([name, fn]) => ({ name, ...fn(set) }));
  const score = parts.reduce((s, p) => s + p.score, 0);
  const max = parts.reduce((s, p) => s + p.max, 0);
  return { score, max, pct: Math.round(100 * score / max), parts };
}

// 8. Cross-set progression within a level (10, level-scoped)
function scoreLevelProgression(sets) {
  const diffs = sets.map(s => s.difficulty).filter(Number.isFinite);
  if (diffs.length < 2) return { score: 5, max: 10, issue: 'too few sets' };
  let score = 10;
  const issues = [];
  for (let i = 1; i < diffs.length; i++) {
    const gap = diffs[i] - diffs[i - 1];
    if (gap < 0) { score -= 3; issues.push(`set ${i + 1}: regresses`); }
    else if (gap > 1) { score -= 2; issues.push(`set ${i + 1}: jump ${gap}`); }
  }
  return { score: Math.max(0, score), max: 10, issue: issues.slice(0, 3).join('; ') || null };
}

// ── Output ──────────────────────────────────────────────────────────────────

function main() {
  const sets = loadAll();
  if (!sets.length) { console.error('No sets found'); process.exit(1); }

  const perSet = sets.map(s => ({ set: s, ...scoreSet(s) }));
  const byLevel = {};
  for (const r of perSet) {
    const k = `${r.set.subject}/${r.set.level}`;
    (byLevel[k] = byLevel[k] || []).push(r);
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({
      sets: perSet.map(r => ({
        subject: r.set.subject, level: r.set.level, file: r.set._file,
        score: r.score, max: r.max, pct: r.pct,
        parts: Object.fromEntries(r.parts.map(p => [p.name, { score: p.score, max: p.max, issue: p.issue }])),
      })),
      levels: Object.fromEntries(Object.entries(byLevel).map(([k, rs]) => {
        const prog = scoreLevelProgression(rs.map(r => r.set));
        return [k, {
          sets: rs.length,
          avgPct: Math.round(rs.reduce((s, r) => s + r.pct, 0) / rs.length),
          progression: prog,
        }];
      })),
    }, null, 2));
    return;
  }

  console.log(c('\n📏 KUMON-GRADE PEDAGOGY EVALUATOR', BOLD + CYAN));
  console.log(c(`Evaluated ${sets.length} sets · ${Object.keys(byLevel).length} levels\n`, CYAN));

  const dimPct = (rs, name) => {
    const ps = rs.map(r => r.parts.find(p => p.name === name));
    const sum = ps.reduce((s, p) => s + p.score, 0);
    const max = ps.reduce((s, p) => s + p.max, 0);
    return max ? Math.round(100 * sum / max) : 0;
  };
  const fmt = pct => c(`${String(pct).padStart(3)}%`, colorPct(pct));

  const t = new Table({
    head: ['LEVEL', 'SETS', 'AVG', 'EXAMPLE', 'GRADIENT', 'RATIONAL', 'OBJECTIV', 'ANS-DIST', 'DISTRACT', 'Q-LEN', 'PROGRESS'].map(h => c(h, BOLD)),
    style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
  });
  for (const key of Object.keys(byLevel).sort()) {
    const rs = byLevel[key];
    const avg = Math.round(rs.reduce((s, r) => s + r.pct, 0) / rs.length);
    const prog = scoreLevelProgression(rs.map(r => r.set));
    t.push([
      key, rs.length, fmt(avg),
      fmt(dimPct(rs, 'example')), fmt(dimPct(rs, 'gradient')),
      fmt(dimPct(rs, 'rationale')), fmt(dimPct(rs, 'objectives')),
      fmt(dimPct(rs, 'answerDist')), fmt(dimPct(rs, 'distractors')),
      fmt(dimPct(rs, 'qLength')),
      fmt(Math.round(100 * prog.score / prog.max)),
    ]);
  }
  console.log(t.toString());

  const worst = [...perSet].sort((a, b) => a.pct - b.pct).slice(0, WORST_N);
  console.log(c(`\n⚠️  BOTTOM ${WORST_N} SETS BY PEDAGOGY SCORE`, BOLD + YELLOW));
  const w = new Table({
    head: ['SCORE', 'SET', 'WEAKEST DIMENSIONS'].map(h => c(h, BOLD)),
    style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
    colWidths: [8, 42, 80], wordWrap: true,
  });
  for (const r of worst) {
    const issues = r.parts.filter(p => p.score < p.max && p.issue)
      .sort((a, b) => (a.score / a.max) - (b.score / b.max))
      .slice(0, 3)
      .map(p => `${p.name}: ${p.issue}`).join(' │ ');
    w.push([c(`${r.pct}%`, colorPct(r.pct)), `${r.set.subject}/${r.set.level}/${r.set._file}`, issues || '-']);
  }
  console.log(w.toString());

  const global = Math.round(perSet.reduce((s, r) => s + r.pct, 0) / perSet.length);
  console.log('\n' + '═'.repeat(70));
  console.log(c(`Global pedagogy score: ${global}%`, BOLD + colorPct(global))
    + c(`  (excellent ≥${THRESHOLDS.excellent}, acceptable ≥${THRESHOLDS.acceptable})`, CYAN));
  console.log(c('See docs/PEDAGOGY.md for rubric + manual-review checklist.', CYAN));
  process.exit(global >= THRESHOLDS.acceptable ? 0 : 1);
}

main();
