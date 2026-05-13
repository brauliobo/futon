#!/usr/bin/env node
// Quality lint: per-level metrics (rationale/objectives coverage, difficulty
// monotonicity, exercise type variety). Reports rather than blocks.

import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { parse } from 'yaml';
import { familyOf } from '../src/domain/schema/exerciseTypes.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', CYAN = '\x1b[36m';
const c = (t, col) => `${col}${t}${RESET}`;
const SUBJECTS = ['math', 'portuguese', 'english', 'japanese', 'spanish', 'biology'];

function loadSets() {
  const rootDir = process.cwd();
  const all = [];
  for (const subject of SUBJECTS) {
    const subjectDir = path.join(rootDir, 'src', 'levels', subject);
    if (!fs.existsSync(subjectDir)) continue;
    for (const level of fs.readdirSync(subjectDir).sort()) {
      const levelDir = path.join(subjectDir, level);
      if (!fs.statSync(levelDir).isDirectory()) continue;
      const files = fs.readdirSync(levelDir).filter(f => /\.ya?ml$/.test(f)).sort();
      for (const file of files) {
        try {
          const raw = parse(fs.readFileSync(path.join(levelDir, file), 'utf8'));
          all.push({ ...raw, subject, level, sourceFile: file });
        } catch { /* validate-sets handles parse errors */ }
      }
    }
  }
  return all;
}

function metrics(setsInLevel) {
  let total = 0, rationale = 0, objectives = 0, withDifficulty = 0;
  const families = new Set();
  const setDifficulties = [];
  for (const s of setsInLevel) {
    if (s.difficulty) setDifficulties.push(s.difficulty);
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        total++;
        if (e.rationale) rationale++;
        if (Array.isArray(e.objectives) && e.objectives.length) objectives++;
        if (e.difficulty) withDifficulty++;
        const fam = familyOf(e.type);
        if (fam) families.add(fam);
      }
    }
  }
  // Trend-based: pass if the second-half average is not significantly easier
  // than the first half (Kumon spaced-repetition mixes review with new
  // material, so per-set 1-step regressions are legitimate design — see
  // pedagogy-eval scoreLevelProgression for the matching heuristic).
  let monotonic = null;
  if (setDifficulties.length >= 2) {
    const mid = Math.floor(setDifficulties.length / 2);
    const firstAvg = setDifficulties.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondAvg = setDifficulties.slice(mid).reduce((a, b) => a + b, 0) / (setDifficulties.length - mid);
    // Round to 2 decimal places to avoid FP errors like -0.10000000000000009
    // (e.g., japanese/B has interleaved 3↔4 with exact -0.1 trend).
    monotonic = Math.round((secondAvg - firstAvg) * 100) / 100 >= -0.1;
  }
  return {
    exercises: total,
    rationalePct: total ? Math.round((rationale / total) * 100) : 0,
    objectivesPct: total ? Math.round((objectives / total) * 100) : 0,
    difficultyPct: total ? Math.round((withDifficulty / total) * 100) : 0,
    families: [...families],
    difficultyMonotonic: monotonic,
  };
}

function main() {
  console.log(c('📏 CONTENT LINT', BOLD + CYAN));
  const all = loadSets();
  const byLevel = {};
  for (const s of all) {
    const k = `${s.subject}-${s.level}`;
    (byLevel[k] = byLevel[k] || []).push(s);
  }
  const t = new Table({
    head: ['SUBJECT', 'LEVEL', 'EX', 'RATIONALE', 'OBJECTIVES', 'DIFFICULTY', 'FAMILIES', 'MONOTONIC'].map(h => c(h, BOLD)),
    style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
  });
  let totalWarnings = 0;
  for (const key of Object.keys(byLevel).sort()) {
    const [subject, level] = key.split('-');
    const m = metrics(byLevel[key]);
    const pct = (v) => c(`${v}%`, v >= 90 ? GREEN : v >= 50 ? YELLOW : RED);
    if (m.rationalePct < 90) totalWarnings++;
    if (m.objectivesPct < 90) totalWarnings++;
    t.push([subject, level, m.exercises, pct(m.rationalePct), pct(m.objectivesPct), pct(m.difficultyPct),
      m.families.length, m.difficultyMonotonic === null ? '-' : (m.difficultyMonotonic ? c('✓', GREEN) : c('✗', RED))]);
  }
  console.log(t.toString());
  console.log(c(`\n${totalWarnings} level(s) below 90% coverage on rationale/objectives`, totalWarnings ? YELLOW : GREEN));
}

main();
