#!/usr/bin/env node
// Regression tests for scripts/eval-math-correctness.js verify(). One canonical
// example per kind keeps the verifier honest after pattern refactors.

import { verify } from './eval-math-correctness.js';

const RESET = '\x1b[0m', RED = '\x1b[31m', GREEN = '\x1b[32m';
const ok = (s) => `${GREEN}✓${RESET} ${s}`;
const fail = (s) => `${RED}✗${RESET} ${s}`;

const CASES = [
  // Plain arithmetic / fractions / decimals
  { q: '5 + 3 =', a: '8', type: 'addition', want: true },
  { q: '2/6 ÷ 3/4', a: '4/9', type: 'fraction_divide', want: true },
  { q: '7 × 9 =', a: '63', type: 'multiplication', want: true },
  // Equation forms
  { q: 'x + 1 = 5, x =', a: '4', type: 'equation', want: true },
  { q: '-2x + 1 = 7', a: '-3', type: 'linear_equation', want: true },
  // Function evaluation
  { q: 'f(x) = 2x² + -5x + 3, f(-2) = ?', a: '21', type: 'quadratic', want: true },
  // Quadratic roots
  { q: '(x - 3)(x - -8) = 0', a: 'x = 3 ou x = -8', type: 'quadratic', want: true },
  { q: '1x² + -6x + 9 = 0', a: 'x = 3', type: 'quadratic', want: true },
  // Limits (substitution + indeterminate)
  { q: 'lim(x→2) x² =', a: '4', type: 'expression', want: true },
  { q: 'lim(x→0) sen(x)/x = ?', a: '1', type: 'linear_equation', want: true },
  { q: 'lim(x→∞) (3x + 4)/x = ?', a: '3', type: 'linear_equation', want: true },
  // Trig
  { q: 'sen(30°) = ?', a: '1/2', type: 'trigonometry', want: true },
  { q: 'cos(45°-45°) = ?', a: '1', type: 'trigonometry', want: true },
  { q: 'sen²(45°) + cos²(45°) = ?', a: '1', type: 'trigonometry', want: true },
  { q: 'arccos(0) = ?', a: '90°', type: 'trigonometry', want: true },
  { q: 'cos(π/6) = ?', a: '√3/2', type: 'trigonometry', want: true },
  // Calculus
  { q: '∫ 1x^1 dx = ?', a: '(1/2)x^2 + C', type: 'expression', want: true },
  { q: '∫ e^{2x} dx = ?', a: '(1/2)e^{2x} + C', type: 'exponent', want: true },
  // Sequences / counts
  { q: 'Depois de 5 vem:', a: '6', type: 'next_number', want: true },
  { q: '__, 15, 16', a: '14', type: 'sequence', want: true },
  { q: 'a1=2, r=3, a5 = ?', a: '14', type: 'sequence', want: true },
  { q: '● ● ●', a: '3', type: 'count', want: true },
  // Stats
  { q: 'Média de 2, 4, 6 = ?', a: '4', type: 'mental_math', want: true },
  { q: 'Mediana de {1,3,5} = ?', a: '3', type: 'mental_math', want: true },
  // Geometry
  { q: 'Área do retângulo 4×3 = ?', a: '12', type: 'geometry', want: true },
  { q: 'Volume do cubo lado 3 = ?', a: '27', type: 'geometry', want: true },
  { q: 'Catetos 3 e 4 — hipotenusa = ?', a: '5', type: 'geometry', want: true },
  // Vector
  { q: '||(3,4)|| = ?', a: '5', type: 'geometry', want: true },
  { q: '(1,2) + (3,4) = ?', a: '(4, 6)', type: 'geometry', want: true },
  // Comparison / par-ímpar / place
  { q: '5 ? 8', a: '<', type: 'comparison', want: true },
  { q: 'O número 6 é:', a: 'par', type: 'even_odd', want: true },
  { q: 'Quantas unidades tem o número 17?', a: '7', type: 'place_value', want: true },
  // Word problem
  { q: 'João tem 5 ★. Maria deu mais 3 ★. Quantas ★ João tem agora?', a: '8', type: 'word_problem', want: true },
  // Probability
  { q: 'P(cara em uma moeda) = ?', a: '1/2', type: 'mental_math', want: true },
  // Factoring (polynomial equivalence)
  { q: '3x² - 7x + 2', a: '(3x + -1)(1x + -2)', type: 'factoring', want: true },
  // Identity (free vars)
  { q: '1 + cot²(x) = ?', a: 'csc²(x)', type: 'trigonometry', want: true },

  // Combine-like-terms (algebra in x,y)
  { q: '-9x + -6x', a: '-15x', type: 'algebra', want: true },
  // 2x2 determinant
  { q: 'det([1 2; 3 4]) = ?', a: '-2', type: 'algebra', want: true },
  // 'via' hint stripping
  { q: 'cos(60°) via cos(120°/2) = ?', a: '1/2', type: 'trigonometry', want: true },
  // 6A comparison
  { q: 'Qual tem mais: ●● ou ●●●●●? (2 ou 5)', a: '5', type: 'count', want: true },

  // V/F identity questions
  { q: 'sen(a)+sen(b) = sen(a+b) (V/F)?', a: 'F', type: 'trigonometry', want: true },
  // Inverse trig with degree answer
  { q: 'arccos(1/2) = ?', a: '60°', type: 'trigonometry', want: true },
  // Double angle (single given)
  { q: 'Se cos(x) = 0, cos(2x) = ?', a: '-1', type: 'trigonometry', want: true },
  // Law of cosines / Law of sines
  { q: 'a=10, b=10, C=60° — c² = ?', a: '100', type: 'geometry', want: true },
  { q: 'a=10, A=30°, B=90°, b = ?', a: '20', type: 'trigonometry', want: true },
  // 2D vector ops
  { q: '||(3,4)|| = ?', a: '5', type: 'geometry', want: true },
  { q: '(2,3)·(4,-1) = ?', a: '5', type: 'geometry', want: true },
  { q: '2·(3,4) = ?', a: '(6, 8)', type: 'geometry', want: true },
  // 3D vector ops
  { q: '(1,2,3)·(4,5,6) = ?', a: '32', type: 'geometry', want: true },
  // Matrix
  { q: 'A=[1 2; 3 4]: det(A) = ?', a: '-2', type: 'algebra', want: true },
  { q: 'A=[1 2; 3 4]: tr(A) = ?', a: '5', type: 'algebra', want: true },
  // Transformations
  { q: 'Ponto (3,4) transladado por T(2,1): x\' = ?', a: '5', type: 'geometry', want: true },
  { q: 'Reflexão de (3,5) no eixo x: y\' = ?', a: '-5', type: 'geometry', want: true },
  // Coordinate geometry
  { q: 'Distância entre (0,0) e (5,12) = ?', a: '13', type: 'geometry', want: true },
  { q: 'Ponto médio entre (2,4) e (8,10): x_M = ?', a: '5', type: 'geometry', want: true },
  // Probability dictionary
  { q: 'P(cara em uma moeda) = ?', a: '1/2', type: 'mental_math', want: true },
  { q: 'Eventos mutuamente exclusivos têm P(A∩B) = ?', a: '0', type: 'mental_math', want: true },
  // Combinatorics
  { q: 'C(5,2) = ?', a: '10', type: 'mental_math', want: true },
  { q: 'Anagramas de MAMA = ?', a: '6', type: 'mental_math', want: true },
  // Statistics
  { q: 'Variância de {2,4,6} (divisão por n) = ?', a: '2.67', type: 'mental_math', want: true },
  // Normal distribution
  { q: '% dentro de ±1σ = ?', a: '68', type: 'mental_math', want: true },
  { q: 'μ=100, σ=15 — z para x=130 = ?', a: '2', type: 'mental_math', want: true },
  // Absolute value
  { q: '|x + -5| = 5', a: '0', type: 'absolute_value', want: true },
  // Polygon
  { q: 'Volume do cubo lado 3 = ?', a: '27', type: 'geometry', want: true },
  { q: 'Soma ângulos internos do hexágono (n=6) = ?°', a: '720', type: 'geometry', want: true },

  // Negative cases — these should NOT pass
  { q: '5 + 3 =', a: '7', type: 'addition', want: false },
  { q: '7 × 9 =', a: '64', type: 'multiplication', want: false },
  { q: '(x - 3)(x - -8) = 0', a: 'x = 4 ou x = -8', type: 'quadratic', want: false },
];

let pass = 0, miss = 0;
for (const c of CASES) {
  const r = verify(c.q, c.a, c.type);
  const got = r ? r.ok : null;
  if (got === c.want) { pass++; console.log(ok(`${c.q}  →  ${c.a}  (${r?.kind ?? 'null'})`)); }
  else { miss++; console.log(fail(`${c.q}  →  ${c.a}  expected=${c.want} got=${got} kind=${r?.kind ?? 'null'} computed=${r?.computed ?? '-'}`)); }
}
console.log(`\n${pass}/${pass + miss} passed`);
process.exit(miss === 0 ? 0 : 1);
