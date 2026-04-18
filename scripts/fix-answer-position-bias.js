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
    // Match every `question: "<prefix> (a/b/c/d)"` line and reorder the
    // parenthetical. Preserve YAML quoting exactly.
    raw = raw.replace(
      /^(\s*(?:- )?\s*question:\s*)(".*?"|'.*?'|[^\n]+)(\r?\n)/gm,
      (m, prefix, qVal, nl) => {
        const quote = qVal[0] === '"' || qVal[0] === "'" ? qVal[0] : '';
        const body = quote ? qVal.slice(1, -1) : qVal;
        const cm = body.match(INLINE_CHOICE_RE);
        if (!cm) return m;
        const parts = cm[1].split('/').map(x => x.trim());
        if (parts.length < 2) return m;
        // Seed on the full question text → deterministic across runs.
        const shuffled = shuffle(parts, body);
        if (shuffled.join('/') === parts.join('/')) return m;
        const newBody = body.replace(INLINE_CHOICE_RE, `(${shuffled.join('/')})${cm[2]}`);
        return `${prefix}${quote}${newBody}${quote}${nl}`;
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
