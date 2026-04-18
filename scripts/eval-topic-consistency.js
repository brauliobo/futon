#!/usr/bin/env node
// Topic-consistency check for bucketed rationales. If a rationale mentions
// a specific math concept token (e.g. "sec²", "Pitágoras", "arcsen"), EVERY
// exercise that uses that rationale should also mention the concept in the
// question text. Otherwise the bucket misapplies.
//
// Catches the bug class found in iter 82-90: hardcoded domain rationales
// assigned to exercises of the wrong topic (e.g. "∫ xⁿ dx = xⁿ⁺¹/(n+1)"
// applied to sec²(x) integrals, "Diferença de quadrados" on (x+a)(x+b)
// binomials).
//
// Exit 0 clean, 1 on any inconsistency.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', GRAY = '\x1b[90m', YELLOW = '\x1b[33m';
const c = (t, col) => `${col}${t}${RESET}`;

// Each entry: if the rationale contains `marker`, every exercise using it
// must contain ANY of `requires` in the question OR answer. Narrow markers
// so false positives are rare.
const RULES = [
  { marker: 'sec²', requires: ['sec²', 'tan'] },
  { marker: 'Pitágoras', requires: ['catet', 'ipotenusa', 'Pitág', '²', '90°', 'c = ?', 'c² =', 'Diagonal'] },
  { marker: 'arcsen', requires: ['arcsen', 'sen', 'asen'] },
  { marker: 'arccos', requires: ['arccos', 'cos', 'acos'] },
  { marker: 'arctan', requires: ['arctan', 'tan', 'atan'] },
  { marker: 'Diferença de quadrados', requires: ['(a+b)(a-b)', 'a² - b²', 'a²-b²', 'i)(', '(1+', '(2+', '(3+'] },
  { marker: 'Fórmula de Bhaskara', requires: ['= 0', 'ax²', '√'] },
  { marker: 'Lei dos senos', requires: ['sen', 'triângulo', 'lado', 'ângulo', '°', '2R'] },
  { marker: 'Lei dos cossenos', requires: ['cos', 'triângulo', 'lado', 'ângulo', '°', 'c =', 'c²', 'c ≈'] },
  { marker: 'Fórmula de Euler', requires: ['e^', 'e^(', 'cos', 'sen', 'i'] },
  { marker: 'De Moivre', requires: ['cis', 'θ', '°'] },
  { marker: 'Critério de Leibniz', requires: ['(-1)', 'alternad'] },
  { marker: 'Série geométrica', requires: ['Σ', 'q^n', '/2)^n', '/3)^n', '2^n', '1/(1-', 'série'] },
  { marker: 'p-série', requires: ['Σ', '1/n', 'p-série', 'p > 1'] },
  { marker: 'Teste da razão', requires: ['n!', 'aₙ₊₁', 'razão'] },
  { marker: 'Raízes n-ésimas', requires: ['raiz', 'raízes', 'cis', '°', '360', 'quadrada', 'cúbica', '±'] },
  { marker: 'Potências de i', requires: ['i⁴', 'i²', 'i³', 'i^', 'iⁿ'] },
  { marker: 'Triângulo 30-60-90', requires: ['30', '60', '90'] },
  { marker: 'Razões notáveis', requires: ['30°', '45°', '60°', 'sen', 'cos', 'tan'] },
];

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  const violations = [];
  let checked = 0;
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const r = String(e.rationale || '');
        if (!r) continue;
        for (const { marker, requires } of RULES) {
          if (!r.includes(marker)) continue;
          checked++;
          const blob = `${e.question || ''} ${e.correctAnswer ?? ''}`;
          if (!requires.some(tok => blob.includes(tok))) {
            violations.push({
              file: f.replace('src/levels/', ''),
              marker,
              q: String(e.question || '').slice(0, 60),
              a: e.correctAnswer,
              r: r.slice(0, 60),
            });
          }
        }
      }
    }
  }

  console.log(c('\n🔗 BUCKET-RATIONALE TOPIC CONSISTENCY', BOLD));
  console.log(`  Checked ${checked} rationale/exercise pairs against ${RULES.length} domain markers.\n`);
  if (!violations.length) {
    console.log(c('✅ Every domain-tagged rationale is topically consistent with its exercise.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${violations.length} inconsistency(ies):`, RED));
  for (const v of violations.slice(0, 30)) {
    console.log(`  ${c(v.file, BOLD)}  Q: ${v.q} → ${v.a}`);
    console.log(c(`    R mentions "${v.marker}": ${v.r}`, YELLOW));
  }
  if (violations.length > 30) console.log(c(`  … and ${violations.length - 30} more`, GRAY));
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
