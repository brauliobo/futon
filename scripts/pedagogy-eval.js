#!/usr/bin/env node
// Kumon-grade pedagogy evaluator. Scores each set (0-100) on 7 dimensions
// plus a per-level progression score. Complements audit-content.js (mechanical)
// and lint-content.js (coverage). See docs/PEDAGOGY.md for the rubric.
// Usage: node scripts/pedagogy-eval.js [--subject S] [--level L] [--worst N] [--json]

import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { parse } from 'yaml';
import { categorize as rationaleCategory } from './lib/rationale.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m';
const c = (t, col) => `${col}${t}${RESET}`;
const colorPct = v => v >= 85 ? GREEN : v >= 70 ? YELLOW : RED;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SUBJECT = argVal('--subject');
const LEVEL = argVal('--level');
const SET_FILE = argVal('--set');
const WORST_N = parseInt(argVal('--worst') || '10', 10);
const JSON_OUT = args.includes('--json');
const SUBJECTS = SUBJECT ? [SUBJECT] : ['math', 'portuguese', 'english', 'japanese'];

const THRESHOLDS = { excellent: 85, acceptable: 70 };

// ── Load ────────────────────────────────────────────────────────────────────

function loadAll() {
  if (SET_FILE) {
    const raw = parse(fs.readFileSync(SET_FILE, 'utf8'));
    return [{ ...raw, subject: raw.subject || 'unknown', level: raw.level || 'unknown', _file: path.basename(SET_FILE) }];
  }
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

// 2. Within-set difficulty gradient (20). First-page floor scales with
// set.difficulty so that an advanced set (difficulty 4) isn't penalized
// for starting at difficulty 3 — the gradient check is about *relative*
// growth within the set, not absolute ease.
function scoreGradient(set) {
  const diffs = pageDiffAvgs(set).filter(Boolean);
  // Single-page sets can't have a gradient; give full credit rather than
  // capping them at 10/20 by default.
  if (diffs.length < 2) return { score: 20, max: 20, issue: null };
  let score = 0;
  const issues = [];
  const firstMax = Number.isFinite(set.difficulty) ? Math.max(2.4, set.difficulty - 0.5) : 2.4;
  const rangeOfDiffs = Math.max(...diffs) - Math.min(...diffs);
  // Constant-difficulty drill sets (all pages within 0.4 of each other)
  // don't have a "hot start" concept — first page matches the rest.
  const isUniform = rangeOfDiffs < 0.5;
  if (diffs[0] <= firstMax || isUniform) score += 5;
  else issues.push(`first page hot-start (${diffs[0].toFixed(1)})`);
  const jumps = diffs.slice(1).map((d, i) => Math.abs(d - diffs[i]));
  const maxJump = Math.max(...jumps);
  const bigJumps = jumps.filter(j => j > 1.0).length;
  // Jump tolerance scales with set.difficulty: a diff-4 set where one page
  // steps up by 2 is less worrying than a diff-1 drill with the same jump.
  const jumpTol = Number.isFinite(set.difficulty) ? Math.min(2.0, 1.0 + set.difficulty / 4) : 1.0;
  if (maxJump <= 1.0) score += 10;
  else if (bigJumps === 1 && maxJump <= 2.0) {
    // Single-outlier tolerance: one page steps by up to 2; rest are gentle.
    score += 8; issues.push(`one page jump ${maxJump.toFixed(1)}`);
  }
  else if (bigJumps <= 2 && maxJump <= 2.0 && jumps.length >= 8) {
    // Two-outlier tolerance: typically a dip + recovery inside a 10-page
    // set. Less severe than a multi-jagged profile.
    score += 6; issues.push(`${bigJumps} page jumps up to ${maxJump.toFixed(1)}`);
  }
  else if (maxJump <= jumpTol) { score += 7; issues.push(`page jump ${maxJump.toFixed(1)}`); }
  else if (maxJump <= 1.5) { score += 5; issues.push(`page jump ${maxJump.toFixed(1)}`); }
  else issues.push(`large page jump ${maxJump.toFixed(1)}`);
  // End-regression: last page should be ≥ first page. Skip for very short
  // sets (≤ 3 pages) where "ending" is ambiguous, and for review sets
  // where last page is a deliberate cooldown.
  if (diffs.length <= 3 || diffs[diffs.length - 1] >= diffs[0] - 0.2) score += 5;
  else issues.push('difficulty decreases end-to-start');
  return { score, max: 20, issue: issues.join('; ') || null };
}

// 3. Rationale pedagogical quality (25). Categories: see scripts/lib/rationale.js.
// A 'generic' rationale that echoes both a question-side word and the answer
// (e.g. question "A cor do sol é?" + answer "amarelo" + rationale "O sol tem
// cor amarelo.") qualifies as method-teaching via factual reinforcement.
function echoesQuestionAndAnswer(ex) {
  const r = String(ex.rationale || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const a = String(ex.correctAnswer || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (a.length < 3 || !r.includes(a)) return false;
  const q = String(ex.question || '').replace(/\([^)]+\)\s*$/, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const qWords = (q.match(/[a-z]{3,}/g) || []).filter(w =>
    !['como', 'onde', 'quem', 'qual', 'para', 'que', 'uma', 'com', 'dos', 'das', 'por', 'são', 'seu', 'sua', 'nem', 'foi', 'era', 'tem', 'mas', 'mais'].includes(w));
  if (qWords.some(w => r.includes(w))) return true;
  // Also accept numeric tokens (1, 42, π) from the question appearing in
  // the rationale — common in "Como se escreve o número 1?" → "1 por
  // extenso é 'um'" style rationales.
  const qNums = q.match(/\b\d+\b/g) || [];
  return qNums.some(n => new RegExp(`\\b${n}\\b`).test(r));
}
function scoreRationales(set) {
  const exs = allExercises(set);
  if (!exs.length) return { score: 0, max: 25, issue: 'no exercises' };
  const counts = { method: 0, generic: 0, missing: 0, short: 0, long: 0, restatement: 0 };
  for (const e of exs) {
    let cat = rationaleCategory(e.rationale);
    if (cat === 'generic' && echoesQuestionAndAnswer(e)) cat = 'method';
    counts[cat]++;
  }
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

// 5. Answer distribution skew (10). Sets whose ENTIRE content has one
// dominant answer (e.g. "Somas que dão 10" decomposition drills) are
// intentional theme sets — don't penalize per-page skew on those.
function scoreAnswerDistribution(set) {
  const setAns = [];
  for (const p of set.pages || []) {
    for (const e of p.exercises || []) {
      const a = String(e.correctAnswer || '').trim().toLowerCase();
      if (a) setAns.push(a);
    }
  }
  if (setAns.length >= 10) {
    const setFreq = {};
    for (const a of setAns) setFreq[a] = (setFreq[a] || 0) + 1;
    if (Math.max(...Object.values(setFreq)) / setAns.length > 0.7) {
      return { score: 10, max: 10, issue: null };
    }
  }

  // Progressive-theme: each page teaches one concept, so its dominant
  // answer differs from the next page's. If ≥3 consecutive pages skew
  // and their dominant answers are all distinct, treat as intentional.
  const pageDominants = (set.pages || []).map(p => {
    const ans = (p.exercises || []).map(e => String(e.correctAnswer || '').trim().toLowerCase()).filter(Boolean);
    if (ans.length < 4) return null;
    const f = {};
    for (const a of ans) f[a] = (f[a] || 0) + 1;
    const maxF = Math.max(...Object.values(f));
    if (maxF / ans.length <= 0.6) return null;
    return Object.entries(f).find(([, v]) => v === maxF)[0];
  });
  const skewed = pageDominants.filter(Boolean);
  if (skewed.length >= 3 && new Set(skewed).size === skewed.length) {
    return { score: 10, max: 10, issue: null };
  }

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

// 6. Choice distractor quality (10). Duplicates are detected case-sensitively
// because literacy exercises intentionally contrast "I" vs "i".
function scoreDistractors(set) {
  const exs = allExercises(set);
  const choiceExs = exs.filter(e => choicesOf(e));
  if (!choiceExs.length) return { score: 10, max: 10, issue: null };
  let weak = 0;
  for (const e of choiceExs) {
    const ch = choicesOf(e);
    const trimmed = ch.map(s => s.trim());
    if (new Set(trimmed).size < ch.length) { weak++; continue; }
    const lens = ch.map(s => s.length);
    if (Math.max(...lens) / Math.max(1, Math.min(...lens)) > 6) weak++;
  }
  const pct = 1 - weak / choiceExs.length;
  return { score: Math.round(10 * pct), max: 10,
    issue: weak ? `${weak}/${choiceExs.length} weak distractors (duplicate/length-mismatch)` : null };
}

// 7. Question length sanity (10). Exempts cloze (passage-based) and
// single-token vocabulary prompts (e.g. "1" in number vocab, "犬" in
// kanji drills) — those are legitimately short.
const SHORT_VOCAB_RE = /^\S{1,3}$/;
function scoreQuestionLength(set) {
  const exs = allExercises(set);
  if (!exs.length) return { score: 0, max: 10, issue: null };
  let bad = 0;
  for (const e of exs) {
    if (e.type === 'cloze') continue;
    const q = String(e.question || '');
    if (q.length > 250) { bad++; continue; }
    if (q.length < 3 && !SHORT_VOCAB_RE.test(q)) bad++;
  }
  const pct = 1 - bad / exs.length;
  return { score: Math.round(10 * pct), max: 10,
    issue: bad ? `${bad} question(s) too short or over 250 chars` : null };
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

  if (SET_FILE && perSet.length === 1) {
    const r = perSet[0];
    console.log(c(`\n📏 ${r.set.subject}/${r.set.level}/${r.set._file}`, BOLD + CYAN));
    console.log(c(`Pedagogy score: ${r.pct}%  (${r.score}/${r.max})\n`, BOLD + colorPct(r.pct)));
    const t = new Table({
      head: ['DIMENSION', 'SCORE', 'ISSUE'].map(h => c(h, BOLD)),
      style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
      colWidths: [14, 10, 90], wordWrap: true,
    });
    for (const p of r.parts) {
      const pct = Math.round(100 * p.score / p.max);
      t.push([p.name, c(`${p.score}/${p.max}`, colorPct(pct)), p.issue || '-']);
    }
    console.log(t.toString());
    process.exit(r.pct >= THRESHOLDS.acceptable ? 0 : 1);
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
  console.log(c('See PEDAGOGY.md for rubric + manual-review checklist.', CYAN));
  process.exit(global >= THRESHOLDS.acceptable ? 0 : 1);
}

main();
