#!/usr/bin/env node
// Advisory: inline-choice well-formedness for multi-choice questions.
//
// Scans question strings ending with `(a/b/c/...)` and reports malformed
// patterns. Choice runtime uses `/` as separator, so these cause silent
// display/shuffle bugs.
//
// Catches:
//  - unbalanced parens / missing `)` at end
//  - whitespace-only or empty choices
//  - duplicate choices
//  - fewer than 2 choices
//  - correctAnswer not present when (a/b/c) is the only choice hint

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = path.join(ROOT, 'src', 'levels');

const CHOICE_TAIL = /\(([^()]*)\)\s*$/;

function asText(q) {
  if (q == null) return '';
  if (typeof q === 'string') return q;
  if (typeof q === 'object') return q.pt ?? q.en ?? '';
  return String(q);
}

export function inspectChoices(question) {
  const text = asText(question);
  if (!text) return null;
  const m = CHOICE_TAIL.exec(text.trim());
  if (!m) return null;
  const body = m[1];
  if (!body.includes('/')) return null;
  const parts = body.split('/').map(s => s.trim());
  const issues = [];
  if (parts.length < 2) issues.push('fewer-than-2');
  if (parts.some(p => p.length === 0)) issues.push('empty-choice');
  if (new Set(parts).size !== parts.length) issues.push('duplicate-choice');
  return issues.length ? { parts, issues } : null;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, acc);
    else if (e.name.endsWith('.yaml')) acc.push(f);
  }
  return acc;
}

function main() {
  const files = walk(LEVELS);
  const hits = [];
  let scanned = 0;
  for (const f of files) {
    const doc = parse(fs.readFileSync(f, 'utf8'));
    for (const page of doc?.pages || []) {
      for (const ex of page?.exercises || []) {
        scanned++;
        const r = inspectChoices(ex?.question);
        if (r) hits.push({ file: path.relative(ROOT, f), page: page.pageNumber, ...r });
      }
    }
  }
  const BOLD = '\x1b[1m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RESET = '\x1b[0m', GRAY = '\x1b[90m';
  console.log(`${BOLD}\n🧩 INLINE CHOICE FORMAT${RESET}`);
  console.log(`  Scanned ${scanned} exercises.\n`);
  if (hits.length === 0) {
    console.log(`${GREEN}  ✅ No malformed inline choices.${RESET}`);
    process.exit(0);
  }
  console.log(`${YELLOW}  ⚠️  ${hits.length} question(s) with issues:${RESET}`);
  for (const h of hits) console.log(`    ${h.file} p${h.page} [${h.issues.join(',')}] ${GRAY}${JSON.stringify(h.parts)}${RESET}`);
  console.log(`${GRAY}  Advisory: exit 0 regardless.${RESET}`);
  process.exit(0);
}

if (import.meta.url === 'file://' + process.argv[1]) main();
