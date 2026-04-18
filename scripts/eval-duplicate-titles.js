#!/usr/bin/env node
// Duplicate-title detector. Sets within the same level should have
// distinct titles so students/parents can identify them in the UI.
// Same-title sets look identical in lists and break navigation.
//
// Exit 0 clean, 1 on any duplicate title within a single level.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const byLvlTitle = new Map();
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const m = f.match(/src\/levels\/([^/]+)\/([^/]+)\//);
    const lvl = `${m[1]}/${m[2]}`;
    const key = `${lvl}|${s.title || '(untitled)'}`;
    if (!byLvlTitle.has(key)) byLvlTitle.set(key, []);
    byLvlTitle.get(key).push(f.split('/').pop());
  }
  const dupes = [...byLvlTitle.entries()].filter(([, fs]) => fs.length > 1);

  console.log(c('\n🏷️  DUPLICATE-TITLE CHECK', BOLD));
  if (!dupes.length) {
    console.log(c('✅ Every set in a level has a distinct title.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${dupes.length} level(s) with duplicate set titles:`, RED));
  for (const [k, fs] of dupes.slice(0, 20)) {
    const [lvl, title] = k.split('|');
    console.log(`  ${c(lvl, BOLD)}  "${title}" used by ${fs.length} sets:`);
    console.log(c(`    ${fs.slice(0, 10).join(', ')}${fs.length > 10 ? ' …' : ''}`, GRAY));
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
