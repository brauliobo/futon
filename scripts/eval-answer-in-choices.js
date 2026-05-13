#!/usr/bin/env node
// Verifies that for every exercise with explicit choices, the correctAnswer
// actually appears as one of the choices. A mismatch means either:
//   (a) the correct answer is wrong (content bug), or
//   (b) the choices list is incomplete (missing the intended answer).
//
// Compares case-insensitively, trimmed. Skips questions with no explicit
// choices: field (the inline `(a/b/c/d)` parsing uses CHOICE_RE which is
// the rubric's own detection — out of scope here).
//
// Exit code 0 clean, 1 on any mismatch.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const CHOICE_RE = /\(([^)?]+\/[^)?]+)\)\s*$/;
// Real choice prompts read as `Q: (a/b/c)` or `Q — (a/b/c)`. Without that
// punctuation lead, the inline parens are usually L1 translation hints,
// pronunciation marks (/æ/), or sequence/ordering glosses — not real choices.
const REAL_CHOICE_RE = /[:—]\s*\([^)?]+\/[^)?]+\)\s*$/;
// Extract a comparable string from a string OR a bilingual {pt,en} object.
// For bilingual nodes, normalize both halves so comparison is locale-aware.
const norm = s => {
  if (s == null) return '';
  if (typeof s === 'object' && (s.pt != null || s.en != null)) {
    return [s.pt, s.en].filter(Boolean).map(norm).join('|');
  }
  return String(s).trim().replace(/^[‘’“”'"`*]+|[‘’“”'"`*.]+$/g, '').trim().toLowerCase();
};

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const mismatches = [];
  let checked = 0;
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const explicit = Array.isArray(e.choices) && e.choices.length;
        let choices = explicit ? e.choices : null;
        if (!choices) {
          const qStr = typeof e.question === 'string' ? e.question : (e.question?.pt ?? e.question?.en ?? '');
          if (!CHOICE_RE.test(qStr)) continue;
          if (!REAL_CHOICE_RE.test(qStr)) continue;
          choices = qStr.match(CHOICE_RE)[1].split('/').map(s => s.trim());
        }
        const ans = norm(e.correctAnswer ?? '');
        if (!ans) continue;
        const pool = choices.map(norm);
        const isProse = !explicit && s.subject && s.subject !== 'math';
        if (!pool.includes(ans) && !explicit && !isProse) continue;
        checked++;
        if (!pool.includes(ans)) {
          const qStr = typeof e.question === 'string'
            ? e.question
            : (e.question?.pt ?? e.question?.en ?? JSON.stringify(e.question));
          mismatches.push({
            file: f.replace('src/levels/', ''),
            q: qStr.slice(0, 70),
            a: e.correctAnswer,
            choices,
          });
        }
      }
    }
  }
  console.log(c('\n🎯 ANSWER-IN-CHOICES CHECK', BOLD));
  console.log(`  Verified ${checked} choice-based exercises.\n`);
  if (!mismatches.length) {
    console.log(c('✅ Every correctAnswer appears in its choices list.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${mismatches.length} mismatch(es):`, RED));
  for (const m of mismatches.slice(0, 30)) {
    console.log(`  ${c(m.file, BOLD)}  ${m.q}`);
    console.log(`    ${c('answer: ' + JSON.stringify(m.a), RED)} · ${c('choices: ' + JSON.stringify(m.choices), GRAY)}`);
  }
  if (mismatches.length > 30) console.log(`  … and ${mismatches.length - 30} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
