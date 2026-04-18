#!/usr/bin/env node
// Neutralizes answer-position bias in inline `(a/b/c/d)` choice exercises.
// For each choice exercise, shuffles the choice order in the question text
// using a deterministic seed (question hash). Correct answer value is
// unchanged — only its POSITION in the parenthetical moves.
//
// Why: ChoiceExercise.vue uses Shuffle.withSeed for rendered choices, but
// only when `exercise.choices:` is an explicit array. All 4,885 choice
// exercises in this repo use inline `(a/b/c/d)` parentheticals, which
// render verbatim in the question text. Students learn "position 1 =
// correct" as a reading-comprehension cue when 100% of a set's answers
// sit at position 1. Shuffling the YAML neutralizes this.
//
// Uses a deterministic FNV-1a + LCG shuffle seeded by question hash, so
// re-running is idempotent.
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');

// FNV-1a hash → LCG shuffle, matching src/utils/Shuffle.js.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function shuffle(arr, seed) {
  const out = [...arr];
  let s = hash(String(seed)) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const INLINE_CHOICE_RE = /\(([^)?]+\/[^)?]+)\)(\s*)$/;

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const before = raw;
    // Match every question value in two YAML shapes:
    //   block:  `question: "X (a/b/c/d)"` on its own line
    //   inline: `{ …, question: "X (a/b/c/d)", … }` embedded in a brace
    // Preserve quoting exactly.
    const rewriteQuestion = (qValWithQuote) => {
      const quote = qValWithQuote[0] === '"' || qValWithQuote[0] === "'" ? qValWithQuote[0] : '';
      const body = quote ? qValWithQuote.slice(1, -1) : qValWithQuote;
      const cm = body.match(INLINE_CHOICE_RE);
      if (!cm) return null;
      const parts = cm[1].split('/').map(x => x.trim());
      if (parts.length < 2) return null;
      // Seed on the question PREFIX (before the choice parenthetical) so
      // re-running is idempotent — the parenthetical itself is what we're
      // modifying, so including it in the seed would change every run.
      const seed = body.slice(0, body.length - cm[0].length).trim();
      const shuffled = shuffle(parts, seed);
      if (shuffled.join('/') === parts.join('/')) return null;
      const newBody = body.replace(INLINE_CHOICE_RE, `(${shuffled.join('/')})${cm[2]}`);
      return `${quote}${newBody}${quote}`;
    };

    // Block form.
    raw = raw.replace(
      /^(\s*(?:- )?\s*question:\s*)(".*?"|'.*?'|[^\n]+)(\r?\n)/gm,
      (m, prefix, qVal, nl) => {
        const rewritten = rewriteQuestion(qVal);
        return rewritten ? `${prefix}${rewritten}${nl}` : m;
      },
    );
    // Inline brace form: `question: "X"` inside `- { … }`.
    raw = raw.replace(
      /(\bquestion:\s*)(".*?"|'.*?')/g,
      (m, prefix, qVal) => {
        const rewritten = rewriteQuestion(qVal);
        return rewritten ? `${prefix}${rewritten}` : m;
      },
    );
    if (raw === before) continue;
    // Count rewrites by comparing lines
    const diffCount = [...before.matchAll(/^(\s*(?:- )?\s*question:\s*.+)$/gm)].length -
      [...raw.matchAll(/^(\s*(?:- )?\s*question:\s*.+)$/gm)].length;
    // Actually count question lines that differ
    const bArr = before.split('\n'), rArr = raw.split('\n');
    let changed = 0;
    for (let i = 0; i < bArr.length; i++) if (bArr[i] !== rArr[i] && /question:/.test(bArr[i])) changed++;
    total += changed;
    console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `· ${changed} questions reordered`);
    if (APPLY) writeFileSync(f, raw);
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${total} reorder(s).`);
  if (!APPLY && total) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
