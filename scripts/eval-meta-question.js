#!/usr/bin/env node
// Hard-fail: detects "meta-question" shells — questions whose stem is a
// template placeholder instead of actual teaching content.
//
// Canonical bad pattern (found in PT D/11-20 originally):
//   Q: "Complete a frase sobre X: A ideia principal é ___"
//   A: "clara"
// The question teaches nothing; it's a template artifact.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = path.join(ROOT, 'src', 'levels');

export const PATTERNS = [
  { name: 'complete-sobre', re: /^complete a frase sobre .{3,}:.{0,80}___\s*$/i },
  { name: 'pratique-topic', re: /^pratique [a-záéíóúâêôãõç\s,]{5,}\.?\s*$/i },
];

export function detect(question) {
  if (!question) return null;
  for (const p of PATTERNS) if (p.re.test(question.trim())) return p.name;
  return null;
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
        const tag = detect(ex?.question);
        if (tag) hits.push({ file: path.relative(ROOT, f), page: page.pageNumber, tag, q: ex.question });
      }
    }
  }
  const BOLD = '\x1b[1m', GREEN = '\x1b[32m', RED = '\x1b[31m', RESET = '\x1b[0m', GRAY = '\x1b[90m';
  console.log(`${BOLD}\n🎯 META-QUESTION CHECK${RESET}`);
  console.log(`  Scanned ${scanned} exercises across all levels.\n`);
  if (hits.length === 0) {
    console.log(`${GREEN}  ✅ No meta-template questions.${RESET}`);
    process.exit(0);
  }
  console.log(`${RED}  ❌ ${hits.length} meta-template question(s):${RESET}`);
  for (const h of hits) console.log(`    ${h.file} p${h.page} [${h.tag}] ${GRAY}${h.q}${RESET}`);
  process.exit(1);
}

if (import.meta.url === 'file://' + process.argv[1]) main();
