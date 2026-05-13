#!/usr/bin/env node
// One-line-per-evaluator summary. Runs every advisory + hard-fail evaluator
// in PARALLEL (iter 194: was sequential, 2m07s → ~10s), captures pass/fail,
// and prints a compact table. Does NOT exit with failure code even if some
// checks fail — use this for quick status, not CI gating.

import { spawn } from 'child_process';

const CHECKS = [
  // hard-fail guards wired into eval:all
  ['test:eval', 'Regression tests', [
    ['scripts/test-rationale.js'],
    ['scripts/test-eval.js'],
    ['scripts/test-fixers.js'],
    ['scripts/test-shuffle.js'],
    ['scripts/test-zero-state-detectors.js'],
  ]],
  ['validate:sets', 'Schema + required fields', [['scripts/validate-sets.js']]],
  ['lint:content', 'Content lint', [['scripts/lint-content.js']]],
  ['audit:content', 'Content audit', [['scripts/audit-content.js']]],
  ['eval:pedagogy', 'Rubric scoring (/100)', [['scripts/pedagogy-eval.js']]],
  ['eval:disconnected', 'Disconnected/placeholder rationales', [['scripts/find-disconnected.js']]],
  ['eval:arithmetic', 'Arithmetic answer correctness', [['scripts/eval-arithmetic.js']]],
  ['eval:correctness', 'Math correctness via mathjs (eq/fn/expr)', [['scripts/eval-math-correctness.js']]],
  ['eval:title-content', 'Title↔content match (tabuada/divisão)', [['scripts/eval-title-content-match.js']]],
  ['eval:alignment', 'Example-exercise operator alignment', [['scripts/eval-example-alignment.js']]],
  ['eval:relevance', 'Rationale references operand/answer', [['scripts/eval-rationale-relevance.js']]],
  ['eval:answers', 'Choice exercises: answer-in-choices', [['scripts/eval-answer-in-choices.js']]],
  ['eval:topic', 'Bucketed-rationale topic consistency', [['scripts/eval-topic-consistency.js']]],
  ['eval:intra-page', 'Intra-page same-Q/diff-A', [['scripts/eval-intra-page-dupes.js']]],
  ['eval:cross-set', 'Cross-set same-Q/diff-A', [['scripts/eval-cross-set-conflicts.js']]],
  ['eval:orphan-objectives', 'Objective scope (orphan/rogue)', [['scripts/eval-orphan-objectives.js']]],
  ['eval:dup-titles', 'Duplicate set titles per level', [['scripts/eval-duplicate-titles.js']]],
  ['eval:input-type', 'inputType mobile-keyboard match', [['scripts/eval-input-type.js']]],
  // Zero-state tripwires (promoted iter 187 from advisory to hard-fail)
  ['eval:tautological', 'Tautological rationales', [['scripts/eval-tautological-rationales.js']]],
  ['eval:pt-category', 'PT rationale-category mismatch', [['scripts/eval-pt-category-mismatch.js']]],
  ['eval:example-spoiler', 'Example = exercise #1 spoiler', [['scripts/eval-example-spoiler.js']]],
  ['eval:pt-pluralization', 'PT -ção/-al plural as -s (English-style)', [['scripts/eval-pt-pluralization.js']]],
  ['eval:meta-question', 'Meta-template shell questions', [['scripts/eval-meta-question.js']]],
  // advisory (not in eval:all)
  ['eval:choice-format', 'Inline-choice format (advisory)', [['scripts/eval-choice-format.js']]],
  ['eval:rationales', 'Rationale categorizer (advisory)', [['scripts/rationale-review.js']]],
  ['eval:bias', 'Answer-position bias (advisory)', [['scripts/find-answer-bias.js']]],
  ['eval:time', 'Session time budget (advisory)', [['scripts/eval-time-budget.js']]],
  ['eval:duplicates', 'Cross-set duplication density (advisory)', [['scripts/eval-duplicates.js']]],
  ['eval:coverage', 'Objective drill depth (advisory)', [['scripts/eval-coverage.js']]],
  ['eval:diversity', 'Rationale diversity (advisory)', [['scripts/eval-rationale-diversity.js']]],
  ['eval:length-bias', 'Correct-answer length bias (advisory)', [['scripts/eval-choice-length-bias.js']]],
  ['eval:progression', 'Per-page difficulty progression (advisory)', [['scripts/eval-difficulty-progression.js']]],
  ['eval:keyword-leak', 'Answer keyword leak in prompt (advisory)', [['scripts/eval-keyword-leak.js']]],
  ['eval:runs', 'Consecutive-answer runs (advisory)', [['scripts/eval-consecutive-runs.js']]],
  ['eval:rationale-arithmetic', 'Rationale arithmetic claims', [['scripts/eval-rationale-arithmetic.js']]],
  ['eval:rationale-conclusion', 'Rationale conclusion ↔ answer (advisory)', [['scripts/eval-rationale-conclusion.js']]],
];

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;
const CONCURRENCY = 6;
const CHECK_TIMEOUT_MS = 180_000;

function runCommand([script, ...args]) {
  return new Promise(resolve => {
    let settled = false;
    const p = spawn(process.execPath, [script, ...args], {
      shell: false,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    const finish = ok => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => {
      p.kill('SIGTERM');
      finish(false);
    }, CHECK_TIMEOUT_MS);
    p.on('close', code => finish(code === 0));
    p.on('error', () => finish(false));
  });
}

async function runOne([script, label, commands]) {
  for (const command of commands) {
    const ok = await runCommand(command);
    if (!ok) return { script, label, ok: false };
  }
  return { script, label, ok: true };
}

function validateChecks() {
  const invalid = CHECKS.filter(([, , commands]) => !Array.isArray(commands) || commands.length === 0);
  if (invalid.length) {
    throw new Error(`Missing command mapping for: ${invalid.map(([script]) => script).join(', ')}`);
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

console.log(c('\n📋 EVALUATOR SUMMARY', BOLD));
console.log(GRAY + `  ${CHECKS.length} checks · ${CONCURRENCY} at a time · advisory = never fails CI` + RESET + '\n');

validateChecks();
const results = await runPool(CHECKS, runOne, CONCURRENCY);

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
