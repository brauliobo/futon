#!/usr/bin/env node
// Rationale-depth gate. Flags PT rationales that are short (< 60 chars)
// AND don't cite a mechanism, year, scientist, or process — typical
// "Quando X, então Y" tautological summaries that teach nothing.
//
// A rationale is considered substantive (not weak) if ANY of:
//   - >= 60 chars (PT side), OR
//   - cites a 4-digit year (1700-2099), OR
//   - cites a CapitalizedName (likely scientist/lab/tool), OR
//   - cites a process/mechanism keyword (regex list).

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import fg from 'fast-glob';

const ptOf = v => typeof v === 'string' ? v : (v && typeof v === 'object' ? v.pt || '' : '');

const YEAR_RE = /\b(1[789]\d{2}|20\d{2})\b/;
const NAME_RE = /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,})?\b/;
const MECH_RE = /\b(mecanismo|processo|reação|reacao|enzima|catalis|síntese|sintese|transcri|tradu[çc][ãa]o|replica[çc][ãa]o|mitose|meiose|fotoss[íi]ntese|respira[çc][ãa]o|fermenta[çc][ãa]o|hidrólise|hidrolise|fosforila|metila|acetila|ubiquitina|apoptose|autofagia|endocitose|exocitose|difus[ãa]o|osmose|gradiente|membrana|receptor|ligante|antic|ant[íi]geno|ribossomo|mitocôndr|mitocondr|cloroplasto|n[úu]cleo|cromossomo|gene|alelo|mutação|mutacao|sele[çc][ãa]o|evolu[çc][ãa]o|filogen|hom[óo]log|ortolog|paralog|sintenia|epistasia|fen[óo]tipo|gen[óo]tipo)\b/i;

function isWeak(pt) {
  const s = pt.trim();
  if (!s) return false;
  if (s.length >= 60) return false;
  if (YEAR_RE.test(s)) return false;
  if (NAME_RE.test(s)) return false;
  if (MECH_RE.test(s)) return false;
  return true;
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
      if (isWeak(ptOf(ex.rationale))) hits++;
    }
  }
  if (hits > 0) { perSet.push({ f, hits }); totalHits += hits; }
}

if (perSet.length === 0) {
  console.log(`✅ Rationale depth clean (${files.length} sets checked)`);
  process.exit(0);
}

perSet.sort((a, b) => b.hits - a.hits);
console.log(`❌ ${totalHits} weak rationale(s) across ${perSet.length} set(s):`);
for (const { f, hits } of perSet.slice(0, 40)) {
  console.log(`  ${path.relative(process.cwd(), f).padEnd(48)} ${String(hits).padStart(4)}`);
}
if (perSet.length > 40) console.log(`  … +${perSet.length - 40} more sets`);
process.exit(1);
