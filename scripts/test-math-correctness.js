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

  // Dash-form geometry shapes
  { q: 'Cilindro r=2, h=5 — V = ?π', a: '20', type: 'geometry', want: true },
  { q: 'Cone r=2, h=6 — V = ?π', a: '8', type: 'geometry', want: true },
  { q: 'Esfera r=3 — V = ?π', a: '36', type: 'geometry', want: true },
  { q: 'Retângulo 5×8 — área = ?', a: '40', type: 'geometry', want: true },
  { q: 'Quadrado lado 6 — perímetro = ?', a: '24', type: 'geometry', want: true },
  { q: 'Triângulo b=10, h=4 — área = ?', a: '20', type: 'geometry', want: true },
  { q: 'Trapézio B=12, b=8, h=5 — área = ?', a: '50', type: 'geometry', want: true },
  { q: 'Pirâmide base 4×4, h=9 — V = ?', a: '48', type: 'geometry', want: true },
  // Sector / arc / inscribed
  { q: 'Área do setor 60° com r=6 = ?π', a: '6', type: 'geometry', want: true },
  { q: 'Arco de 90° com r=4 = ?π', a: '2', type: 'geometry', want: true },
  { q: 'Ângulo central de 80° — ângulo inscrito correspondente = ?°', a: '40', type: 'geometry', want: true },
  { q: 'Soma dos ângulos internos de um triângulo = ?°', a: '180', type: 'geometry', want: true },
  // Slope between two points
  { q: 'Coef. angular entre (0,0) e (2,4) = ?', a: '2', type: 'geometry', want: true },
  // Anagram variants
  { q: 'Quantos anagramas de AMOR?', a: '24', type: 'mental_math', want: true },
  // Weighted mean / relative frequency / z-score variant
  { q: 'Em n=20 com f=5, fᵣ = ?', a: '0.25', type: 'mental_math', want: true },
  { q: 'μ=10, σ=2 — x=14 tem z = ?', a: '2', type: 'mental_math', want: true },
  { q: 'Valores 10 (f=2) e 20 (f=3) — média = ?', a: '16', type: 'mental_math', want: true },
  { q: '4 camisas e 3 calças — quantos conjuntos?', a: '12', type: 'mental_math', want: true },
  // Circle area '?π' coefficient + circle equation patterns
  { q: 'Área do círculo r=10 = ?π', a: '100', type: 'geometry', want: true },
  { q: 'Círculo r=5 — área = ?π', a: '25', type: 'geometry', want: true },
  { q: 'Círculo d=10: área = ?π', a: '25', type: 'geometry', want: true },
  { q: 'Comprimento da circunferência r=3 = ?π', a: '6', type: 'geometry', want: true },
  { q: 'Cubo lado 4 — V = ?', a: '64', type: 'geometry', want: true },
  { q: 'Centro (2,1) e r=5: (x-2)² + (y-1)² = ?', a: '25', type: 'geometry', want: true },
  { q: '(x+2)²+(y-3)²=25 — raio = ?', a: '5', type: 'geometry', want: true },
  { q: 'Polígono regular de 10 lados, lado=5: perímetro = ?', a: '50', type: 'geometry', want: true },
  { q: 'Hexágono lado=3: perímetro = ?', a: '18', type: 'geometry', want: true },
  // Binomial / Pascal / urns / Bayes
  { q: 'Coeficiente de a²b² em (a+b)^4 = ?', a: '6', type: 'mental_math', want: true },
  { q: 'Coeficiente de x² em (1+x)^5 = ?', a: '10', type: 'mental_math', want: true },
  { q: 'Linha 3 do triângulo de Pascal (soma) = ?', a: '8', type: 'mental_math', want: true },
  { q: 'Urna com 3 vermelhas e 2 azuis. P(1ª vermelha) = ?', a: '0.6', type: 'mental_math', want: true },
  { q: 'Urna 3V 2A. Dada 1ª vermelha, P(2ª vermelha) = ?', a: '0.5', type: 'mental_math', want: true },
  { q: 'Urna 2V 2A. P(ambas vermelhas sem reposição) = ?', a: '0.167', type: 'mental_math', want: true },
  { q: 'P(A|B)=0.7, P(B)=0.4 → P(A∩B) = ?', a: '0.28', type: 'mental_math', want: true },
  { q: 'P(A|B)=0.8, P(B)=0.5, P(A)=0.5 → P(B|A) = ?', a: '0.8', type: 'mental_math', want: true },
  { q: 'P(A)=0.3 → P(Ā) = ?', a: '0.7', type: 'mental_math', want: true },
  { q: 'Pódio (1º, 2º, 3º) de 5 atletas — arranjo A(5,3) = ?', a: '60', type: 'mental_math', want: true },
  { q: 'Dupla de parceiros de 4 alunos — C(4,2) = ?', a: '6', type: 'mental_math', want: true },
  { q: 'Ponto médio de [20,30) = ?', a: '25', type: 'mental_math', want: true },
  { q: 'Para [1,2,3,4] com frequências [2,3,4,1], acumulada até 3 = ?', a: '9', type: 'mental_math', want: true },
  // Trig equation solving in degrees
  { q: 'Primeira solução de cos(x) = 1/2 em [0°, 360°)?', a: '60°', type: 'trigonometry', want: true },
  { q: 'Segunda solução: sen(x) = 1/2 em [0°, 360°)', a: '150°', type: 'trigonometry', want: true },
  { q: 'Número de soluções de cos(x) = 0 em [0°, 360°)?', a: '2', type: 'trigonometry', want: true },
  { q: 'Menor solução de sen(x)=-1?', a: '270°', type: 'trigonometry', want: true },
  { q: 'Menor positiva de 2sen(x) = √3?', a: '60°', type: 'trigonometry', want: true },
  { q: '2sen(x) = √3 → sen(x) = ?', a: '√3/2', type: 'trigonometry', want: true },
  // Binomial / Pascal identities
  { q: 'C(10,3) = C(10,?)', a: '7', type: 'algebra', want: true },
  { q: 'C(n,0) = ?', a: '1', type: 'algebra', want: true },
  { q: 'C(n,1) = ?', a: 'n', type: 'algebra', want: true },
  { q: 'Subconjuntos de 8 elementos = ?', a: '256', type: 'algebra', want: true },
  { q: 'Soma dos coeficientes de (1+x)⁴ = ?', a: '16', type: 'algebra', want: true },
  { q: 'Terceira entrada da linha 5 (k=2) = ?', a: '10', type: 'algebra', want: true },
  { q: 'i³ = ?', a: '-i', type: 'algebra', want: true },
  { q: 'cis(30°) · cis(60°) = cis(?°)', a: '90', type: 'algebra', want: true },
  { q: 'cis(90°)/cis(45°) = cis(?°)', a: '45', type: 'algebra', want: true },
  // PG sums and Taylor radii
  { q: 'PG 1,2,4,8,16,32 — S₆ = ?', a: '63', type: 'sequence', want: true },
  { q: 'PG 1, 1/2, 1/4,... — S∞ = ?', a: '2', type: 'sequence', want: true },
  { q: 'PG {2,6,18,54,...} — q = ?', a: '3', type: 'sequence', want: true },
  { q: 'PG 5,5,5,5,5,5 (q=1) — soma = ?', a: '30', type: 'sequence', want: true },
  { q: 'PG com a₁=4 e a₂=12, q = ?', a: '3', type: 'sequence', want: true },
  { q: 'e^x: R = ?', a: '∞', type: 'calculus', want: true },
  { q: 'ln(1+x): R = ?', a: '1', type: 'calculus', want: true },
  { q: 'Para p-série convergir, p > ?', a: '1', type: 'calculus', want: true },
  { q: 'Soma dos n primeiros ímpares = n². Para n=20: ?', a: '400', type: 'sequence', want: true },
  // Right triangle / law-of-cosines/sines / 30-60-90 / 45-45-90 / rotations
  { q: 'Em triângulo retângulo CO=4, CA=3, H = ?', a: '5', type: 'geometry', want: true },
  { q: 'Triângulo retângulo: H=10, θ=30° — cateto oposto = ?', a: '5', type: 'geometry', want: true },
  { q: 'Triângulo retângulo: CO=5, H=10 — ângulo θ = ?°', a: '30', type: 'geometry', want: true },
  { q: 'a=3, b=4, C=90° — c = ?', a: '5', type: 'geometry', want: true },
  { q: 'a=3, b=4, c=5 — cosC = ?', a: '0', type: 'geometry', want: true },
  { q: 'a=1, b=1, c=√2 — C = ?°', a: '90', type: 'geometry', want: true },
  { q: 'a=b=c=5 — C = ?°', a: '60', type: 'geometry', want: true },
  { q: 'Triângulo 30-60-90 com x=5 — hipotenusa = ?', a: '10', type: 'geometry', want: true },
  { q: 'Triângulo 30-60-90 com H=20: cateto maior = ?√3', a: '10', type: 'geometry', want: true },
  { q: 'Triângulo 45-45-90 com cateto=8: hipotenusa = ?√2', a: '8', type: 'geometry', want: true },
  { q: 'Rotação 90° anti-horário de (4,2): x\' = ?', a: '-2', type: 'geometry', want: true },
  { q: 'Rotação 180° de (3,-5): y\' = ?', a: '5', type: 'geometry', want: true },
  { q: 'Retas perpendiculares têm produto dos coef. angulares = ?', a: '-1', type: 'geometry', want: true },
  { q: 'Triângulo com A=45°, B=60°, C=? °', a: '75', type: 'geometry', want: true },
  { q: 'a=10, A=30°, B=90° — b = ?', a: '20', type: 'geometry', want: true },
  // Trig range solver + calculus constants
  { q: 'Em [0°, 360°], número de soluções de cos(x) = 0?', a: '2', type: 'trigonometry', want: true },
  { q: 'Em [0°, 180°], soluções de sen(x) = 1/2: (30° e ?)', a: '150°', type: 'trigonometry', want: true },
  { q: 'Quantas soluções tem sen(x) = 1/2 em [0°, 360°)?', a: '2', type: 'trigonometry', want: true },
  { q: 'Converge para |x| < ?', a: '1', type: 'calculus', want: true },
  { q: 'ln(1) = ?', a: '0', type: 'calculus', want: true },
  { q: 'Valor exato de ln(2) ≈ ?', a: '0.693', type: 'calculus', want: true },
  { q: 'Primeiros 3 termos de e^x em x=1: 1+1+0.5 = ?', a: '2.5', type: 'calculus', want: true },

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
