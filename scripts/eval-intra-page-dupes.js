#!/usr/bin/env node
// Intra-page duplicate scanner. Flags pages where the same question text
// appears with different expected answers — student sees identical prompts
// with no way to know which answer the app will accept.
//
// Legitimate in no case: even for quadratic roots "x² = 121" with both ±11
// as valid roots, the exercises should say "(raiz positiva)" / "(raiz
// negativa)" so the student knows which form is expected.
//
// Same-question/same-answer dupes are OK (spaced repetition).
//
// Exit code 0 when clean, 1 on any ambiguity.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const violations = [];
  const qText = (q) => typeof q === 'string' ? q : (q?.pt ?? q?.en ?? JSON.stringify(q));
  const aText = (a) => typeof a === 'string' || typeof a === 'number' ? String(a) : (a?.pt ?? a?.en ?? JSON.stringify(a));
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const [idx, p] of (s.pages || []).entries()) {
      const seen = new Map();
      for (const e of p.exercises || []) {
        const q = qText(e.question);
        const a = aText(e.correctAnswer ?? '');
        if (seen.has(q) && seen.get(q) !== a) {
          violations.push({
            file: f.replace('src/levels/', ''),
            page: p.pageNumber ?? idx + 1,
            q,
            a1: seen.get(q),
            a2: a,
          });
        } else if (!seen.has(q)) {
          seen.set(q, a);
        }
      }
    }
  }

  console.log(c('\n🎯 INTRA-PAGE DUPLICATE SCANNER', BOLD));
  if (!violations.length) {
    console.log(c('✅ Every same-question pair on the same page shares the same answer.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${violations.length} ambiguity(ies):`, RED));
  for (const v of violations.slice(0, 30)) {
    console.log(`  ${c(v.file, BOLD)}  p${v.page}  ${v.q}`);
    console.log(c(`    answer 1: ${JSON.stringify(v.a1)}`, GRAY));
    console.log(c(`    answer 2: ${JSON.stringify(v.a2)}`, GRAY));
  }
  if (violations.length > 30) console.log(c(`  … and ${violations.length - 30} more`, GRAY));
  console.log('\n' + '─'.repeat(60));
  console.log(c(`Fix: disambiguate the question text so each exercise is distinct.`, RED));
  console.log(c(`  Templates in scripts/fix-{quadratic-root,factoring-dupes,mesma-situacao}.js.`, GRAY));
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
