#!/usr/bin/env node
// Tautological-rationale detector. Flags rationales that reveal the answer
// without teaching — the classic "Observe as opções e escolha X" pattern
// and its variants. These provide zero pedagogical value: the student who
// got the answer wrong learns nothing from reading it.
//
// Patterns detected:
//   1. Echo-the-question: rationale literally restates the question followed
//      by the answer ("...'ResposX'" at end).
//   2. Look-at-options: "Observe as opções e escolha..." family.
//   3. Pure answer-quotation: rationale IS just the answer or its negation
//      (e.g. "Resposta: X." or "A resposta é X.").
//
// Advisory — exit 0 always.
//
// Usage:
//   pnpm eval:tautological                  # full report
//   pnpm eval:tautological --subject portuguese
//   pnpm eval:tautological --level 4A

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const FILTER_SUBJECT = argVal('--subject');
const FILTER_LEVEL = argVal('--level');

const PATTERNS = [
  { name: 'look-at-options', re: /^Observe as opções e escolha/ },
  { name: 'answer-is-X',     re: /^(A resposta [eé]|Resposta:)/i },
  { name: 'pick-the-correct', re: /^Escolha a (opção|alternativa) correta$/ },
];

// Echo pattern: rationale ends with quoted answer identical to correctAnswer.
function isEcho(rationale, answer) {
  const r = String(rationale || '').trim();
  const a = String(answer || '').trim();
  if (!r || !a) return false;
  // Rationale of shape: "...: 'X'." where X equals the answer
  const m = /:\s*['"“”‘’]([^'"“”‘’]+)['"“”‘’]\.?$/.exec(r);
  if (m && m[1].trim().toLowerCase() === a.toLowerCase()) return true;
  return false;
}

async function main() {
  let pattern = 'src/levels/**/set_*.yaml';
  if (FILTER_SUBJECT) pattern = `src/levels/${FILTER_SUBJECT}/**/set_*.yaml`;
  const files = await fg(pattern);
  const hits = [];
  let checked = 0;

  for (const f of files) {
    if (FILTER_LEVEL && !f.includes(`/${FILTER_LEVEL}/`)) continue;
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const ex of p.exercises || []) {
        checked++;
        const r = String(ex.rationale || '');
        if (!r) continue;
        let matchedPattern = null;
        for (const pat of PATTERNS) {
          if (pat.re.test(r)) { matchedPattern = pat.name; break; }
        }
        if (!matchedPattern && isEcho(r, ex.correctAnswer)) matchedPattern = 'echo-answer';
        if (matchedPattern) {
          hits.push({
            f: f.replace('src/levels/', ''),
            q: String(ex.question || '').slice(0, 55),
            a: ex.correctAnswer,
            pattern: matchedPattern,
          });
        }
      }
    }
  }

  console.log(c('\n🪞 TAUTOLOGICAL RATIONALES', BOLD));
  console.log(`  Checked ${checked} exercises.\n`);

  if (!hits.length) {
    console.log(c('  ✅ No tautological rationales.', GREEN));
    process.exit(0);
  }

  // Group by file and pattern.
  const byFile = {};
  for (const h of hits) (byFile[h.f] ||= []).push(h);
  const fileList = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);

  const patternCounts = {};
  for (const h of hits) patternCounts[h.pattern] = (patternCounts[h.pattern] || 0) + 1;

  console.log(c(`  ⚠️  ${hits.length} tautological rationale(s) across ${fileList.length} set(s):`, YELLOW));
  console.log(c('\n  By pattern:', BOLD));
  for (const [p, n] of Object.entries(patternCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${p.padEnd(20)} ${c(String(n).padStart(4), YELLOW)}`);
  }

  console.log(c('\n  Top 15 offending sets:', BOLD));
  for (const [f, list] of fileList.slice(0, 15)) {
    console.log(`    ${f.padEnd(32)} ${c(String(list.length).padStart(4), RED)}  ${c(`(${list[0].pattern})`, GRAY)}`);
  }
  if (fileList.length > 15) console.log(c(`    … and ${fileList.length - 15} more sets`, GRAY));

  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix options:', YELLOW));
  console.log(`  - Rewrite rationales to teach WHY the answer is correct,`);
  console.log(`    not just WHAT the answer is.`);
  console.log(`  - Pre-reader (1A-5A) rationales can be simple but should`);
  console.log(`    reference a property ("gato mia", "A é primeira antes de B").`);
  console.log(`  - Advisory: exit 0 regardless.`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
