#!/usr/bin/env node
// Distractor-shape gate. Flags terse-filler distractors next to a long
// (>50 char PT) correct answer. The asymmetry is a known anti-pattern:
// students learn "pick the long one" instead of the content. See
// memory feedback_distractor_style.md.
//
// Terse fillers detected: "Apenas X", "Sem aplicabilidade",
// "Não é viável", "Sem qualquer significado", and similarly short
// boilerplate phrases (<= 35 chars and matching a filler regex).

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import fg from 'fast-glob';

const FILLER_RE = [
  /^Apenas\b/i,
  /^Somente\b/i,
  /^Sem aplicabilidade/i,
  /^Sem qualquer significado/i,
  /^Sem (uso|relev[âa]ncia|valor)/i,
  /^N[ãa]o (é|e) vi[áa]vel/i,
  /^N[ãa]o (se )?aplica/i,
  /^Nenhuma\b/i,
  /^Irrelevante/i,
];

const ptOf = v => typeof v === 'string' ? v : (v && typeof v === 'object' ? v.pt || '' : '');

function isTerseFiller(choice) {
  const s = ptOf(choice).trim();
  if (!s || s.length > 35) return false;
  return FILLER_RE.some(re => re.test(s));
}

const files = await fg('src/levels/**/set_*.yaml');
const perSet = [];
let totalHits = 0;

for (const f of files) {
  let set;
  try { set = parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  if (!set) continue;
  let hits = 0;
  for (const p of set.pages || []) {
    for (const ex of p.exercises || []) {
      const correctPt = ptOf(ex.correctAnswer);
      if (correctPt.length <= 50) continue;
      const choices = Array.isArray(ex.choices) ? ex.choices : [];
      const fillers = choices.filter(isTerseFiller).length;
      if (fillers > 0) hits++;
    }
  }
  if (hits > 0) { perSet.push({ f, hits }); totalHits += hits; }
}

if (perSet.length === 0) {
  console.log(`✅ Distractor shape clean (${files.length} sets checked)`);
  process.exit(0);
}

perSet.sort((a, b) => b.hits - a.hits);
console.log(`❌ ${totalHits} terse-filler-near-long-correct exercise(s) across ${perSet.length} set(s):`);
for (const { f, hits } of perSet.slice(0, 40)) {
  console.log(`  ${path.relative(process.cwd(), f).padEnd(48)} ${String(hits).padStart(4)}`);
}
if (perSet.length > 40) console.log(`  … +${perSet.length - 40} more sets`);
process.exit(1);
