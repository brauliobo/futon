#!/usr/bin/env node
// One-line-per-evaluator summary. Runs every advisory + hard-fail evaluator
// in PARALLEL (iter 194: was sequential, 2m07s → ~10s), captures pass/fail,
// and prints a compact table. Does NOT exit with failure code even if some
// checks fail — use this for quick status, not CI gating.

import { spawn } from 'child_process';

const CHECKS = [
  // hard-fail guards wired into eval:all
  ['test:eval', 'Regression tests'],
  ['validate:sets', 'Schema + required fields'],
  ['lint:content', 'Content lint'],
  ['audit:content', 'Content audit'],
  ['eval:pedagogy', 'Rubric scoring (/100)'],
  ['eval:disconnected', 'Disconnected/placeholder rationales'],
  ['eval:arithmetic', 'Arithmetic answer correctness'],
  ['eval:alignment', 'Example-exercise operator alignment'],
  ['eval:relevance', 'Rationale references operand/answer'],
  ['eval:answers', 'Choice exercises: answer-in-choices'],
  ['eval:topic', 'Bucketed-rationale topic consistency'],
  ['eval:intra-page', 'Intra-page same-Q/diff-A'],
  ['eval:cross-set', 'Cross-set same-Q/diff-A'],
  ['eval:orphan-objectives', 'Objective scope (orphan/rogue)'],
  ['eval:dup-titles', 'Duplicate set titles per level'],
  ['eval:input-type', 'inputType mobile-keyboard match'],
  // Zero-state tripwires (promoted iter 187 from advisory to hard-fail)
  ['eval:tautological', 'Tautological rationales'],
  ['eval:pt-category', 'PT rationale-category mismatch'],
  ['eval:example-spoiler', 'Example = exercise #1 spoiler'],
  ['eval:pt-pluralization', 'PT -ção/-al plural as -s (English-style)'],
  ['eval:meta-question', 'Meta-template shell questions'],
  // advisory (not in eval:all)
  ['eval:choice-format', 'Inline-choice format (advisory)'],
  ['eval:rationales', 'Rationale categorizer (advisory)'],
  ['eval:bias', 'Answer-position bias (advisory)'],
  ['eval:time', 'Session time budget (advisory)'],
  ['eval:duplicates', 'Cross-set duplication density (advisory)'],
  ['eval:coverage', 'Objective drill depth (advisory)'],
  ['eval:diversity', 'Rationale diversity (advisory)'],
  ['eval:length-bias', 'Correct-answer length bias (advisory)'],
  ['eval:progression', 'Per-page difficulty progression (advisory)'],
  ['eval:keyword-leak', 'Answer keyword leak in prompt (advisory)'],
  ['eval:runs', 'Consecutive-answer runs (advisory)'],
];

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

function runOne([script, label]) {
  return new Promise(resolve => {
    const p = spawn('pnpm', ['run', '-s', script], { stdio: ['ignore', 'ignore', 'ignore'] });
    p.on('close', code => resolve({ script, label, ok: code === 0 }));
    p.on('error', () => resolve({ script, label, ok: false }));
  });
}

console.log(c('\n📋 EVALUATOR SUMMARY', BOLD));
console.log(GRAY + `  ${CHECKS.length} checks · runs in parallel · advisory = never fails CI` + RESET + '\n');

const results = await Promise.all(CHECKS.map(runOne));

// Print in original order
let passCt = 0, failCt = 0;
const failed = [];
for (const r of results) {
  if (r.ok) passCt++;
  else { failCt++; failed.push(r.script); }
  const color = r.ok ? GREEN : RED;
  const icon = r.ok ? '✓' : '✗';
  console.log(`  ${c(icon, color)} ${r.label.padEnd(42)} ${c(r.script, GRAY)}`);
}
console.log('');
const barColor = failCt === 0 ? GREEN : (failCt <= 4 ? YELLOW : RED);
console.log(c(`  ${passCt}/${CHECKS.length} passed`, barColor) +
  (failCt ? c(` · failed: ${failed.join(', ')}`, YELLOW) : ''));
console.log('');
