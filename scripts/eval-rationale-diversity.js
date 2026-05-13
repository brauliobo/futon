#!/usr/bin/env node
// Rationale diversity check. Surfaces a class of content bug the lexical
// categorizer misses: a set where many exercises share the exact same
// rationale. In Kumon single-concept drills (e.g. "somar 0 não muda o
// número" applied to 100 exercises) this is LEGITIMATE — all exercises
// teach the same rule. But when a diverse set (10+ distinct question
// types) has only 1-3 unique rationales, it usually means rationales
// were hardcoded or copy-pasted across unrelated exercises.
//
// Heuristic: a set is low-diversity-suspicious when
//   unique_rationales / unique_questions < 0.3
// This catches the math/J/set_07 case (2 rationales across 85 distinct
// binomials) without penalizing single-concept drills (1 rationale across
// 10 distinct but structurally-identical exercises).
//
// Advisory output — exit code 0 always. Use to drive content audits.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { asText } from './lib/i18n.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m', GREEN = '\x1b[32m';
const c = (t, col) => `${col}${t}${RESET}`;

const THRESHOLD = Number(process.argv.find(a => a.startsWith('--threshold='))?.slice(12)) || 0.3;

// Normalize a question for structural-uniqueness counting: collapse digits
// to N so "5 + 3" and "7 + 2" count as ONE structural question, while
// "(x+2)(x-5)" and "x² = 144" count as DIFFERENT structures.
function structural(q) {
  return String(q || '')
    .replace(/-?\d+(?:[.,]\d+)?/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const suspicious = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const all = (s.pages || []).flatMap(p => p.exercises || []);
    if (all.length < 10) continue;
    const rationales = new Set();
    const questionShapes = new Set();
    const answers = new Set();
    for (const e of all) {
      if (e.rationale != null) rationales.add(asText(e.rationale).trim());
      questionShapes.add(structural(asText(e.question)));
      if (e.correctAnswer != null) answers.add(asText(e.correctAnswer).trim());
    }
    if (questionShapes.size < 5) continue; // single-concept drill — skip
    // Expected rationale diversity should track whichever is SMALLER:
    // unique question shapes or unique answers. A counting-drill with 100
    // distinct symbol-arrangements but only 10 answer values legitimately
    // has ~10 rationales (one per count).
    const expected = Math.min(questionShapes.size, Math.max(answers.size, 1));
    const ratio = rationales.size / expected;
    // Categorical rule-grouping: ≥3 distinct rationales each covering
    // ≤8 exercises is a legitimate spelling/grammar/conjugation drill
    // where one rule explains many surface forms (e.g. plurals split
    // into vocal-átona / consonante / z→c rule groups).
    const isRuleGrouped = rationales.size >= 3 && all.length / rationales.size <= 8;
    if (ratio < THRESHOLD && !isRuleGrouped) {
      suspicious.push({
        file: f.replace('src/levels/', ''),
        questionShapes: questionShapes.size,
        uniqueAnswers: answers.size,
        uniqueRationales: rationales.size,
        total: all.length,
        ratio,
        samples: [...rationales].slice(0, 3),
      });
    }
  }
  suspicious.sort((a, b) => a.ratio - b.ratio);

  console.log(c('\n🧭 RATIONALE DIVERSITY CHECK', BOLD));
  console.log(`  Threshold: unique_rationales / unique_question_shapes ≥ ${THRESHOLD}\n`);
  if (!suspicious.length) {
    console.log(c(`✅ Every diverse set has enough rationale variety.`, GREEN));
    process.exit(0);
  }
  console.log(c(`⚠️  ${suspicious.length} set(s) need a content audit:`, YELLOW));
  for (const s of suspicious) {
    const color = s.ratio < 0.1 ? RED : YELLOW;
    console.log(`  ${c(s.file, BOLD)}  ${c(s.uniqueRationales + ' rats / ' + s.uniqueAnswers + ' answers / ' + s.questionShapes + ' shapes (' + Math.round(s.ratio*100) + '%)', color)}  ${c('· ' + s.total + ' ex', GRAY)}`);
    for (const r of s.samples) console.log(c(`     - ${r.slice(0, 80)}`, GRAY));
  }
  console.log('\n' + '─'.repeat(60));
  console.log(c('Next step: open suspicious sets and check whether', YELLOW));
  console.log(c('the same rationale genuinely applies to all exercise shapes.', YELLOW));
  console.log(c('If not, extract shape-specific rules (see scripts/fix-5a-rationales.js', YELLOW));
  console.log(c('and scripts/fix-binomial-rationales.js for templates).', YELLOW));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
