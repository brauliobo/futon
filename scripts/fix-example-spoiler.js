#!/usr/bin/env node
// Auto-fixer for example-spoiler. For each set where the `example:` field
// duplicates exercise #1 verbatim, swap the Q→A in the example to use a
// DIFFERENT exercise — preferably the middle of the set — so the example
// still demonstrates the method but no longer spoils exercise #1.
//
// Safe rewrite rules:
//   - Only modifies the "Ex.: X → Y" portion of the example; leaves the
//     preceding pedagogy text alone.
//   - Picks an exercise from the middle of the set so easier exercises at
//     the start aren't exposed.
//   - Dry-run by default; pass --apply to write.
//
// Usage:
//   pnpm fix:example-spoiler           # dry-run
//   pnpm fix:example-spoiler --apply

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

const SKIP = [
  /\/japanese\//,
  /\/math\/(1A|2A|3A|4A|5A|6A|7A|A|B)\//,
  /\/portuguese\/(1A|2A|3A|4A|5A|6A|7A)\//,
];

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\([^()]+\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let changed = 0, skipped = 0;
  for (const f of files) {
    if (SKIP.some(rx => rx.test(f))) continue;
    const raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    const ex = String(s.example || '');
    const m = ex.match(/^(.*?Ex\.:\s*)(.+?)(\s*→\s*)(.+?)(\.?)$/);
    if (!m) continue;
    const [, prefix, exQ, arrow, exA, trailing] = m;
    const firstEx = s.pages?.[0]?.exercises?.[0];
    if (!firstEx) continue;
    if (normalize(firstEx.question) !== normalize(exQ) ||
        normalize(firstEx.correctAnswer) !== normalize(exA)) continue;

    // Pick a donor exercise from the middle of the set
    const all = (s.pages || []).flatMap(p => p.exercises || []);
    if (all.length < 3) { skipped++; continue; }
    const donor = all[Math.floor(all.length / 2)] || all[1];
    const donorQ = String(donor.question || '').replace(/\([^()]+\)\s*$/, '').trim();
    const donorA = String(donor.correctAnswer ?? '').trim();
    if (!donorQ || !donorA) { skipped++; continue; }
    if (normalize(donorQ) === normalize(exQ)) { skipped++; continue; }

    // Textual replacement preserving surrounding whitespace
    const oldExBlock = `${prefix}${exQ}${arrow}${exA}${trailing}`;
    const newExBlock = `${prefix}${donorQ}${arrow}${donorA}${trailing}`;
    const newExample = ex.replace(oldExBlock, newExBlock);
    if (newExample === ex) { skipped++; continue; }

    // Line-level replace in raw YAML so formatting (quotes, comments) is kept
    const exLineRe = /(^\s*example:\s*)(['"]?)(.*?)\2(\s*)$/m;
    if (!exLineRe.test(raw)) { skipped++; continue; }
    const newRaw = raw.replace(exLineRe, (_, p1, q, body, tail) => {
      if (body !== ex) return _; // mismatch — skip
      const delim = q || '"';
      return `${p1}${delim}${newExample.replace(/"/g, '\\"')}${delim}${tail}`;
    });
    if (newRaw === raw) { skipped++; continue; }

    changed++;
    console.log(c(`  ${f.replace('src/levels/', '')}`, BOLD));
    console.log(c(`    old: Ex.: ${exQ} → ${exA}`, GRAY));
    console.log(c(`    new: Ex.: ${donorQ} → ${donorA}`, GREEN));
    if (APPLY) writeFileSync(f, newRaw, 'utf8');
  }

  console.log('');
  if (!changed) { console.log(c('No fixable spoilers found.', GREEN)); return; }
  if (APPLY) console.log(c(`✅ Applied ${changed} fix(es) · skipped ${skipped}`, GREEN));
  else console.log(c(`Would fix ${changed} · skipped ${skipped}. Re-run with --apply to write.`, YELLOW));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
