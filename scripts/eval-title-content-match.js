#!/usr/bin/env node
// Detects mismatches between a math set's title (or page titles) and its
// actual exercise content. Catches authoring bugs like a set titled
// "Tabuada do 8 e 9" whose pages drill 10× instead.
//
// Strategy: parse "Tabuada do N (e M)" patterns from set + page titles,
// extract the operands of each multiplication exercise on that page, and
// flag pages whose dominant multiplicand is none of the declared values.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m', RED = '\x1b[31m', YELLOW = '\x1b[33m', GREEN = '\x1b[32m';
const c = (t, col) => `${col}${t}${RESET}`;

const TABUADA_RE = /Tabuada do (\d+)(?:\s*e\s*(\d+))?/i;
const MULT_RE = /^\s*(\d+)\s*[×*]\s*(\d+)\s*=\s*$/;

function declaredFromTitle(title) {
  const m = String(title || '').match(TABUADA_RE);
  if (!m) return null;
  const ns = [Number(m[1])];
  if (m[2]) ns.push(Number(m[2]));
  return ns;
}

async function main() {
  const files = await fg('src/levels/math/**/set_*.yaml');
  const issues = [];
  const setLevelMismatches = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const setDeclared = declaredFromTitle(s.title);
    if (setDeclared) {
      const pageDeclaredUnion = new Set();
      for (const p of s.pages || []) {
        const d = declaredFromTitle(p.title);
        if (d) d.forEach(n => pageDeclaredUnion.add(n));
      }
      const missing = setDeclared.filter(n => pageDeclaredUnion.size && !pageDeclaredUnion.has(n));
      const stray = [...pageDeclaredUnion].filter(n => !setDeclared.includes(n));
      if (missing.length) {
        setLevelMismatches.push({
          file: f.replace('src/levels/', ''),
          setTitle: s.title,
          declared: setDeclared.join(' or '),
          pageUnion: [...pageDeclaredUnion].sort((a,b)=>a-b).join(', ') || '(none)',
          missing: missing.join(', ') || '—',
          stray: stray.join(', ') || '—',
        });
      }
    }
    for (const p of s.pages || []) {
      const pageDeclared = declaredFromTitle(p.title);
      const declared = pageDeclared || setDeclared;
      if (!declared) continue;
      if (/mistur|revis[ãa]o|mix/i.test(p.title || '')) continue;
      const operands = [];
      for (const e of p.exercises || []) {
        const m = String(e.question || '').match(MULT_RE);
        if (!m) continue;
        operands.push(Number(m[1]), Number(m[2]));
      }
      if (!operands.length) continue;
      const ok = operands.filter(n => declared.includes(n)).length;
      const ratio = ok / operands.length;
      if (ratio < 0.45) {
        const counts = operands.reduce((a, n) => (a[n] = (a[n] || 0) + 1, a), {});
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
          .map(([n, k]) => `${n}×${k}`).join(' ');
        issues.push({
          file: f.replace('src/levels/', ''),
          page: p.pageNumber,
          pageTitle: p.title,
          setTitle: s.title,
          declared: declared.join(' or '),
          ratio: Math.round(ratio * 100),
          top,
        });
      }
    }
  }

  console.log(c('\n🎯 TABUADA TITLE↔CONTENT MATCH', BOLD));
  if (setLevelMismatches.length) {
    console.log(c(`❌ ${setLevelMismatches.length} sets have a title that doesn't match their pages:`, RED));
    for (const i of setLevelMismatches) {
      console.log(`  ${c(i.file, BOLD)} set declares=${c(i.declared, YELLOW)} pages drill=${i.pageUnion} missing=${c(i.missing, RED)} stray=${c(i.stray, YELLOW)}`);
      console.log(`     set: "${i.setTitle}"`);
    }
  }
  if (!issues.length && !setLevelMismatches.length) {
    console.log(c('✅ Every "Tabuada do N" page drills the declared multiplicand.', GREEN));
    process.exit(0);
  }
  if (issues.length) console.log(c(`❌ ${issues.length} pages drill the wrong multiplicand:`, RED));
  for (const i of issues.slice(0, 50)) {
    console.log(`  ${c(i.file, BOLD)} p${i.page}: declared=${c(i.declared, YELLOW)} match=${i.ratio}% top=${i.top}`);
    console.log(`     set: "${i.setTitle}"  page: "${i.pageTitle}"`);
  }
  if (issues.length > 50) console.log(`  … and ${issues.length - 50} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
