#!/usr/bin/env node
// Regression tests for the rubric scorers in scripts/pedagogy-eval.js.
// Complements test-rationale.js which covers the categorize() lexicon.

import { scoreAnswerDistribution, scoreGradient, scoreDistractors } from './pedagogy-eval.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

// Helpers to build synthetic sets ---------------------------------------------
const page = (answers, difficulty = 1) => ({
  pageNumber: 1,
  exercises: answers.map(a => ({ correctAnswer: a, difficulty, question: 'q', type: 'drill' })),
});
const mkSet = (pages, difficulty = 2) => ({
  difficulty,
  pages: pages.map((p, i) => ({ ...p, pageNumber: i + 1 })),
});

// ── Tests ────────────────────────────────────────────────────────────────────

const CASES = [
  // answerDist ---------------------------------------------------------------
  {
    name: 'answerDist: zero answers counted (no || bug)',
    run: () => scoreAnswerDistribution(mkSet([page(['0', '1', '2', '3', '4'])])),
    expect: r => r.score === 10, // not flagged, no dominant >60%
  },
  {
    name: 'answerDist: uniform theme (all 10)',
    run: () => scoreAnswerDistribution(mkSet([
      page(['10', '10', '10', '10', '10', '10', '10', '10', '10', '10']),
    ])),
    expect: r => r.score === 10, // theme exemption fires
  },
  {
    name: 'answerDist: progressive-theme (substantivo/verbo/adjetivo per page)',
    run: () => scoreAnswerDistribution(mkSet([
      page(Array(10).fill('substantivo')),
      page(Array(10).fill('verbo')),
      page(Array(10).fill('adjetivo')),
    ])),
    expect: r => r.score === 10, // progressive-theme exemption
  },
  {
    name: 'answerDist: real per-page skew (not a theme)',
    run: () => scoreAnswerDistribution(mkSet([
      page(['a', 'a', 'a', 'a', 'a', 'a', 'a', 'b', 'c', 'd']), // 70% a
      page(['p', 'q', 'r', 's']),
    ])),
    expect: r => r.score < 10, // should lose at least 3 pts
  },
  {
    name: 'answerDist: binary-option page (V/F)',
    run: () => scoreAnswerDistribution(mkSet([
      page(['V', 'V', 'V', 'V', 'V', 'V', 'V', 'F', 'V', 'V']),
    ])),
    expect: r => r.score === 10, // binary-option exemption
  },

  // gradient -----------------------------------------------------------------
  {
    name: 'gradient: single page returns full credit',
    run: () => scoreGradient(mkSet([page(['a'])])),
    expect: r => r.score === 20,
  },
  {
    name: 'gradient: sparse-page (≤2 exercises/page) returns full credit',
    run: () => scoreGradient(mkSet([
      { exercises: [{ difficulty: 4 }] },
      { exercises: [{ difficulty: 2 }] },
      { exercises: [{ difficulty: 5 }] },
    ], 3)),
    expect: r => r.score === 20,
  },
  {
    name: 'gradient: constant-drill (uniform)',
    run: () => scoreGradient(mkSet([
      page(['_', '_', '_', '_'], 4), page(['_', '_', '_', '_'], 4),
      page(['_', '_', '_', '_'], 4), page(['_', '_', '_', '_'], 4),
    ], 4)),
    expect: r => r.score === 20,
  },
  {
    name: 'gradient: progressive [1, 2, 3]',
    run: () => scoreGradient(mkSet([
      page(['_','_','_','_'], 1), page(['_','_','_','_'], 2),
      page(['_','_','_','_'], 3),
    ], 2)),
    expect: r => r.score >= 15,
  },

  // distractors --------------------------------------------------------------
  {
    name: 'distractors: case-sensitive "I/i" not duplicate',
    run: () => scoreDistractors({
      pages: [{
        exercises: [{ choices: ['I', 'i'], correctAnswer: 'I', question: 'q' }],
      }],
    }),
    expect: r => r.score === 10,
  },
  {
    name: 'distractors: actual duplicate "a/a/a"',
    run: () => scoreDistractors({
      pages: [{
        exercises: [{ choices: ['a', 'a', 'a'], correctAnswer: 'a', question: 'q' }],
      }],
    }),
    expect: r => r.score < 10,
  },
  {
    name: 'distractors: phrase-answer exempt from length-cue check (iter 73)',
    run: () => scoreDistractors({
      pages: [{
        exercises: [{
          choices: ['adjunto adverbial de finalidade', 'modo', 'lugar', 'tempo'],
          correctAnswer: 'adjunto adverbial de finalidade',
          question: 'q',
        }],
      }],
    }),
    expect: r => r.score === 10,
  },
  {
    name: 'distractors: single-word answer still flagged on length-cue',
    run: () => scoreDistractors({
      pages: [{
        exercises: [{
          choices: ['superlativo', 'a', 'e', 'o'],
          correctAnswer: 'superlativo',
          question: 'q',
        }],
      }],
    }),
    expect: r => r.score < 10,
  },
  // answerDist focused-page exemption (iter 74) -------------------------------
  {
    name: 'answerDist: single focused page in diverse set = exempt',
    run: () => scoreAnswerDistribution({ pages: [
      { pageNumber: 1, exercises: [1,2,3,4,5,6,7,8,9,10].map(a => ({ correctAnswer: a })) },
      { pageNumber: 2, exercises: [2,3,4,5,6,7,8,9,10,1].map(a => ({ correctAnswer: a })) },
      { pageNumber: 3, exercises: [3,4,5,6,7,8,9,10,1,2].map(a => ({ correctAnswer: a })) },
      { pageNumber: 4, exercises: [4,5,6,7,8,9,10,1,2,3].map(a => ({ correctAnswer: a })) },
      // page 5 teaches n-n=0, 7 of 10 answers are 0
      { pageNumber: 5, exercises: [0,0,0,0,0,0,0,1,2,3].map(a => ({ correctAnswer: a })) },
    ]}),
    expect: r => r.score === 10,
  },
  {
    name: 'answerDist: two skewed pages still penalized',
    run: () => scoreAnswerDistribution({ pages: [
      { pageNumber: 1, exercises: [0,0,0,0,0,0,0,1,2,3].map(a => ({ correctAnswer: a })) },
      { pageNumber: 2, exercises: [0,0,0,0,0,0,0,1,2,3].map(a => ({ correctAnswer: a })) },
      { pageNumber: 3, exercises: [1,2,3,4,5,6,7,8,9,10].map(a => ({ correctAnswer: a })) },
      { pageNumber: 4, exercises: [2,3,4,5,6,7,8,9,10,1].map(a => ({ correctAnswer: a })) },
      { pageNumber: 5, exercises: [3,4,5,6,7,8,9,10,1,2].map(a => ({ correctAnswer: a })) },
    ]}),
    expect: r => r.score < 10,
  },
  // gradient consolidation-review exemption (iter 74) -------------------------
  {
    name: 'gradient: downward jump into final page = consolidation, exempt',
    run: () => scoreGradient({
      difficulty: 2,
      pages: [
        { pageNumber: 1, exercises: Array(10).fill({ difficulty: 2 }) },
        { pageNumber: 2, exercises: Array(10).fill({ difficulty: 2 }) },
        { pageNumber: 3, exercises: Array(10).fill({ difficulty: 1 }) },
      ],
    }),
    expect: r => r.score === 20,
  },
  // gradient iter 76 patterns -------------------------------------------------
  {
    name: 'gradient: 3-page inverted-U (1.5→2.7→1.9) = climax, exempt',
    run: () => scoreGradient({
      difficulty: 2,
      pages: [
        { pageNumber: 1, exercises: Array(10).fill({}).map((_,i)=>({ difficulty: i<5?1:2 })) },
        { pageNumber: 2, exercises: Array(10).fill({}).map((_,i)=>({ difficulty: i<3?2:3 })) },
        { pageNumber: 3, exercises: Array(10).fill({}).map((_,i)=>({ difficulty: i<9?2:1 })) },
      ],
    }),
    expect: r => r.score === 20,
  },
  {
    name: 'gradient: long set with one small outlier (≤1.5) = full credit',
    run: () => {
      const mk = (difs) => ({ exercises: difs.map(d => ({ difficulty: d })) });
      // page avgs: 2, 2, 2, 2, 2, 2, 2, 3, 1.9, 2 — single 1.1 dip (p8→p9)
      const pages = [
        mk(Array(10).fill(2)),
        mk(Array(10).fill(2)),
        mk(Array(10).fill(2)),
        mk(Array(10).fill(2)),
        mk(Array(10).fill(2)),
        mk(Array(10).fill(2)),
        mk(Array(10).fill(2)),
        mk(Array(10).fill(3)),
        mk([1, 2, 2, 2, 2, 2, 2, 2, 2, 2]),
        mk(Array(10).fill(2)),
      ].map((p, i) => ({ pageNumber: i + 1, ...p }));
      return scoreGradient({ difficulty: 2, pages });
    },
    expect: r => r.score >= 19,
  },
];

let passed = 0, failed = 0;
const failures = [];
for (const tc of CASES) {
  const result = tc.run();
  if (tc.expect(result)) passed++;
  else { failed++; failures.push({ ...tc, result }); }
}

console.log(c('\n🧪 RUBRIC SCORER TESTS', BOLD));
console.log(`  ${passed} passed · ${failed} failed · ${CASES.length} total\n`);
if (failed) {
  console.log(c('FAILURES:', BOLD + RED));
  for (const f of failures) {
    console.log(`  ${c('✗', RED)} ${f.name}`);
    console.log(c(`     got: ${JSON.stringify(f.result)}`, GRAY));
  }
  process.exit(1);
}
console.log(c('✅ All scorer cases pass.', GREEN));
