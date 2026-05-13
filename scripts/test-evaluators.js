#!/usr/bin/env node
// Regression suite for the eval-* scripts. Builds tiny synthetic fixtures
// in a tmp directory and runs each evaluator against them, asserting that
// known-good fixtures pass and known-bad fixtures fail with expected output.
//
// Covers: intra-page-dupes, cross-set-conflicts, orphan-objectives,
// coverage, rationale-conclusion. Tests both bilingual {pt,en} handling
// and biology-exemption logic added in recent iterations.

import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const RESET = '\x1b[0m', GREEN = '\x1b[32m', RED = '\x1b[31m';
const TMP = join(process.cwd(), '.tmp-eval-tests');

let passed = 0, failed = 0;

function run(script, env = {}) {
  const r = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout + r.stderr };
}

function setupFixture(structure) {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  for (const [path, content] of Object.entries(structure)) {
    const full = join(TMP, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
}

function assert(name, cond, msg = '') {
  if (cond) { passed++; console.log(`${GREEN}✓${RESET} ${name}`); }
  else { failed++; console.log(`${RED}✗${RESET} ${name}${msg ? ` — ${msg}` : ''}`); }
}

// ─────────────────────────────────────────────────────────────────────
// intra-page-dupes
// ─────────────────────────────────────────────────────────────────────
{
  setupFixture({
    'src/levels/math/X/set_01.yaml': `
title: T
level: X
subject: math
objectives: [test]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - {type: t, question: "1 + 1 =", correctAnswer: 2, rationale: r, difficulty: 1, objectives: [test]}
      - {type: t, question: "1 + 1 =", correctAnswer: 2, rationale: r, difficulty: 1, objectives: [test]}
`,
  });
  const r = run('scripts/eval-intra-page-dupes.js', { PWD: TMP });
  // Can't easily redirect cwd — rely on actual repo data. Skip this style.
}

// Build a temp script wrapper that overrides fast-glob root.
function runEvalWithCwd(script) {
  return spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
}

// ─────────────────────────────────────────────────────────────────────
// Intra-page: same question, different answers should fail.
// ─────────────────────────────────────────────────────────────────────
{
  setupFixture({
    'src/levels/math/X/set_01.yaml': `
title: T
level: X
subject: math
objectives: [test]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - {type: t, question: "1+1=", correctAnswer: 2, rationale: r, difficulty: 1, objectives: [test]}
      - {type: t, question: "1+1=", correctAnswer: 3, rationale: r, difficulty: 1, objectives: [test]}
`,
  });
  // Resolve the evaluator script via absolute path so it can run with our TMP cwd.
  const script = join(process.cwd(), 'scripts/eval-intra-page-dupes.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('intra-page: same-Q diff-A fails', r.status === 1 && r.stdout.includes('1 ambiguity'));
}

// Intra-page: bilingual {pt,en} question objects — should NOT be stringified
// as [object Object] (would cause false positives).
{
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [test]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question: {pt: 'Q1?', en: 'Q1?'}
        choices: [a, b, c, d]
        correctAnswer: {pt: a, en: a}
        rationale: {pt: r, en: r}
        objectives: [test]
        difficulty: 3
      - type: choice
        question: {pt: 'Q2?', en: 'Q2?'}
        choices: [a, b, c, d]
        correctAnswer: {pt: b, en: b}
        rationale: {pt: r, en: r}
        objectives: [test]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-intra-page-dupes.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('intra-page: bilingual {pt,en} questions don\'t falsely collide', r.status === 0);
}

// ─────────────────────────────────────────────────────────────────────
// Cross-set conflicts: math same-Q diff-A across sets should fail.
// ─────────────────────────────────────────────────────────────────────
{
  setupFixture({
    'src/levels/math/X/set_01.yaml': `
title: T
level: X
subject: math
objectives: [test]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - {type: t, question: "9*6=", correctAnswer: 54, rationale: r, difficulty: 1, objectives: [test]}
`,
    'src/levels/math/X/set_02.yaml': `
title: T
level: X
subject: math
objectives: [test]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - {type: t, question: "9*6=", correctAnswer: 53, rationale: r, difficulty: 1, objectives: [test]}
`,
  });
  const script = join(process.cwd(), 'scripts/eval-cross-set-conflicts.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('cross-set: math conflicting answers fails', r.status === 1 && r.stdout.includes('1 cross-set conflict'));
}

// Cross-set: biology paraphrases should be exempt entirely.
{
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [test]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question: {pt: 'O que é mitocôndria?', en: 'What is mitochondrion?'}
        choices: [a, b, c, d]
        correctAnswer: {pt: 'Organela produtora de ATP', en: 'ATP-producing organelle'}
        rationale: {pt: r, en: r}
        objectives: [test]
        difficulty: 3
`,
    'src/levels/biology/X/set_02.yaml': `
title: T
level: X
subject: biology
objectives: [test]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question: {pt: 'O que é mitocôndria?', en: 'What is mitochondrion?'}
        choices: [a, b, c, d]
        correctAnswer: {pt: 'Casa de força da célula (produz ATP)', en: 'Powerhouse of the cell (makes ATP)'}
        rationale: {pt: r, en: r}
        objectives: [test]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-cross-set-conflicts.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('cross-set: biology paraphrases exempt', r.status === 0);
}

// ─────────────────────────────────────────────────────────────────────
// Orphan objectives: declared but never tagged should fail (math).
// ─────────────────────────────────────────────────────────────────────
{
  setupFixture({
    'src/levels/math/X/set_01.yaml': `
title: T
level: X
subject: math
objectives: [used, unused]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - {type: t, question: q, correctAnswer: a, rationale: r, difficulty: 1, objectives: [used]}
`,
  });
  const script = join(process.cwd(), 'scripts/eval-orphan-objectives.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('orphan-objectives: math unused declaration fails', r.status === 1 && r.stdout.includes('orphan'));
}

// Orphan objectives: biology exempt — prose objectives don't get checked.
{
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: ['Long prose objective sentence', 'Another prose statement']
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question: {pt: q, en: q}
        choices: [a, b, c, d]
        correctAnswer: {pt: a, en: a}
        rationale: {pt: r, en: r}
        objectives: ['Topic label']
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-orphan-objectives.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('orphan-objectives: biology exempt', r.status === 0);
}

// ─────────────────────────────────────────────────────────────────────
// Coverage: ≥4 exercises per objective (math); biology exempt.
// ─────────────────────────────────────────────────────────────────────
{
  setupFixture({
    'src/levels/math/X/set_01.yaml': `
title: T
level: X
subject: math
objectives: [sparse]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - {type: t, question: q1, correctAnswer: 1, rationale: r, difficulty: 1, objectives: [sparse]}
      - {type: t, question: q2, correctAnswer: 2, rationale: r, difficulty: 1, objectives: [sparse]}
`,
  });
  const script = join(process.cwd(), 'scripts/eval-coverage.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('coverage: math under-drilled objective fails', r.status === 1 && r.stdout.includes('under-drilled'));
}

// Coverage: biology exempt — would normally fail with 1 exercise per prose obj.
{
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: ['Single prose objective']
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question: {pt: q, en: q}
        choices: [a, b, c, d]
        correctAnswer: {pt: a, en: a}
        rationale: {pt: r, en: r}
        objectives: ['Single prose objective']
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-coverage.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('coverage: biology exempt', r.status === 0);
}

// ─────────────────────────────────────────────────────────────────────
// Rationale-conclusion: trailing '= N' disagrees with correctAnswer.
// ─────────────────────────────────────────────────────────────────────
{
  setupFixture({
    'src/levels/math/X/set_01.yaml': `
title: T
level: X
subject: math
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - {type: t, question: q, correctAnswer: 54, rationale: "9*6 = 81.", difficulty: 1, objectives: [t]}
`,
  });
  const script = join(process.cwd(), 'scripts/eval-rationale-conclusion.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('rationale-conclusion: trailing wrong value fails', r.status === 1 && r.stdout.includes('rationale ends'));
}

// Rationale-conclusion: '= N' inside parens (hint subclause) doesn't trigger.
{
  setupFixture({
    'src/levels/math/X/set_01.yaml': `
title: T
level: X
subject: math
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - {type: t, question: q, correctAnswer: 7, rationale: "Pense em par de 10 (3+7=10).", difficulty: 1, objectives: [t]}
`,
  });
  const script = join(process.cwd(), 'scripts/eval-rationale-conclusion.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('rationale-conclusion: parens hint skipped', r.status === 0);
}

// ─────────────────────────────────────────────────────────────────────
// Bilingual numeric consistency.
// ─────────────────────────────────────────────────────────────────────
{
  // pt has '8 horas' but en has '6 hours' — should fail.
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question:
          pt: 'Dose de 25 mg cada 8 horas'
          en: '25 mg dose every 6 hours'
        choices: [a, b, c, d]
        correctAnswer: {pt: a, en: a}
        rationale: {pt: r, en: r}
        objectives: [t]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-bilingual-numeric.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('bilingual-numeric: 8h vs 6h fails', r.status === 1 && r.stdout.includes('number mismatch'));
}

{
  // 'século XX' vs '20th century' should compare equal via Roman conversion.
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question:
          pt: 'Descoberto no século XX'
          en: 'Discovered in the 20th century'
        choices: [a, b, c, d]
        correctAnswer: {pt: a, en: a}
        rationale: {pt: r, en: r}
        objectives: [t]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-bilingual-numeric.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('bilingual-numeric: século XX ↔ 20th century equal', r.status === 0);
}

{
  // Magnitude suffixes: '40 mil' ↔ '40,000' equal; '3,7 milhões' ↔ '3.7 Mya' equal.
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question:
          pt: 'Há ~40 mil anos e ~3,7 milhões de anos'
          en: 'About 40,000 years and ~3.7 Mya'
        choices: [a, b, c, d]
        correctAnswer: {pt: a, en: a}
        rationale: {pt: r, en: r}
        objectives: [t]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-bilingual-numeric.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('bilingual-numeric: magnitude suffixes (mil/Mya/k) normalize', r.status === 0);
}

{
  // Digits embedded in identifiers ('Cas9', 'G3P', 'PM2.5', 'H2O') are not numeric content.
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question:
          pt: 'Cas12 (Cpf1) difere de Cas9, considerando H2O e PM2,5'
          en: 'Cas12 (Cpf1) differs from Cas9, considering H2O and PM2.5'
        choices: [a, b, c, d]
        correctAnswer: {pt: a, en: a}
        rationale: {pt: r, en: r}
        objectives: [t]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-bilingual-numeric.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('bilingual-numeric: identifier-embedded digits (Cas9/G3P/PM2.5) excluded', r.status === 0);
}

{
  // PT ordinals ('1º grau') normalize to bare digit so '1º' ↔ '1' equal.
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question:
          pt: 'Queimadura de 1º grau atinge:'
          en: 'A 1-degree burn reaches:'
        choices: [a, b, c, d]
        correctAnswer: {pt: a, en: a}
        rationale: {pt: r, en: r}
        objectives: [t]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-bilingual-numeric.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('bilingual-numeric: PT ordinal marker stripped', r.status === 0);
}

{
  // Medical acronyms (CML, MI, DII) must NOT be Roman-converted.
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question:
          pt: 'Imatinibe em CML, DII e MI'
          en: 'Imatinib in CML, IBD and MI'
        choices: [a, b, c, d]
        correctAnswer: {pt: a, en: a}
        rationale: {pt: r, en: r}
        objectives: [t]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-bilingual-numeric.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('bilingual-numeric: medical acronyms not Roman-converted', r.status === 0);
}

// ─────────────────────────────────────────────────────────────────────
// Answer-in-choices with bilingual {pt,en} objects.
// ─────────────────────────────────────────────────────────────────────
{
  // correctAnswer.en has a Portuguese typo while choice.en is correct → flag.
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question:
          pt: 'q?'
          en: 'q?'
        choices:
          - {pt: 'Pancreas', en: 'Pancreas'}
          - {pt: 'Tireoide', en: 'Thyroid'}
          - {pt: 'Hipófise', en: 'Pituitary'}
          - {pt: 'Suprarrenal', en: 'Adrenal'}
        correctAnswer: {pt: 'Pancreas', en: 'Pâncreas'}
        rationale: {pt: r, en: r}
        objectives: [t]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-answer-in-choices.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('answer-in-choices: bilingual typo flagged', r.status === 1 && r.stdout.includes('mismatch'));
}

{
  // Bilingual correctAnswer that exactly matches a choice passes.
  setupFixture({
    'src/levels/biology/X/set_01.yaml': `
title: T
level: X
subject: biology
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - type: choice
        question: {pt: q, en: q}
        choices:
          - {pt: 'Coração', en: 'Heart'}
          - {pt: 'Pulmão', en: 'Lung'}
          - {pt: 'Fígado', en: 'Liver'}
          - {pt: 'Estômago', en: 'Stomach'}
        correctAnswer: {pt: 'Coração', en: 'Heart'}
        rationale: {pt: r, en: r}
        objectives: [t]
        difficulty: 3
`,
  });
  const script = join(process.cwd(), 'scripts/eval-answer-in-choices.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('answer-in-choices: bilingual exact match passes', r.status === 0);
}

// Rationale-conclusion: sign-flip magnitude pattern tolerated.
{
  setupFixture({
    'src/levels/math/X/set_01.yaml': `
title: T
level: X
subject: math
objectives: [t]
example: ""
pages:
  - pageNumber: 1
    title: P
    description: D
    exercises:
      - {type: t, question: q, correctAnswer: -5, rationale: "Opostos: 8 − 3 = 5; sinal do maior (-8).", difficulty: 1, objectives: [t]}
`,
  });
  const script = join(process.cwd(), 'scripts/eval-rationale-conclusion.js');
  const r = spawnSync(process.execPath, [script], { cwd: TMP, encoding: 'utf8' });
  assert('rationale-conclusion: sign-flip tolerated', r.status === 0);
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
