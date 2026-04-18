#!/usr/bin/env node
// Fixes 21+ mismatched rationales in math/M/set_14 (Séries Numéricas).
// Exercises on series convergence had "Potências: aᵐ·aⁿ = aᵐ⁺ⁿ" applied,
// which teaches power laws — unrelated to series testing.
//
// Dispatches to existing correct rationale shapes already used in the set:
//   - p-series (Σ 1/nᵖ)
//   - geometric (Σ q^n, Σ (c)^n)
//   - alternating (Σ (-1)^n · …)
//   - ratio-test (factorial / exponential growth)
//   - divergence-by-nonzero-limit
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MISMATCH = 'Potências: aᵐ·aⁿ = aᵐ⁺ⁿ; (aᵐ)ⁿ = aᵐⁿ; a⁻ⁿ = 1/aⁿ.';
const RADICAL_MISMATCH = 'Radical: √(a·b) = √a·√b; racionalize quando preciso.';

export function rationaleFor(q, a) {
  const s = String(q || '');
  const ans = String(a ?? '');
  // --- Lei dos cossenos (math/M/set_11) ---
  if (/a=\d.*b=\d.*C=\d+°.*c²|a=b=\d.*C=\d+°/.test(s)) {
    return 'Lei dos cossenos: c² = a² + b² − 2ab·cos C.';
  }
  // --- PA sum identity (math/M/set_12) ---
  if (/primeiros\s+ímpares|soma dos (n|primeiros).*ímpares/i.test(s)) {
    return 'Soma dos n primeiros ímpares = n². Ex.: 1+3+5+7 = 16 = 4².';
  }
  // --- PG soma / progressão geométrica (math/M/set_13) ---
  if (/S₁?₀|S\d+|a₁=\d|formam\s+PG|PG|xadrez|dobrando/i.test(s)) {
    return 'Soma de PG finita: Sₙ = a₁·(qⁿ−1)/(q−1); PG: b² = a·c (termo central).';
  }
  // --- Taylor series (math/M/set_18, 20) ---
  if (/Taylor|f\^\(n\)\(0\)|Primeiros.*termos de e\^x|Coeficiente do termo xⁿ|primeiros.*termos.*≈|e\^0\.\d|Valor real de e\^/i.test(s)) {
    return 'Série de Taylor de eˣ em x=0: 1 + x + x²/2! + x³/3! + … Soma parcial aproxima eˣ.';
  }
  if (/Raio de convergência.*e\^x|e\^x.*R\s*=/.test(s)) {
    return 'Raio de convergência de eˣ é infinito (série converge para todo x real).';
  }
  // e^0 → Euler exponent
  if (/^e\^0\s*=/.test(s)) {
    return 'e^0 = 1 (toda potência de expoente 0 é 1).';
  }
  // --- Series (math/M/set_14) ---
  if (/n!/.test(s) || /aₙ₊₁\/aₙ/.test(s)) {
    return 'Teste da razão: se lim |aₙ₊₁/aₙ| < 1, Σaₙ converge.';
  }
  if (/\(-1\)\^?n/.test(s) || /alternad/i.test(s)) {
    if (/bₙ.?→.?[^0]|oscila/.test(s)) {
      return 'Se aₙ ↛ 0, a série diverge (teste da divergência).';
    }
    return 'Critério de Leibniz: série alternada Σ(-1)ⁿbₙ converge se bₙ↓0.';
  }
  if (/Σ\s*(?:\([^)]+\)|-?[\d\/.]+)\^n/.test(s) || /Σ\s*q\^n/.test(s) || /2\^n/.test(s)) {
    return 'Série geométrica Σ qⁿ: converge sse |q| < 1, soma = a₁/(1−q).';
  }
  if (/1\/n/.test(s) || /1\/\(n[²^]/.test(s)) {
    return 'p-série Σ 1/nᵖ: converge sse p > 1.';
  }
  // --- Binomial theorem (math/M/set_15) ---
  if (/\(a[-+]b\)[²³⁴⁵⁶⁷⁸⁹]?|\(a[-+]b\)\^\d|\(1[-+]x\)|\(x\+1\)|\(\d\+x\)/.test(s)) {
    if (/coeficiente/i.test(s) || /T[₁₂₃₄₅₆₇₈₉₁₂₃]/.test(s)) {
      return 'Em (a+b)ⁿ, termo T(k+1) = C(n,k)·aⁿ⁻ᵏ·bᵏ; coeficientes vêm do triângulo de Pascal.';
    }
    return 'Expansão binomial (a+b)ⁿ: Σ C(n,k)·aⁿ⁻ᵏ·bᵏ para k de 0 a n.';
  }
  if (/coeficientes?\s+da\s+linha|Pascal/i.test(s)) {
    return 'Soma dos coeficientes de (a+b)ⁿ = 2ⁿ (faz a=b=1).';
  }
  // De Moivre + roots of unity + Euler's formula (math/M/set_17)
  if (/\(.*cis\s*\d+°?\)[²³⁴⁵⁶⁷⁸⁹]|cis\s*\d+.*\^\d/.test(s)) {
    return 'De Moivre: (r cis θ)ⁿ = rⁿ cis(nθ).';
  }
  if (/raiz(es)?\s+(cúbica|n-ésima)|raízes.*1|nth root/i.test(s)) {
    return 'Raízes n-ésimas de z: n pontos igualmente espaçados no círculo |z|^(1/n), separados por 360°/n.';
  }
  if (/e\^\(?i|e\^\(?[iα]|exponencial/.test(s)) {
    return 'Fórmula de Euler: e^(iθ) = cos θ + i sen θ. Caso especial: e^(iπ) + 1 = 0.';
  }
  if (/^i[²³⁴⁵⁶⁷⁸⁹]|i\^(?:\d|n)/.test(s)) {
    return 'Potências de i ciclam: i¹=i, i²=-1, i³=-i, i⁴=1, depois repete (período 4).';
  }
  // Complex modulus squared: |a+bi|² = a² + b²
  if (/\|[^|]+\|²/.test(s)) {
    return 'Módulo ao quadrado: |a+bi|² = a² + b².';
  }
  // (1+i)^n expansion — complex power via polar or binomial
  if (/\(1\+i\)[⁰¹²³⁴⁵⁶⁷⁸⁹]|\(\d*[+-]\d*i\)[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(s)) {
    return 'Potência complexa via polar: (a+bi)ⁿ = |z|ⁿ·cis(nθ) (De Moivre).';
  }
  if (/r\s*=\s*[-\d√.]+.*θ\s*=\s*\d+°?.*(?:real|imaginári)/.test(s)) {
    return 'De polar para cartesiana: a = r cos θ, b = r sen θ.';
  }
  // --- Complex numbers in polar form (math/M/set_17) ---
  if (/cis\s*\(?θ|r\s*cis|polar/i.test(s)) {
    if (/argumento|atan2/.test(s)) return 'Argumento θ = atan2(b, a): ângulo do vetor (a,b) com o eixo real.';
    if (/multiplicação|produto/i.test(s) || /cis.*cis/.test(s)) return 'Produto em polar: (r₁ cis θ₁)(r₂ cis θ₂) = (r₁r₂) cis(θ₁+θ₂).';
    if (/raiz|√/i.test(s)) return 'Raízes n-ésimas de z: n pontos igualmente espaçados no círculo de raio ⁿ√|z|.';
    return 'Forma polar: z = r(cos θ + i sen θ) = r cis θ, onde r = |z|, θ = arg z.';
  }
  if (/\|z\||módulo/i.test(s) && /z\s*=/.test(s)) {
    return 'Módulo: |a + bi| = √(a² + b²).';
  }
  return null;
}

async function main() {
  const files = await fg('src/levels/math/M/set_*.yaml');
  let total = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const r = String(e.rationale || '').trim();
        if (r !== MISMATCH && r !== RADICAL_MISMATCH) continue;
        const newR = rationaleFor(e.question, e.correctAnswer);
        if (!newR) continue;
        const qEsc = rx(String(e.question));
        const blockRe = new RegExp(
          `(question:\\s*(?:"${qEsc}"|'${qEsc}'|${qEsc})[ \\t]*\\r?\\n[\\s\\S]*?rationale:\\s*)("[^"\\n]*"|'[^'\\n]*'|[^\\n]*)`,
          'g',
        );
        let hit = false;
        raw = raw.replace(blockRe, (m, prefix) => { hit = true; return `${prefix}"${newR}"`; });
        if (hit) changed++;
      }
    }
    if (changed) {
      total += changed;
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `- ${changed} rewritten`);
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${total} rewrite(s).`);
  if (!APPLY && total) console.log('Re-run with --apply.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
