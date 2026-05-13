#!/usr/bin/env node
// Structural fix: biology distractor fillers added to balance choice lengths
// landed on only one side of {pt, en} pairs, breaking pt/en numeric parity.
// This script mirrors known fillers to the missing side via in-place text
// edits (preserves original YAML formatting; YAML.stringify would reformat
// the whole file heavily).
//
// Idempotent. Run with --apply to write; default dry-run.

import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';

const PAIRS = [
  { pt: '(durante a fase G0 do ciclo celular)', en: '(during the G0 phase of the cell cycle)' },
  { pt: '(durante a fase G0 do ciclo)', en: '(during the G0 phase of the cycle)' },
  { pt: '(mediado por organela ausente em humanos)', en: '(mediated by an organelle absent in humans)' },
  { pt: '(conforme modelo histórico do século XIX)', en: '(per a 19th-century historical model)' },
  { pt: '(conforme proposto por Schleiden em 1838)', en: '(as proposed by Schleiden in 1838)' },
  { pt: '(mediado pelos centríolos do fuso)', en: '(mediated by spindle centrioles)' },
  { pt: '(conforme ciclo menstrual invertido)', en: '(per inverted menstrual cycle)' },
  { pt: '(na fase folicular tardia apenas)', en: '(in the late follicular phase only)' },
  { pt: '(mediado por células de Sertoli em fêmeas)', en: '(mediated by Sertoli cells in females)' },
  { pt: '(conforme tabela periódica de Mendeleev)', en: '(per Mendeleev periodic table)' },
  { pt: '(conforme modelo de Mendeleev)', en: '(per Mendeleev water model)' },
  { pt: '(descoberto por Lavoisier em 1789)', en: '(discovered by Lavoisier in 1789)' },
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Match a flow-style bilingual pair: {pt: "X", en: "Y"} (single or double quoted)
// Capture: group 1 = pt text (inside quotes), group 2 = en text.
const PAIR_RE = /(\{pt:\s*)(["'])((?:\\.|(?!\2).)*)\2(\s*,\s*en:\s*)(["'])((?:\\.|(?!\5).)*)\5(\s*\})/g;

function balanceTexts(pt, en) {
  let np = pt, ne = en, changed = 0;
  for (const { pt: ptF, en: enF } of PAIRS) {
    const ptHas = np.includes(ptF);
    const enHas = ne.includes(enF);
    if (ptHas && !enHas) { ne = `${ne} ${enF}`; changed++; }
    else if (!ptHas && enHas) { np = `${np} ${ptF}`; changed++; }
  }
  return { pt: np, en: ne, changed };
}

const apply = process.argv.includes('--apply');
const files = await fg('src/levels/biology/**/set_*.yaml');
let grandTotal = 0, filesTouched = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let touched = 0;
  const out = src.replace(PAIR_RE, (m, h1, q1, pt, mid, q2, en, tail) => {
    const { pt: np, en: ne, changed } = balanceTexts(pt, en);
    if (!changed) return m;
    touched += changed;
    return `${h1}${q1}${np}${q1}${mid}${q2}${ne}${q2}${tail}`;
  });
  if (touched > 0) {
    grandTotal += touched;
    filesTouched++;
    if (apply) writeFileSync(f, out);
    console.log(`${f}: ${touched} balanced`);
  }
}
console.log(`\nTotal: ${grandTotal} across ${filesTouched} files ${apply ? '(written)' : '(dry-run, use --apply)'}`);
