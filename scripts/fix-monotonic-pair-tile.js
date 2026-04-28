#!/usr/bin/env node
// Reorders pages of pair-tiled sets so that pair difficulty averages are
// monotonically non-decreasing across the set. Targets sets flagged by
// the gradient dimension with end-regression or 2-jump anomalies.
//
// Detects pair-tiling: pages come in consecutive identical-template pairs
// (i.e., page 2k+1 and 2k+2 share the same exercise difficulties). If
// pairing isn't detected, falls back to single-page sort by avg difficulty.
//
// Renumbers pageNumber on each page after reordering. Dry-run by default.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';

const APPLY = process.argv.includes('--apply');
const FILES = process.argv.slice(2).filter(a => !a.startsWith('--'));

function pageAvg(p) {
  const ds = (p.exercises || []).map(e => e.difficulty).filter(Number.isFinite);
  if (!ds.length) return null;
  return ds.reduce((a, b) => a + b, 0) / ds.length;
}

function detectPairs(pages) {
  if (pages.length % 2 !== 0) return null;
  const pairs = [];
  for (let i = 0; i < pages.length; i += 2) {
    const a = pages[i], b = pages[i + 1];
    const avgA = pageAvg(a), avgB = pageAvg(b);
    if (avgA == null || avgB == null) return null;
    if (Math.abs(avgA - avgB) > 0.05) return null;
    pairs.push({ pages: [a, b], avg: (avgA + avgB) / 2 });
  }
  return pairs;
}

function reorder(setRaw) {
  const set = YAML.parse(setRaw);
  const pages = set.pages || [];
  if (pages.length < 4) return null;
  const pairs = detectPairs(pages);
  let newPages;
  if (pairs) {
    pairs.sort((a, b) => a.avg - b.avg);
    newPages = pairs.flatMap(p => p.pages);
  } else {
    const sorted = pages.map(p => ({ p, avg: pageAvg(p) ?? Infinity }))
                       .sort((a, b) => a.avg - b.avg)
                       .map(x => x.p);
    newPages = sorted;
  }
  newPages.forEach((p, i) => { p.pageNumber = i + 1; });
  set.pages = newPages;
  return YAML.stringify(set, { lineWidth: 0 });
}

for (const f of FILES) {
  const raw = readFileSync(f, 'utf8');
  const out = reorder(raw);
  if (!out || out === raw) { console.log('[skip]', f); continue; }
  console.log(APPLY ? '[apply]' : '[dry]', f);
  if (APPLY) writeFileSync(f, out);
}
