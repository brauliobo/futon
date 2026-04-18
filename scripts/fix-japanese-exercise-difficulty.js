#!/usr/bin/env node
// Backfills exercise-level `difficulty` on Japanese sets. All 1,720
// Japanese exercises are currently missing the field, which means the
// gradient scorer can't measure page-to-page progression (it gets a free
// 20/20 pass via "diffs.length < 2").
//
// Strategy: assign each exercise the set's own `difficulty` as a
// conservative default. Within a set, Japanese content is typically
// uniform (all kana/kanji/vocab at the same tier), so a flat assignment
// matches reality. Authors can later refine per-exercise if a specific
// item is notably harder or easier.
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');

async function main() {
  const files = await fg('src/levels/japanese/**/set_*.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    const setDiff = Number(s.difficulty);
    if (!Number.isFinite(setDiff)) continue;
    let changed = 0;
    // Japanese sets use INLINE YAML. Match each exercise block as a whole
    // and insert `difficulty: N,` after `type: X,` when the block doesn't
    // already contain a difficulty field. Works regardless of the order
    // of other fields within the block.
    raw = raw.replace(
      /-\s*\{([^{}]*)\}/g,
      (m, body) => {
        if (/\bdifficulty:\s*\d/.test(body)) return m;
        // Insert after the first comma following `type: X`.
        const newBody = body.replace(
          /^(\s*type:\s*[\w_]+,)/,
          `$1 difficulty: ${setDiff},`,
        );
        if (newBody === body) return m;
        changed++;
        return `- {${newBody}}`;
      },
    );
    if (changed) {
      total += changed;
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `· ${changed} exercises (setDiff=${setDiff})`);
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${total} insert(s).`);
  if (!APPLY && total) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
