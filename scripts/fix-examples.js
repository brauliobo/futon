#!/usr/bin/env node
// Augments `example:` fields that lack a worked pair. Reads the first
// exercise of the set, appends " Ex.: <question> → <answer>." so the
// evaluator's example dimension credits a concrete model. Dry-run by
// default; --apply to write.

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SUBJECT = argVal('--subject');
const LEVEL = argVal('--level');
const APPLY = args.includes('--apply');
const SUBJECTS = SUBJECT ? [SUBJECT] : ['math', 'portuguese', 'english', 'japanese'];

const HAS_MODEL_RE = /ex\.?:|e\.g\.:|→|=/i;
const CHOICE_SUFFIX_RE = /\s*\([^)]+\/[^)]+\)\s*$/;

function pickFirstExercise(set) {
  for (const p of set.pages || [])
    for (const ex of p.exercises || [])
      if (ex.question != null && ex.correctAnswer != null) return ex;
  return null;
}

function buildAddition(ex) {
  const q = String(ex.question).replace(CHOICE_SUFFIX_RE, '').trim();
  const a = String(ex.correctAnswer).trim();
  if (!q || !a) return null;
  const qShort = q.length > 48 ? q.slice(0, 45) + '…' : q;
  const aShort = a.length > 30 ? a.slice(0, 27) + '…' : a;
  return `Ex.: ${qShort} → ${aShort}.`;
}

function rewriteLine(line, addition) {
  const m = /^(\s*example:\s*)(["']?)([^"'\n]*)(\2)\s*$/.exec(line);
  if (!m) return null;
  const [, prefix, quote, body] = m;
  if (!body.trim() || HAS_MODEL_RE.test(body)) return null;
  const core = body.trim().replace(/\s*\.$/, '');
  const merged = `${core}. ${addition}`.replace(/"/g, '\\"');
  return `${prefix.replace(/\s*$/, ' ')}"${merged}"`;
}

function processFile(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  let parsed;
  try { parsed = parse(raw); } catch { return { changed: false }; }
  if (!parsed || HAS_MODEL_RE.test(parsed.example || '')) return { changed: false };
  const firstEx = pickFirstExercise(parsed);
  if (!firstEx) return { changed: false };
  const addition = buildAddition(firstEx);
  if (!addition) return { changed: false };
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const newLine = rewriteLine(lines[i], addition);
    if (newLine) {
      lines[i] = newLine;
      if (APPLY) fs.writeFileSync(fp, lines.join('\n'), 'utf8');
      return { changed: true, preview: lines[i].trim() };
    }
  }
  return { changed: false };
}

function walkSets() {
  const files = [];
  for (const subject of SUBJECTS) {
    const dir = path.join(process.cwd(), 'src', 'levels', subject);
    if (!fs.existsSync(dir)) continue;
    for (const level of fs.readdirSync(dir).sort()) {
      if (LEVEL && level !== LEVEL) continue;
      const ld = path.join(dir, level);
      if (!fs.statSync(ld).isDirectory()) continue;
      for (const file of fs.readdirSync(ld).filter(f => /\.ya?ml$/.test(f)).sort()) {
        files.push(path.join(ld, file));
      }
    }
  }
  return files;
}

const files = walkSets();
let changed = 0;
for (const f of files) {
  const r = processFile(f);
  if (r.changed) {
    changed++;
    console.log(c(`  ${f.replace(process.cwd() + '/', '')}`, CYAN));
    console.log(c(`    → ${r.preview}`, GRAY));
  }
}
console.log('\n' + '═'.repeat(60));
if (!changed) { console.log(c('No examples needed augmenting.', GREEN)); process.exit(0); }
const verb = APPLY ? 'augmented' : 'would augment';
console.log(c(`${verb} ${changed} example field(s)`, BOLD + (APPLY ? GREEN : YELLOW)));
if (!APPLY) console.log(c('Re-run with --apply to write changes.', GRAY));
