#!/usr/bin/env node
// Choice-length bias detector. Students can game a multiple-choice quiz by
// always picking the longest option when authors unintentionally write the
// correct answer with more detail than the distractors. This is a real
// pedagogical flaw even if the content is otherwise good.
//
// Reports per-set stats:
//  - Fraction of inline-choice questions where the correct answer is the
//    single longest option.
//  - Fraction where it's ≥1.5× the average distractor length.
//
// Mastery-grade threshold: correct-is-longest ≤ 40% of a set's choice questions.
// (Random baseline for a 4-choice quiz is ~25%; 40% is a gentle ceiling.)
//
// Advisory only — exit 0 always — to avoid blocking CI on subjective prose
// trade-offs while still surfacing bias to manual review.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const INLINE_CHOICES = /\(([^()]*\/[^()]*)\)\s*$/;
const norm = s => String(s || '').trim();

const splitChoices = q => {
  const m = INLINE_CHOICES.exec(q);
  if (!m) return null;
  const parts = m[1].split('/').map(norm).filter(Boolean);
  return parts.length >= 3 ? parts : null;
};

const LONGEST_CEILING = 0.40; // fraction of set's questions where correct is THE longest
const STRETCH_CEILING = 0.50; // fraction where correct ≥ 1.5× avg distractor

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const problems = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    let choiceQs = 0, correctLongest = 0, correctStretched = 0;
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const choices = splitChoices(e.question);
        if (!choices) continue;
        const ans = norm(e.correctAnswer);
        if (!choices.includes(ans)) continue; // eval-answers handles this
        choiceQs++;
        const lens = choices.map(x => x.length);
        const maxLen = Math.max(...lens);
        const minLen = Math.min(...lens);
        // Long-form comprehension question: when EVERY option is ≥30 chars,
        // the question is testing content recall / definition selection,
        // not pattern-spotting on length. Length variation is intrinsic
        // to the conceptual contrast and not a gameable cue.
        if (minLen >= 30) continue;
        const others = choices.filter(x => x !== ans);
        // Margin over the next-longest wrong (not the average) — a 1-char
        // plural difference in 'bonitas/bonita/bonito' is not gameable,
        // so require a meaningful gap before counting as biased.
        const maxOther = others.length ? Math.max(...others.map(x => x.length)) : 0;
        const margin = ans.length - maxOther;
        const isUniqueLongest = ans.length === maxLen && lens.filter(x => x === maxLen).length === 1;
        if (isUniqueLongest && margin >= 3 && ans.length >= maxOther * 1.15) {
          correctLongest++;
        }
        const avgOther = others.reduce((a, b) => a + b.length, 0) / others.length;
        // Stretch bias only matters when students could game by picking the
        // longer option. If another wrong is >=2 chars longer than correct,
        // pattern-spotting fails — skip.
        const stretchable = ans.length >= maxOther - 2;
        if (stretchable && avgOther > 0 && ans.length >= 1.5 * avgOther) correctStretched++;
      }
    }
    if (choiceQs < 4) continue; // too small to judge
    const longestFrac = correctLongest / choiceQs;
    const stretchFrac = correctStretched / choiceQs;
    if (longestFrac > LONGEST_CEILING || stretchFrac > STRETCH_CEILING) {
      problems.push({ f, choiceQs, correctLongest, correctStretched, longestFrac, stretchFrac });
    }
  }

  console.log(c('\n📐 CORRECT-ANSWER-LENGTH BIAS', BOLD));
  console.log(`  Checked ${files.length} sets.`);
  console.log(`  Ceiling: correct-is-longest ≤ ${Math.round(LONGEST_CEILING * 100)}%, correct ≥ 1.5× distractor avg ≤ ${Math.round(STRETCH_CEILING * 100)}%.\n`);

  if (!problems.length) {
    console.log(c('  ✅ No choice-length bias above threshold.', GREEN));
    process.exit(0);
  }

  problems.sort((a, b) => b.longestFrac - a.longestFrac);
  console.log(c(`  ⚠️  ${problems.length} set(s) with choice-length bias:`, YELLOW));
  for (const p of problems.slice(0, 25)) {
    const lCol = p.longestFrac > LONGEST_CEILING ? RED : GRAY;
    const sCol = p.stretchFrac > STRETCH_CEILING ? RED : GRAY;
    console.log(
      `    ${p.f.replace('src/levels/', '').padEnd(28)}  ` +
      c(`${p.correctLongest}/${p.choiceQs} longest (${Math.round(p.longestFrac * 100)}%)`, lCol) +
      '  ' +
      c(`${p.correctStretched}/${p.choiceQs} ≥1.5× (${Math.round(p.stretchFrac * 100)}%)`, sCol),
    );
  }
  if (problems.length > 25) console.log(c(`    … and ${problems.length - 25} more`, GRAY));

  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix options:', YELLOW));
  console.log(`  - Expand distractors with equally specific (but wrong) detail`);
  console.log(`  - Shorten the correct answer to the minimal specific version`);
  console.log(`  - Advisory: exit 0 regardless.`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
