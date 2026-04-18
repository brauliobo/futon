#!/usr/bin/env node
// Cross-set conflict scanner. Flags questions that appear in 2+ sets of
// the same level with DIFFERENT expected answers. A student progressing
// sequentially through a level will hit identical prompts with different
// expected forms — confusing.
//
// Exempts well-known synonym classes: for english/portuguese vocab,
// multiple valid translations ("casa" → "house"/"home") are legitimate.
// Only flags when the subject is math or when the answer variants aren't
// pure word synonyms.
//
// Exit 0 clean, 1 on conflicts.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const byLvlQ = new Map(); // "subject/level|question" → Map<setName, answer>
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const m = f.match(/src\/levels\/([^/]+)\/([^/]+)\//);
    const lvl = `${m[1]}/${m[2]}`;
    const setName = f.split('/').pop();
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const key = `${lvl}|${String(e.question)}`;
        if (!byLvlQ.has(key)) byLvlQ.set(key, new Map());
        byLvlQ.get(key).set(setName, String(e.correctAnswer));
      }
    }
  }

  const conflicts = [];
  for (const [k, setMap] of byLvlQ) {
    const answers = new Set(setMap.values());
    if (answers.size <= 1) continue;
    const [lvl, q] = k.split('|', 2);
    const [subject] = lvl.split('/');
    // Exempt english/portuguese vocabulary where two valid translations
    // are both reasonable (e.g. "casa" → house / home). Math, japanese
    // kanji mappings, and symbolic content must be deterministic.
    if (subject === 'english' || subject === 'portuguese') {
      const allWordy = [...answers].every(a => /^[\w\s-]+$/.test(a) && a.length <= 30);
      if (allWordy) continue;
    }
    conflicts.push({ lvl, q, variants: [...setMap.entries()] });
  }

  console.log(c('\n🔀 CROSS-SET CONFLICT SCANNER', BOLD));
  if (!conflicts.length) {
    console.log(c('✅ Every same-question/same-level pair agrees on its answer (or is a legit synonym).', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${conflicts.length} cross-set conflict(s):`, RED));
  for (const c0 of conflicts.slice(0, 30)) {
    console.log(`  ${c(c0.lvl, BOLD)}  ${c0.q.slice(0, 70)}`);
    for (const [file, ans] of c0.variants.slice(0, 5)) {
      console.log(c(`    ${file} → ${JSON.stringify(ans)}`, GRAY));
    }
  }
  if (conflicts.length > 30) console.log(c(`  … and ${conflicts.length - 30} more`, GRAY));
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
