#!/usr/bin/env node
// Example-spoiler detector. The set-level `example:` field is displayed to
// the student before they start. When it contains the exact Q → A of the
// first exercise, the student can answer exercise #1 by rote recall rather
// than by applying the method — the example spoils its own first check.
//
// A GOOD example demonstrates the METHOD on a representative instance
// that is NOT one of the exercises (or at least not the first). practice
// pre-reader drills are excluded (intentional concrete demonstration).
//
// Scope skips:
//   - Japanese (kana drills rely on exact pattern demonstration)
//   - Math drill levels 1A-7A, A-B (arithmetic automaticity)
//   - Portuguese pre-reader 1A-7A (letter recognition)
//
// Advisory — exits 0 always.
//
// Usage:
//   pnpm eval:example-spoiler
//   pnpm eval:example-spoiler --subject english

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { asText } from './lib/i18n.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m', RED = '\x1b[31m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const FILTER_SUBJECT = argVal('--subject');

export const SKIP = [
  /\/japanese\//,
  /\/math\/(1A|2A|3A|4A|5A|6A|7A|A|B)\//,
  /\/portuguese\/(1A|2A|3A|4A|5A|6A|7A)\//,
];

// Extract the Q→A portion of an `example:` string. Returns {exQ, exA} or null.
export function parseExample(ex) {
  const m = asText(ex).match(/Ex\.:\s*(.+?)\s*→\s*(.+?)\.?$/);
  if (!m) return null;
  return { exQ: normalize(m[1]), exA: normalize(m[2]).replace(/\.$/, '') };
}

// Does example match first exercise? Returns true when both Q and A normalize
// to identical strings (the spoiler condition).
export function isSpoiler(example, firstQ, firstA) {
  const parsed = parseExample(example);
  if (!parsed) return false;
  return parsed.exQ === normalize(firstQ) && parsed.exA === normalize(firstA);
}

// Strip trailing parens ONLY when they look like an inline-choice list
// (contain "/" as separator). Content parens like "Ponto (3,5)" or
// "sen²(x) + cos²(x)" are kept so distinct exercises normalize to
// distinct strings (iter 150 TODO carried over to iter 196).
export function normalize(s) {
  return asText(s)
    .toLowerCase()
    .replace(/\(([^()]*\/[^()]*)\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const pattern = FILTER_SUBJECT
    ? `src/levels/${FILTER_SUBJECT}/**/set_*.yaml`
    : 'src/levels/**/set_*.yaml';
  const files = await fg(pattern);
  const hits = [];
  let checked = 0;
  for (const f of files) {
    if (SKIP.some(rx => rx.test(f))) continue;
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const ex = asText(s.example);
    const parsed = parseExample(ex);
    if (!parsed) continue;
    checked++;
    const firstEx = s.pages?.[0]?.exercises?.[0];
    if (!firstEx) continue;
    if (isSpoiler(ex, firstEx.question, firstEx.correctAnswer)) {
      const m = ex.match(/Ex\.:\s*(.+?)\s*→\s*(.+?)\.?$/);
      hits.push({
        f: f.replace('src/levels/', ''),
        exQ: m[1].slice(0, 55),
        exA: m[2].slice(0, 30),
      });
    }
  }

  console.log(c('\n🚨 EXAMPLE SPOILER', BOLD));
  console.log(`  Checked ${checked} non-drill sets with Q→A examples.\n`);

  if (!hits.length) {
    console.log(c('  ✅ No example-first-exercise duplication.', GREEN));
    process.exit(0);
  }

  console.log(c(`  ⚠️  ${hits.length} set(s) with example = exercise #1:`, YELLOW));
  for (const h of hits.slice(0, 20)) {
    console.log(`    ${h.f.padEnd(32)} ${c('"' + h.exQ + '" → "' + h.exA + '"', GRAY)}`);
  }
  if (hits.length > 20) console.log(c(`    … and ${hits.length - 20} more`, GRAY));

  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix options:', YELLOW));
  console.log(`  - Replace example with a DIFFERENT instance that shows the method.`);
  console.log(`  - Or keep Q but expand example to show the reasoning step:`);
  console.log(c(`      Before: Ex.: 5+3 = → 8`, GRAY));
  console.log(c(`      After:  Ex.: 5+3 = 5,6,7,8 (conte 3 para frente) → 8`, GRAY));
  console.log(`  - Or run pnpm fix:example-spoiler --apply for auto-fix.`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
