#!/usr/bin/env node
// One-off polish fixer: append "." to `example:` fields that lack terminal
// punctuation (.!?)). Edits the YAML line directly to preserve quoting and
// comments. Dry-run by default; pass --apply to write.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const files = await fg('src/levels/**/set_*.yaml');

let changed = 0;
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const s = YAML.parse(raw);
  const ex = String(s.example || '').trim();
  if (!ex) continue;
  if (/[.!?')]$/.test(ex)) continue;
  // Replace in raw YAML: find example: <string> line(s). Handle quoted-scalar
  // on single line and folded/block scalars.
  const single = /(^\s*example:\s*)(['"])([^\n]*?)\2(\s*)$/m;
  const unquoted = /(^\s*example:\s*)(?!['"])([^\n]*?)(\s*)$/m;
  let matched = false;
  if (single.test(raw)) {
    const newRaw = raw.replace(single, (m, p, q, body, tail) => {
      if (body.trim() !== ex) return m;
      return `${p}${q}${body}.${q}${tail}`;
    });
    if (newRaw !== raw) {
      if (APPLY) writeFileSync(f, newRaw, 'utf8');
      changed++; matched = true;
      if (changed <= 5) console.log(`  ${f.replace('src/levels/','')}: "…${body_tail(ex)}" → "…${body_tail(ex)}."`);
    }
  }
  if (!matched) {
    // Skip folded-scalar cases to be safe
  }
}

function body_tail(s) { return s.length > 30 ? s.slice(-30) : s; }

console.log(`\n${APPLY ? '✅ Applied' : 'Would apply'} period to ${changed} example fields.`);
if (!APPLY) console.log('Re-run with --apply to write.');
