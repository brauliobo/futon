# `eval:correctness` — math answer verifier

`scripts/eval-math-correctness.js` checks authored `correctAnswer` fields against a library-computed (mathjs) value. Currently verifies **41,472 / 43,889** math exercises (94.5%); the rest are word-problem / conceptual questions with text answers that aren't pattern-matchable.

Run:

```
pnpm eval:correctness                    # check all (CI gate)
pnpm eval:correctness --by-type          # per-type coverage report
pnpm eval:correctness --by-level         # per-level coverage report
pnpm eval:correctness --debug-unverified trigonometry   # print SKIPs for a given type
```

`scripts/test-math-correctness.js` (run as part of `pnpm test:eval`) exercises 43 canonical cases — one per major kind — so refactors can't silently drop pattern coverage.

## Verification kinds

The verifier dispatches via a long if-chain; each branch returns `{ ok, computed, kind }`. Below is the cookbook. Forms with ‡ match against the **original** question because the normalization step would mangle key characters (π, ·, |…|).

### Arithmetic / expression

| Kind | Pattern | Approach |
| --- | --- | --- |
| `equation` | `<lhs> = <rhs>[, x =]` (`type:equation/proportion/linear_equation`) | Substitute `x = correctAnswer`, check LHS = RHS numerically |
| `expression` | `<expr> =` or `<expr> = ?` (radical/exponent forms may omit `=`) | Eval LHS, compare to `tryEval(answer)`. Chained `<a> = <b> = ?` forms (arithmetic-only prefix) take the last segment |
| `function` | `f(x) = <expr>, f(N) = ?` | Eval expr at x=N |
| `compose` | `f(x) = …, g(x) = …, f(g(N)) = ?` | Eval g then f |
| `inverse` | `f(x) = expr, f⁻¹(y) = ?` | Two-point probe to invert linear f |
| `identity` | `<lhs(x)> = ?` plain (a is numeric, lhs has free x) | Probe at x=1 (BigNumber) — catches `csc²(x) - cot²(x) = 1` |
| `identity_symbolic` | `<lhs> = ?` with answer also an expression in vars | Probe-equivalence over shared free vars (excluding `e`, `i`) |
| `identity_vf` | `A = B (V/F)?` | Probe-equivalent → V; otherwise F |
| `fill_blank` | `<lhs with one ?> = <rhs>` with numeric answer | Substitute `?` and check sides; falls back to probe-equivalence for free-x forms |

### Equations / roots

| `quad_roots` | `…= 0` with `x = R` (single) or `x = R1 ou x = R2` | Substitute each root into LHS |
| `sq_hint` | `x² = N (raiz positiva/negativa/ambas)` | String-compare ±√N |
| `sqrt_eq` | `v² = N → v = ?` | √N |
| `power_eq` | `x^N = M` | M^(1/N) |
| `absolute_value` | `|<expr>| = N` (`type:absolute_value`) | Substitute answer, check magnitude |
| `system_eq` | `<eq1>, <eq2>` with answer `(x,y)` | Substitute point into both |

### Limits / calculus

| `limit` | `lim(x→N) <expr> = ?` | Substitute x=N (ε-fallback for indeterminate forms → `limit_indet`) |
| `limit∞` | `lim(x→∞) <expr> = ?` | Substitute x = 1e8 with loose tol |
| `integral` | `∫ <integrand> dx = ?` with `<antideriv> + C` | Differentiate antideriv via `math.derivative`, probe-equal to integrand |

### Polynomials & algebra

| `factoring` | `type:factoring/algebraic_expression/algebra` | Probe-equivalence over shared free vars (handles `(começa com …)` hint, x+y bivariate forms) |
| `alg_subst` | `Se x = N, então <expr> =` | Substitute and evaluate |

### Trigonometry

| `trig_given` | `Se fn1(x) = V, fn2(x)[^2] = ?` (acute) | Invert fn1, evaluate fn2 |
| `double_angle` | `Se sin/cos/tan(x) = V, sin/cos/tan(2x) = ?` (single or paired) | Double-angle formula |
| `law_cos` | `a=A, b=B, C=θ° — c² = ?` | A² + B² - 2AB cos(θ) |
| `law_sin` | `a=A, A=α°, B=β°, b = ?` | A·sin(β)/sin(α) |
| `tri_area_sas` | `a=A, b=B, C=θ° — área = ?` | AB·sin(θ)/2 (or ?√3 coefficient form) |

### Sequences

| `successor` / `predecessor` | `Depois/Próximo de N` / `Antes/Anterior de N` | N±1 |
| `seq3` | `__, b, c` / `a, __, c` / `a, b, __` | Linear extrapolation |
| `skip_count` | `a, b, c, ?` constant difference | Extrapolate |
| `ap_term` / `gp_term` | `a1=N, r=R/q=Q, ak = ?` | N + (k-1)R or N·Q^(k-1) |
| `ap_find_n` | `a1=N, r=R, qual n tem an=M?` | 1 + (M-N)/R |
| `pa_ratio` | `PA {a1, a2, …} — razão / Se aN=V, aM=W, r=?` | Difference / (M-N) |
| `pa_sum` | `PA a1, a2, …, aN: S = ?` | n(a1+aN)/2 |
| `sum_formula` | `Soma … = formula. Para n=N: ?` | Apply n² or n(n+1) |
| `sum_1_to_n` | `Soma 1+2+3+…+N = ?` | N(N+1)/2 |
| `pg_converge` | `Converge se |q| < ?` / `Diverge se |q| ≥ ?` | 1 |

### Counts / number sense (1A–6A)

| `count` | All-glyph questions, `Conte:` prefix, `N a mais/menos de M: <glyphs>`, comparison forms `Qual tem mais/menos: G1 ou G2?`, `Igual/Maior/Menor que N: (G1/G2)`, labelled `N <objs>`, `K grupos de N` |
| `successor`/`predecessor` | `Depois/Próximo de N` etc |
| `even_odd` | `O número N é:` / `N é par ou ímpar?` |
| `place_value` | `Quantas unidades/dezenas/centenas tem [o número] N?` |
| `comparison` | `A ? B` → <, >, = |
| `word_problem` | 2-number PT word problems with additive/subtractive cue verbs |

### Statistics & probability (P-level)

| `stat` | `Média/Mediana/Moda/Amplitude de {nums}` (full or em-dash form) | Compute statistic |
| `variance` / `stddev` | `Variância / Desvio padrão de {nums}` | Population variance / √variance |
| `deviation` / `dev_sq` | `Desvio de N em relação a M` / `Quadrado do desvio N` | N-M / N² |
| `var_to_std` | `Se variância = N, desvio padrão = ?` | √N |
| `frequency` / `rel_freq` | `Em {nums}, frequência de N` / `Em n=N com f=F, fr = ?` | Count / F/N |
| `interval_amp` | `Amplitude do intervalo [a,b) = ?` | b - a |
| `prob_count` | Coin/die throw counts (2/6/2^K/6^K) |
| `prob_value` | Dictionary of canonical phrasings: `P(cara/copas/evento certo/etc)`, exclusive `P(A∪B) = P(A) + P(B)`, inclusion-exclusion, `P(K caras em N moedas)` |
| `arrange` / `permute` / `combine` | `A(n,k)` / `P(n)` / `C(n,k)` | n!/(n-k)! / n! / nCk |
| `pair_product` | `K X e M Y — quantos conjuntos/combinações?` | K·M |
| `anagram` | `Anagramas de WORD` | N!/∏(multiplicities!) |
| `permute` (circular/necklace/shelf/queue) | `N pessoas ao redor de mesa circular`, `N contas em colar`, `N livros distintos`, `Filas de N pessoas` |
| `normal_dist` | 68/95/99.7 rule, `P(z<0)`, `P(z>1)`, `P(|z|<k)`, `Área total sob curva normal` |
| `z_score` | `μ=M, σ=S — z para x=X = ?` | (X-M)/S |
| `sum_sq_dev` / `sum_dev` | `Soma dos (quadrados dos) desvios de {nums}` |

### Geometry

| `area_rect` / `perim_rect` / `square_area` / `square_diag` | Rectangle and square forms |
| `triangle_area` / `equi_tri_area` / `tri_area_sas` | Triangle areas (base*h/2; equilateral; SAS) |
| `parallelogram` / `trapezium` | `b·h` and `(B+b)·h/2` |
| `circle_area` / `circle_approx` / `circle_radius` / `circumference` | r² (coefficient or full numeric); radius from area `Nπ`, circumference `Nπ`, or equation `x²+y²=N` |
| `cube_vol` / `cube_solve` / `box_vol` | L³ and box A·B·C |
| `cylinder_vol` / `cone_vol` / `sphere_vol` / `sphere_surf` | R²·H and R²·H/3 and 4R³/3 and 4R² (coefficient of π) |
| `rect_altura` | Solve area = base · altura for altura |
| `hex_area` | Regular hexagon area coefficient of √3 |
| `shape_count` | `Quantos lados/cantos/vértices tem um <shape>?` |
| `poly_perim` / `poly_int_angle` / `poly_sum_angle` | Regular-polygon perimeter / single interior angle / sum |
| `hypotenuse` / `other_leg` | `Catetos a e b — hipotenusa` / `Hipotenusa H, cateto K — outro cateto` |
| `tri_special` | 30-60-90 hypotenuse / longer leg |
| `distance` / `midpoint` | Coordinate-plane forms |
| `slope` | `Reta paralela/perpendicular a y=mx+b: m`, `Reta horizontal`, slope from two points |
| `line_b` | `Reta por (a,b) com m=M: b = ?` (or `m=M passando por (a,b)`) |
| `graph_point` | `Ponto (a,b)` → answer matches literal coords |
| `vec_norm` / `vec_add` / `vec_sub` / `vec_dot` / `vec_scal` / `vec_partial` | 2D vector forms (norm, add, sub, dot, scalar mul, partial-component) |
| `translate` / `reflect` / `homothety` | Geometric transformations |
| `det_2x2` / `mat_add` / `mat_scale` / `mat_op` | 2×2 matrix det/sum/scale element queries; named A/B with `det`, `tr`, `Aᵀ[i,j]`, `AB[i,j]` |

## Known-buggy authoring (skipped, not gate-failing)

See `~/.claude/projects/-home-braulio-Projects-futon/memory/project_inequality_bugs.md`:

- `math/H/set_06` + `math/H/set_07` — 424 inequality answers don't reflect the sign-flip their own rationale describes (`type:inequality` is excluded from the verifier).
- `math/H/set_02` — 50 linear_equation answers divide by the wrong factor (this file is per-file-skipped inside the verifier loop).

Removing those skips will resurface 474 mismatches. The fix is content-side (regenerate answers), not script-side.

## Normalization pipeline

`normalize(s)` (in order):
1. Wrap bare `a/b` fractions in parens (so `2/6 ÷ 3/4` parses as `(2/6)/(3/4)`, not `((2/6)/3)/4`)
2. `× ·` → `*`, `÷` → `/`, `−` → `-`
3. `arcsen/arccos/arctan/arctg` → `asin/acos/atan/atan`
4. `sen/cosseno/tg/cotg` → `sin/cos/tan/cot` (negative lookbehind/ahead for letters)
5. `Nº` → `(N deg)` so mathjs treats it as a degrees unit (negative lookbehind so `45°-45°` doesn't fold the minus)
6. `π` → `pi`
7. `(\d)(?=[xy]\b)` → `\d*` (force explicit multiplication so `0x` isn't a hex prefix and `2x` doesn't trip mathjs in BigNumber mode)
8. `|expr|` → `abs(expr)` (non-nested)
9. Superscript digits `n²` → `n^2`
10. Subscript digits + letters `aₙ` → `an`
11. `sin^N(arg)` → `sin(arg)^N` (mathjs parses `sin^2` as `pow(sin, 2)` which errors)
12. `√N` / `√(expr)` → `sqrt(N) / sqrt(expr)`
13. LaTeX `^{...}` → `^(...)`
14. Whitespace cleanup

`toNumber(v)` handles Number, BigNumber (`.toNumber()`), Unit (converts to base SI value via `.toSI()`), and `{n, d}` fraction objects.

`probeEquivalent(expr1, expr2, vars=['x'])` evaluates each expression at six different BigNumber x values (and shifted values for each additional variable) and returns true/false/null. Used by factoring, identity_symbolic, identity_vf, and free-variable fill_blank fallback.
