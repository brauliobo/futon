#!/usr/bin/env node
// One-shot: ensure every math set has exactly 20 pages by cyclically tiling existing pages.
// Preserves Kumon massed-practice rotation (A,B,A,B,...) already baked into each set.
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import YAML from 'yaml';

const TARGET_PAGES = 20;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const deep = (o) => JSON.parse(JSON.stringify(o));

const tileTo = (pages, n) => Array.from({ length: n }, (_, i) => deep(pages[i % pages.length]));

const renumber = (pages) => pages.map((p, i) => {
  const n = i + 1;
  const title = typeof p.title === 'string' ? p.title.replace(/Página\s+\d+/g, `Página ${n}`) : p.title;
  return { ...p, pageNumber: n, title };
});

const computeTarget = (pages) => pages.reduce((s, p) => s + (p.exercises?.length || 0), 0);

const files = await fg(['src/levels/math/**/set_*.yaml'], { cwd: root, absolute: true });
let changed = 0;
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const data = YAML.parse(text);
  const current = Array.isArray(data.pages) ? data.pages.length : 0;
  if (current === TARGET_PAGES) continue;
  if (current === 0) { console.warn(`skip (no pages): ${path.relative(root, file)}`); continue; }
  const tiled = renumber(tileTo(data.pages, TARGET_PAGES));
  data.pages = tiled;
  data.target = computeTarget(tiled);
  await writeFile(file, YAML.stringify(data), 'utf8');
  changed += 1;
  console.log(`${path.relative(root, file)}: ${current} → ${TARGET_PAGES}`);
}
console.log(`Done. ${changed}/${files.length} files updated.`);
