#!/usr/bin/env node
// Adds `objectives: [japanese.vocab]` to every japanese/ exercise that
// lacks an objectives field, and to the set-level objectives if missing.
// Follows the same inline-YAML shape as fix-japanese-rationales.js.
//
// Usage: node scripts/fix-japanese-objectives.js [--apply]

import fs from 'fs';
import path from 'path';

const APPLY = process.argv.includes('--apply');
const TAG = 'japanese.vocab';

function rewriteExerciseLine(line) {
  const m = /^(\s*- \{ )(.*?)( \})\s*$/.exec(line);
  if (!m) return null;
  const [, prefix, inside, suffix] = m;
  if (/objectives:/.test(inside)) return null;
  return `${prefix}${inside}, objectives: [${TAG}]${suffix}`;
}

function ensureSetObjectives(lines) {
  if (lines.some(l => /^objectives:/.test(l))) return 0;
  const idx = lines.findIndex(l => /^subject:\s*japanese/.test(l));
  if (idx < 0) return 0;
  lines.splice(idx + 1, 0, `objectives: [${TAG}]`);
  return 1;
}

function processFile(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  const lines = raw.split('\n');
  let changes = ensureSetObjectives(lines);
  for (let i = 0; i < lines.length; i++) {
    const rw = rewriteExerciseLine(lines[i]);
    if (rw) { lines[i] = rw; changes++; }
  }
  if (changes && APPLY) fs.writeFileSync(fp, lines.join('\n'), 'utf8');
  return changes;
}

function walk() {
  const files = [];
  const dir = path.join(process.cwd(), 'src', 'levels', 'japanese');
  if (!fs.existsSync(dir)) return files;
  for (const level of fs.readdirSync(dir).sort()) {
    const ld = path.join(dir, level);
    if (!fs.statSync(ld).isDirectory()) continue;
    for (const f of fs.readdirSync(ld).filter(f => /\.ya?ml$/.test(f)).sort())
      files.push(path.join(ld, f));
  }
  return files;
}

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

let total = 0, filesChanged = 0;
for (const f of walk()) {
  const ch = processFile(f);
  if (ch) {
    filesChanged++;
    total += ch;
    console.log(c(`  ${f.replace(process.cwd() + '/', '')}`, CYAN), c(`${ch} line(s)`, GREEN));
  }
}
console.log('\n' + '═'.repeat(60));
if (!total) { console.log(c('No objectives to add.', GREEN)); process.exit(0); }
const verb = APPLY ? 'added' : 'would add';
console.log(c(`${verb} objectives to ${total} lines across ${filesChanged} file(s)`, BOLD + (APPLY ? GREEN : YELLOW)));
if (!APPLY) console.log(c('Re-run with --apply to write changes.', GRAY));
