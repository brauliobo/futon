#!/usr/bin/env node
// Keyword-leak detector. Flags inline-choice questions where the correct
// answer's word tokens all appear unquoted in the question body — a giveaway
// pattern a student can solve by scanning for the matching word.
//
// Filters:
//   - Pre-reader levels (1A–7A in any subject) are excluded: the word/letter
//     recognition tasks there legitimately show the answer in the prompt.
//   - Japanese is excluded: kana/kanji lookup tasks reference characters
//     in the prompt by design.
//   - Content inside single or double quotes is stripped BEFORE checking,
//     since quoted spans are "text to analyze" (grammar sentences, passages)
//     where the answer appearing is the whole pedagogical point.
//   - "Binary option" pattern (at least one distractor also appears in the
//     unquoted prompt) is kept — that's the legitimate "is X or Y?" form.
//   - Token-level matching (letters+digits only), not substring, so "canta"
//     doesn't falsely match inside "cantar".
//
// Advisory only — exit 0 always. Real leaks are rare; false positives from
// edge cases (references in hints, enumerated sets) would otherwise gate CI.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const PRE_READER = /\/(1A|2A|3A|4A|5A|6A|7A)\//;
const INLINE_CHOICES = /\(([^()]*\/[^()]*)\)\s*$/;
const stripQuotes = s => String(s || '').replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '');
const tokenize = s => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const leaks = [];
  for (const f of files) {
    if (PRE_READER.test(f)) continue;
    if (f.includes('/japanese/')) continue;
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const q = String(e.question || '');
        const m = INLINE_CHOICES.exec(q);
        if (!m) continue;
        const parts = m[1].split('/').map(x => x.trim()).filter(Boolean);
        if (parts.length < 3) continue;
        const ans = String(e.correctAnswer || '').trim();
        if (ans.length < 2) continue;
        if (!parts.includes(ans)) continue;
        const qBody = q.slice(0, q.length - m[0].length);
        const qTokens = tokenize(stripQuotes(qBody));
        if (!qTokens.length) continue;
        const ansTokens = tokenize(ans);
        if (!ansTokens.length) continue;
        const ansPresent = ansTokens.every(t => qTokens.includes(t));
        if (!ansPresent) continue;
        const distractors = parts.filter(x => x !== ans);
        const distractorPresent = distractors.some(d => {
          const dt = tokenize(d);
          return dt.length && dt.every(t => qTokens.includes(t));
        });
        if (distractorPresent) continue;
        leaks.push({
          f: f.replace('src/levels/', ''),
          page: p.pageNumber,
          ans,
          q: q.slice(0, 100),
        });
      }
    }
  }

  console.log(c('\n🔑 KEYWORD-LEAK', BOLD));
  console.log(`  Checked ${files.length} sets (excluding pre-reader 1A–7A + japanese).`);
  console.log(`  A leak is when the correct answer's words all appear in the unquoted prompt`);
  console.log(`  AND no distractor does (so binary-option pattern stays legit).\n`);

  if (!leaks.length) {
    console.log(c('  ✅ No keyword leaks above threshold.', GREEN));
    process.exit(0);
  }

  console.log(c(`  ⚠️  ${leaks.length} exercise(s) with keyword leak:`, YELLOW));
  // Group by file for readability
  const byFile = {};
  for (const l of leaks) (byFile[l.f] ||= []).push(l);
  for (const [f, list] of Object.entries(byFile)) {
    console.log(`    ${c(f, BOLD)} ${c(`(${list.length})`, GRAY)}`);
    for (const l of list.slice(0, 4)) {
      console.log(`      ${c('p' + l.page, GRAY)} ${c('→', RED)} ${l.ans}  ${c('|', GRAY)} ${l.q}`);
    }
    if (list.length > 4) console.log(c(`      … and ${list.length - 4} more`, GRAY));
  }
  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix options:', YELLOW));
  console.log(`  - Rephrase the prompt so the answer no longer appears verbatim`);
  console.log(`  - If the answer MUST appear, wrap it in quotes (analyzed-text convention)`);
  console.log(`  - Advisory: exit 0 regardless.`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
