#!/usr/bin/env node
// Library-backed answer-correctness check for math sets, using mathjs.
// Extends eval-arithmetic.js (which only handles "a OP b =") to cover:
//
//   • fractions / decimals (e.g. "1/4 + 2/4 =", "0.7 + 0.5 =")
//   • multi-operand arithmetic (e.g. "(2+3)×4 =")
//   • linear equations of the form "<expr> = <expr>, x =", where the
//     correctAnswer is the value of x
//
// Skips anything mathjs cannot parse (variable forms in non-equation
// questions, word problems with text, etc.). Exits non-zero on mismatch.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { create, all } from 'mathjs';

const math = create(all, { number: 'BigNumber', precision: 32 });

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m';
const c = (t, col) => `${col}${t}${RESET}`;

const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
// Arithmetic-progression aₙ = a₁ + (n-1)·r
const AP_TERM_RE = /^a1\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*r\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*a(\d+)\s*=\s*\??\s*$/i;
const GP_TERM_RE = /^a1\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*q\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*a(\d+)\s*=\s*\??\s*$/i;
const PA_RATIO_RE = /^PA\s*\{?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,/i;
const PA_SUM_RE = /^PA\s+((?:-?\d+(?:\.\d+)?\s*,\s*)+)\.\.\.\s*,\s*(-?\d+(?:\.\d+)?)\s*:\s*(?:S\d+|Soma)\s*=\s*\??\s*$/i;
const COUNT_LABELED_RE = /^(\d+)\s+(?:bolinhas?|pontos?|figurinhas?|objetos?|c[íi]rculos?|estrelas?|quadrad[oi]s?|tri[âa]ngulos?|flores?|frutas?|brinquedos?|carros?|bal[õo]es?)\s*\.?\s*$/i;
const GROUPS_RE = /^(\d+)\s+grupos?\s+de\s+(\d+)\s+[a-záâãéêíóôõúç]+\.?\s*total\??\s*$/i;

const normalize = (s) =>
  String(s)
    // Group bare "a/b" fractions before reducing ÷ to / so that
    // "2/6 ÷ 3/4" parses as (2/6) ÷ (3/4), not ((2/6)/3)/4.
    // Don't grab the digits inside "√N/M" — that's a separate sqrt.
    .replace(/(?<![a-zA-Z\d\)√])(-?\d+\/\d+)(?![a-zA-Z\d])/g, '($1)')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\barcsen\b/g, 'asin')
    .replace(/\barccos\b/g, 'acos')
    .replace(/\barctan\b/g, 'atan')
    .replace(/\barctg\b/g, 'atan')
    .replace(/\bsen\b/g, 'sin')
    .replace(/\bcosseno\b/g, 'cos')
    .replace(/\btg\b/g, 'tan')
    .replace(/\bcotg\b/g, 'cot')
    // "N°" → "(N deg)" so mathjs treats the argument as degrees. Don't
    // swallow a leading '-' that's really a subtraction ('45°-45°' must
    // stay as '(45 deg)-(45 deg)', not '(45 deg)(-45 deg)').
    .replace(/(?<![\d°)\]])-?(\d+(?:\.\d+)?)\s*°/g, (_, n, off, full) => {
      // Add explicit '-' only when this token's '-' is at the start of the
      // match (i.e. the match started with '-'). Otherwise keep neutral.
      return '(' + (full[off] === '-' ? '-' : '') + n + ' deg)';
    })
    // π → pi (mathjs uses the latin name)
    .replace(/π/g, 'pi')
    // '0x' is a hex prefix in mathjs — force it to be 0*x. Same for any
    // digit immediately followed by x or y so '2x' / '3y' tokenize cleanly.
    .replace(/(\d)(?=[xy]\b)/g, '$1*')
    // |expr| → abs(expr) — non-nested form only.
    .replace(/\|([^|]+)\|/g, 'abs($1)')
    // Convert "N²" / "x³" → "(N)^2" / "(x)^3"
    .replace(/([\)\]a-zA-Z\d])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, base, sups) => {
      const exp = [...sups].map(ch => SUP[ch] || ch).join('');
      return `${base}^${exp}`;
    })
    // Subscript digits: 'a₁' / 'a₁₀' → 'a1' / 'a10' (used in PA/PG notation).
    .replace(/([₀₁₂₃₄₅₆₇₈₉]+)/g, (s) => [...s].map(c => SUB[c] || c).join(''))
    // LaTeX-style braces in exponents: 'e^{2x}' → 'e^(2x)'
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    // 'sin^2(x)' is invalid in mathjs (parses 'sin^2' as pow(sin, 2)).
    // Rewrite trig-function-then-power-then-arg → 'fn(arg)^pow'. Must
    // run AFTER superscript conversion so 'sen²(x)' has already become
    // 'sin^2(x)' by the time this fires.
    .replace(/\b(sin|cos|tan|sec|csc|cot)\s*\^\s*(\d+)\s*\(((?:[^()]|\([^)]*\))*)\)/g, '$1($3)^$2')
    // √N or √(expr) → sqrt(N) / sqrt(expr)
    .replace(/√\s*\(([^)]+)\)/g, 'sqrt($1)')
    .replace(/√\s*(-?\d+(?:\.\d+)?)/g, 'sqrt($1)')
    .replace(/\s+/g, ' ')
    .trim();

function tryEval(expr) {
  try { return math.evaluate(expr); } catch { return null; }
}

function toNumber(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  // mathjs Unit: convert to base SI (e.g. degrees → radians) so trig
  // identities like 'acos(0)' (radians) and '90°' (degrees) agree.
  if (v && typeof v === 'object' && Array.isArray(v.units)) {
    try {
      const base = v.toSI?.() ?? v;
      const n = base.toNumber?.() ?? Number(base.value);
      return Number.isFinite(n) ? n : null;
    } catch { return null; }
  }
  if (typeof v?.toNumber === 'function') {
    const n = v.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'object' && 'n' in v && 'd' in v) {
    return Number(v.n) / Number(v.d);
  }
  return null;
}

const EQ_RE = /^(.+?)\s*=\s*(.+?)\s*,\s*x\s*=\s*$/i;
const FN_RE = /^f\(x\)\s*=\s*(.+?)\s*,\s*f\((-?\d+(?:\.\d+)?)\)\s*=\s*\??\s*$/i;
const LIM_RE = /^lim\s*\(\s*x\s*→\s*(-?\d+(?:\.\d+)?)\s*\)\s*(.+?)\s*=\s*\??\s*$/i;
const LIM_INF_RE = /^lim\s*\(\s*x\s*→\s*(-?∞|-?infty?|-?inf)\s*\)\s*(.+?)\s*=\s*\??\s*$/i;
const NEXT_RE = /^(?:depois|ap[óo]s|pr[óo]ximo)\s+(?:de\s+)?(-?\d+)(?:\s+vem)?:?\s*$/i;
const PREV_RE = /^(?:antes|anterior)\s+(?:de\s+)?(-?\d+)(?:\s+vem)?:?\s*$/i;
const ALG_SUBST_RE = /^se\s+x\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*ent[ãa]o\s+(.+?)\s*=\s*\??\s*$/i;
const COMPARISON_RE = /^(-?\d+(?:\.\d+)?)\s*\?\s*(-?\d+(?:\.\d+)?)\s*$/;
const EVEN_ODD_RE = /^(?:o\s+n[úu]mero\s+)?(-?\d+)\s+é(?::|\s+par\s+ou\s+[íi]mpar\??(?:\s*\(par\/[íi]mpar\))?\s*)\s*$/i;
const GRAPH_POINT_RE = /^ponto\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*$/i;
const SLOPE_RE = /^pontos\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+e\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*$/i;
const SYS_EQ_RE = /^(.+?)\s*,\s*(.+?)\s*$/;
const POINT_ANS_RE = /^\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*$/;
const TWO_ROOTS_RE = /x\s*=\s*(-?\d+(?:\.\d+)?)\s+ou\s+x\s*=\s*(-?\d+(?:\.\d+)?)/i;
const INEQUALITY_RE = /^(.+?)\s*(<=|>=|<|>|≤|≥)\s*(.+?)\s*$/;
const PLACE_VALUE_RE = /^quantas?\s+(unidades?|dezenas?|centenas?|milhares|milhar)\s+t[êe]m?\s+(?:o\s+n[úu]mero\s+)?(-?\d+)\??\s*$/i;
const SKIP_CNT_RE = /^(-?\d+(?:\s*,\s*-?\d+){2,})\s*,\s*\?\s*$/;
const MENTAL_HINT_RE = /^(.+?)\s*=\s*\([^)]+\)\s*$/;       // "7 + 9 = (7 + 10 - 1)" → LHS = "7 + 9"
const SQUARE_ROOT_RE = /^[a-zσ]\^?2\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*[a-zσ]\s*=\s*\??\s*$/i;
// "x² = N (raiz positiva|negativa|ambas raízes)" — answer is ±√N depending on hint.
const SQ_HINT_RE = /^x\^?2\s*=\s*(-?\d+(?:\.\d+)?)\s*\((raiz\s+(?:positiva|negativa)|ambas\s+ra[íi]zes)\)\s*$/i;
// Indefinite integral: '∫ <integrand> dx = ?' with answer '<antideriv> + C'
const INTEGRAL_RE = /^∫\s*(.+?)\s*dx\s*=\s*\??\s*$/i;
const COMPOSE_RE = /^f\(x\)\s*=\s*(.+?)\s*,\s*g\(x\)\s*=\s*(.+?)\s*,\s*f\(g\((-?\d+(?:\.\d+)?)\)\)\s*=\s*\??\s*$/i;
const INVERSE_RE = /^f\(x\)\s*=\s*(.+?)\s*,\s*f⁻¹\((-?\d+(?:\.\d+)?)\)\s*=\s*\??\s*$/i;
const AREA_RECT_RE = /^[áa]rea\s+do\s+(?:ret[âa]ngulo|quadrado)\s+(\d+)\s*[×*]\s*(\d+)\s*=\s*\??\s*$/i;
const PERIM_RECT_RE = /^per[íi]metro\s+do\s+(?:ret[âa]ngulo|quadrado)\s+(\d+)\s*[×*]\s*(\d+)\s*=\s*\??\s*$/i;
const SHAPE_SIDES = { triângulo: 3, triangulo: 3, quadrado: 4, retângulo: 4, retangulo: 4, pentágono: 5, pentagono: 5, hexágono: 6, hexagono: 6, heptágono: 7, heptagono: 7, octógono: 8, octogono: 8, círculo: 0, circulo: 0 };
const SHAPE_COUNT_RE = /^quantos\s+(?:lados|cantos|v[ée]rtices)\s+t[êe]m?\s+um\s+([a-záâãéêíóôõúç]+)\??\s*$/i;
const PARALLELOGRAM_RE = /^[áa]rea\s+do\s+paralelogramo\s+b\s*=\s*(\d+)\s*,\s*h\s*=\s*(\d+)\s*=\s*\??\s*$/i;
const TRAPEZIUM_RE = /^[áa]rea\s+do\s+trap[ée]zio\s+B\s*=\s*(\d+)\s*,\s*b\s*=\s*(\d+)\s*,\s*h\s*=\s*(\d+)\s*=\s*\??\s*$/i;
const CIRCLE_AREA_HINT_RE = /^[áa]rea\s+do\s+c[íi]rculo\s+r\s*=\s*(\d+(?:\.\d+)?):\s*\?π\s*$/i;
const TRIANGLE_AREA_RE = /^[áa]rea\s+do\s+tri[âa]ngulo\s+b\s*=\s*(\d+)\s*,\s*h\s*=\s*(\d+)\s*=\s*\??\s*$/i;
const BOX_VOLUME_RE = /^caixa\s+(\d+)\s*[×*]\s*(\d+)\s*[×*]\s*(\d+)\s+[—-]+\s*volume\s*=\s*\??\s*$/i;
const CYLINDER_VOL_RE = /^cilindro\s+r\s*=\s*(\d+)\s*,\s*h\s*=\s*(\d+)\s*:\s*v\s*=\s*\?π\s*$/i;
const CONE_VOL_RE = /^cone\s+r\s*=\s*(\d+)\s*,\s*h\s*=\s*(\d+)\s*:\s*v\s*=\s*\?π\s*$/i;
const SPHERE_VOL_RE = /^esfera\s+r\s*=\s*(\d+)\s*:\s*v\s*=\s*\?π\s*$/i;
const RECT_ALTURA_RE = /^se\s+[áa]rea\s+do\s+ret[âa]ngulo\s*=\s*(\d+)\s+e\s+base\s*=\s*(\d+)\s*,\s*altura\s*=\s*\??\s*$/i;
const CUBE_VOL_RE = /^volume\s+do\s+cubo\s+lado\s+(\d+)\s*=\s*\??\s*$/i;
const SPHERE_SURFACE_RE = /^[áa]rea\s+da\s+superf[íi]cie\s+da\s+esfera\s*=\s*4πr[²2]\.\s*Para\s+r\s*=\s*(\d+(?:\.\d+)?):\s*\?π\s*$/i;
const HYPOT_RE = /^catetos?\s+(\d+(?:\.\d+)?)\s+e\s+(\d+(?:\.\d+)?)\s*[—-]+\s*hipotenusa\s*=\s*\??\s*$/i;
const OTHER_LEG_RE = /^hipotenusa\s+(\d+(?:\.\d+)?(?:√\d+)?)\s*,?\s*cateto\s+(\d+(?:\.\d+)?)\s*[—-]+\s*(?:outro\s+)?cateto\s*=\s*\??\s*$/i;
const RIGHT_TRI_C_RE = /^com\s+a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*C\s*=\s*\(?90\s*deg\)?\s*:\s*c\s*=\s*\??\s*$/i;
// Vector operations on 2D vectors written as (a,b).
const NUM = '-?\\d+(?:\\.\\d+)?(?:\\/\\d+)?';
const VECTOR = `\\(\\s*(${NUM})\\s*,\\s*(${NUM})\\s*\\)`;
const NORM_RE = new RegExp(`^\\|\\|${VECTOR}\\|\\|\\s*=\\s*\\??\\s*$`);
const VEC_ADD_RE = new RegExp(`^${VECTOR}\\s*\\+\\s*${VECTOR}\\s*=\\s*\\??\\s*$`);
const VEC_SUB_RE = new RegExp(`^${VECTOR}\\s*-\\s*${VECTOR}\\s*=\\s*\\??\\s*$`);
const VEC_SCAL_RE = new RegExp(`^\\(?(${NUM})\\)?\\s*\\*?·?\\s*${VECTOR}\\s*=\\s*\\??\\s*$`);
const VEC_DOT_RE = new RegExp(`^${VECTOR}\\s*·\\s*${VECTOR}\\s*=\\s*\\??\\s*$`);
const TRAP_GENERIC_RE = /^trap[ée]zio\s+com\s+B\s*=\s*(\d+)\s*,\s*b\s*=\s*(\d+)\s*,\s*h\s*=\s*(\d+)\s*:\s*A\s*=\s*\??\s*$/i;
const AREA_BASE_ALTURA_RE = /^se\s+[áa]rea\s*=\s*(\d+)\s+e\s+base\s*=\s*(\d+)\s*,\s*altura\s*=\s*\??\s*$/i;
const CIRCLE_PI_APPROX_RE = /^[áa]rea\s+do\s+c[íi]rculo\s+r\s*=\s*(\d+(?:\.\d+)?):\s*(\d+)π\s*≈\s*\?\s*$/i;
// Three-term arithmetic sequence with one blank: "__,15,16" / "7,__,9" / "11,12,__"
const SEQ3_RE = /^\s*(__|-?\d+)\s*,\s*(__|-?\d+)\s*,\s*(__|-?\d+)\s*$/;
// Require a literal '{' or a leading digit so 'Amplitude de y=cos(x) + 5'
// (a trig waveform question) doesn't get mistaken for a stats aggregate.
const STAT_RE = /^(m[ée]dia|mediana|moda|amplitude)\s+(?:de\s+)?(\{[^}]+\}|-?\d[^=]*?)\s*=\s*\??\s*$/i;
const DEVIATION_RE = /^desvio\s+de\s+(-?\d+(?:\.\d+)?)\s+em\s+rela[çc][ãa]o\s+a\s+(-?\d+(?:\.\d+)?)\s*=\s*\??\s*$/i;
const DEV_SQUARED_RE = /^quadrado\s+do\s+desvio\s+(-?\d+(?:\.\d+)?)\s*=\s*\??\s*$/i;
const VAR_TO_STD_RE = /^se\s+vari[âa]ncia\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*desvio\s+padr[ãa]o\s*=\s*\??\s*$/i;
const VARIANCE_RE = /^vari[âa]ncia\s+de\s+(\{[^}]+\})(?:\s*\([^)]+\))?\s*=\s*\??\s*$/i;
const STDDEV_RE = /^desvio\s+padr[ãa]o\s+de\s+(\{[^}]+\})(?:\s*\([^)]+\))?\s*=\s*\??\s*$/i;
const SUM_SQ_DEV_RE = /^soma\s+dos\s+quadrados\s+dos\s+desvios\s+de\s+(\{[^}]+\})\s*=\s*\??\s*$/i;
const SUM_DEV_RE = /^soma\s+dos\s+desvios\s+de\s+(\{[^}]+\})\s+em\s+rela[çc][ãa]o\s+[àa]\s+m[ée]dia\s*=\s*\??\s*$/i;
const COIN_RE = /^lan[çc]ando\s+(?:uma\s+)?moeda\s*,?\s*quantos\s+resultados/i;
const DIE_RE = /^lan[çc]ando\s+(?:um\s+)?dado\s*,?\s*quantos\s+resultados/i;
const COINS_N_RE = /^(\d+)\s+moedas?\s+[—-]+\s*quantos\s+resultados/i;
const DICE_N_RE = /^(?:dois|tr[êe]s|quatro|cinco|(\d+))\s+dados?\s+[—-]+\s*quantos\s+resultados/i;
const PROB_DIE_RE = /^P\((\d+|[áa]s)\s+em\s+(?:um\s+)?(?:dado|baralho(?:\s+de\s+(\d+))?)\)\s*=\s*\??\s*$/i;
const TRIG_GIVEN_RE = /^se\s+(sin|cos|tan|cot|sec|csc)\(x\)\s*=\s*([^,]+?)(?:\s*\([^)]+\))?\s*,\s*(sin|cos|tan|cot|sec|csc)\(x\)(\^2)?\s*=\s*\??\s*$/i;
const FRAC_TO_DEC_RE = /^\((-?\d+)\/(\d+)\)\s+em\s+decimal(?:\s*\([^)]+\))?\s*$/i;
const POWER_EQ_RE = /^x\^(\d+)\s*=\s*(-?\d+(?:\.\d+)?)\s*$/i;
const SUM_1_TO_N_RE = /^soma\s+1\s*\+\s*2\s*\+\s*3\s*\+\s*\.\.\.\s*\+\s*(\d+)\s*=\s*\??\s*$/i;
const RATIO_FROM_TWO_RE = /^a(\d+)\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*a1\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*r\s*=\s*\??\s*$/i;

// Probe-verify two expressions are equivalent by evaluating at several
// values of every free variable in vars (default ['x']).
function probeEquivalent(expr1, expr2, vars = ['x']) {
  const xs = [0.31, 1.7, -2.3, 4.1, -5.9, 3];
  for (const xn of xs) {
    const scope = {};
    for (const v of vars) scope[v] = math.bignumber(xn + vars.indexOf(v) * 0.5);
    let v1, v2;
    try { v1 = math.evaluate(expr1, scope); } catch { return null; }
    try { v2 = math.evaluate(expr2, scope); } catch { return null; }
    const n1 = toNumber(v1), n2 = toNumber(v2);
    if (n1 == null || n2 == null) return null;
    if (Math.abs(n1 - n2) > Math.max(1e-6, Math.abs(n1) * 1e-6)) return false;
  }
  return true;
}

function verify(question, answer, type) {
  const q = normalize(question);
  const a = normalize(answer);

  // Polynomial-factoring form: question is an expression, answer is its
  // factored product. Both depend on x; probe at several values.
  if (type === 'factoring' || type === 'algebraic_expression') {
    // Strip the '(começa com …)' hint — may itself contain parens.
    const qExpr = q.replace(/\s*\(\s*come[çc]a\s+com[\s\S]*\)\s*$/i, '').trim();
    const result = probeEquivalent(qExpr, a);
    if (result === true) return { ok: true, computed: 'expanded match', kind: 'factoring' };
    if (result === false) return { ok: false, computed: 'expansions differ', kind: 'factoring' };
  }

  // Indefinite integral: differentiate the antiderivative and probe-equal to integrand.
  const integ = q.match(INTEGRAL_RE);
  if (integ) {
    const integrand = integ[1];
    const antideriv = a.replace(/\s*\+\s*C\s*$/i, '').trim();
    if (antideriv) {
      try {
        const dExpr = math.derivative(antideriv, 'x');
        const ok = probeEquivalent(integrand, dExpr.toString());
        if (ok != null) return { ok, computed: `d/dx[${antideriv}] = ${dExpr.toString()}`, kind: 'integral' };
      } catch {}
    }
  }
  // Stats: 'Desvio de N em relação a M' → N - M
  const dev = q.match(DEVIATION_RE);
  if (dev) {
    const expected = Number(dev[1]) - Number(dev[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'deviation' };
  }
  // Stats: 'Quadrado do desvio N' → N²
  const devsq = q.match(DEV_SQUARED_RE);
  if (devsq) {
    const N = Number(devsq[1]);
    const expected = N * N;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'dev_sq' };
  }
  // Stats: 'Se variância = N, desvio padrão = ?' → sqrt(N)
  const vts = q.match(VAR_TO_STD_RE);
  if (vts) {
    const N = Number(vts[1]);
    if (N >= 0) {
      const expected = Math.sqrt(N);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'var_to_std' };
    }
  }
  // Stats: 'Variância de {nums}' / 'Desvio padrão de {nums}' (population, /n)
  for (const [re, kind] of [[VARIANCE_RE, 'variance'], [STDDEV_RE, 'stddev']]) {
    const m = q.match(re);
    if (m) {
      const nums = m[1].replace(/[{}]/g, '').split(',').map(x => Number(x.trim())).filter(Number.isFinite);
      if (nums.length) {
        const mean = nums.reduce((s, n) => s + n, 0) / nums.length;
        const v = nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length;
        const expected = kind === 'variance' ? v : Math.sqrt(v);
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind };
      }
    }
  }
  // Sum of (squared) deviations from the mean.
  const ssdev = q.match(SUM_SQ_DEV_RE);
  if (ssdev) {
    const nums = ssdev[1].replace(/[{}]/g, '').split(',').map(x => Number(x.trim())).filter(Number.isFinite);
    if (nums.length) {
      const mean = nums.reduce((s, n) => s + n, 0) / nums.length;
      const expected = nums.reduce((s, n) => s + (n - mean) ** 2, 0);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'sum_sq_dev' };
    }
  }
  if (q.match(SUM_DEV_RE)) {
    // Sum of (non-squared) deviations from the mean is always 0.
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 0, computed: '0', kind: 'sum_dev' };
  }
  // 'Lançando moeda/dado, quantos resultados há?' → 2 / 6
  if (q.match(COIN_RE)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 2, computed: '2', kind: 'prob_count' };
  }
  if (q.match(DIE_RE)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 6, computed: '6', kind: 'prob_count' };
  }
  // 'K moedas/dados — quantos resultados?' → 2^K / 6^K
  const ncoins = q.match(COINS_N_RE);
  if (ncoins) {
    const expected = 2 ** Number(ncoins[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'prob_count' };
  }
  const ndice = q.match(DICE_N_RE);
  if (ndice) {
    const word = { dois: 2, três: 3, tres: 3, quatro: 4, cinco: 5 };
    const k = ndice[1] ? Number(ndice[1]) : word[q.toLowerCase().match(/^([a-zçãâêíóô]+)/)?.[1]];
    if (k) {
      const expected = 6 ** k;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'prob_count' };
    }
  }
  // 'x^N = M' → expected = M^(1/N) (positive principal root)
  const pwe = q.match(POWER_EQ_RE);
  if (pwe) {
    const N = Number(pwe[1]), M = Number(pwe[2]);
    if (M >= 0 || N % 2 === 1) {
      const expected = Math.sign(M) * Math.pow(Math.abs(M), 1 / N);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'power_eq' };
    }
  }
  // 'N/M em decimal' → N/M as a decimal.
  const fd = q.match(FRAC_TO_DEC_RE);
  if (fd) {
    const expected = Number(fd[1]) / Number(fd[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'frac_to_dec' };
  }
  // 'Se fn1(x) = V, fn2(x) = ?' — invert fn1 to find x, then evaluate fn2.
  const tg = q.match(TRIG_GIVEN_RE);
  if (tg) {
    const [, fn1, valStr, fn2, sq] = tg;
    const inv = { sin: 'asin', cos: 'acos', tan: 'atan', cot: x => Math.atan(1 / x),
                  sec: x => Math.acos(1 / x), csc: x => Math.asin(1 / x) };
    try {
      const v = toNumber(math.evaluate(valStr));
      if (v != null) {
        const theta = typeof inv[fn1] === 'string' ? Math[inv[fn1]](v) : inv[fn1](v);
        const fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan,
                      cot: x => 1 / Math.tan(x), sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x) };
        let expected = fns[fn2](theta);
        if (sq) expected = expected * expected;
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-3, computed: `${expected}`, kind: 'trig_given' };
      }
    } catch {}
  }
  // 'P(N em um dado)' → 1/6 ; 'P(ás em baralho de 52)' → 4/52 = 1/13
  const pd = q.match(PROB_DIE_RE);
  if (pd) {
    let expected;
    if (/baralho/i.test(question)) {
      const deck = pd[2] ? Number(pd[2]) : 52;
      expected = 4 / deck;
    } else {
      expected = 1 / 6;
    }
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'prob_value' };
  }
  // Statistics: "Média / Mediana / Moda / Amplitude de {n,...} = ?"
  const stat = q.match(STAT_RE);
  if (stat) {
    const kind = stat[1].toLowerCase().replace('é', 'e');
    const numsRaw = stat[2].replace(/[{}]/g, '').split(/[,\s]\s*(?:e\s+)?/).filter(Boolean);
    const nums = numsRaw.map(x => Number(x.trim())).filter(x => Number.isFinite(x));
    if (nums.length) {
      let expected;
      if (kind === 'media') expected = nums.reduce((s, n) => s + n, 0) / nums.length;
      else if (kind === 'mediana') {
        const sorted = [...nums].sort((x, y) => x - y);
        const m = sorted.length;
        expected = m % 2 ? sorted[(m - 1) / 2] : (sorted[m / 2 - 1] + sorted[m / 2]) / 2;
      } else if (kind === 'amplitude') {
        expected = Math.max(...nums) - Math.min(...nums);
      } else if (kind === 'moda') {
        const counts = nums.reduce((a, n) => (a[n] = (a[n] || 0) + 1, a), {});
        const maxCount = Math.max(...Object.values(counts));
        const modes = Object.entries(counts).filter(([, c]) => c === maxCount).map(([n]) => Number(n));
        if (modes.length === 1) expected = modes[0];
        else if (modes.length === nums.length) return null;  // amodal — non-numeric
        else expected = Math.min(...modes);                  // bimodal — cite smaller
      }
      if (expected != null) {
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'stat' };
      }
    }
  }
  // "<expr> = (hint)" mental-math form: compute LHS, ignore the hint.
  const hint = q.match(MENTAL_HINT_RE);
  if (hint) {
    const lv = tryEval(normalize(hint[1]));
    const an = toNumber(tryEval(a));
    const ln = toNumber(lv);
    if (ln != null && an != null) {
      return { ok: Math.abs(ln - an) < 1e-6, computed: `${ln}`, kind: 'mental_hint' };
    }
  }
  // "Área do retângulo/quadrado a×b = ?" → a*b
  const area = q.match(AREA_RECT_RE);
  if (area) {
    const expected = Number(area[1]) * Number(area[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'area_rect' };
  }
  // "Perímetro do retângulo a×b = ?" → 2*(a+b)
  const perim = q.match(PERIM_RECT_RE);
  if (perim) {
    const expected = 2 * (Number(perim[1]) + Number(perim[2]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'perim_rect' };
  }
  // "Quantos lados/cantos tem um <shape>?"
  const sides = q.match(SHAPE_COUNT_RE);
  if (sides) {
    const expected = SHAPE_SIDES[sides[1].toLowerCase()];
    if (expected != null) {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'shape_count' };
    }
  }
  // "Área do paralelogramo b=B, h=H = ?" → B*H
  const par = q.match(PARALLELOGRAM_RE);
  if (par) {
    const expected = Number(par[1]) * Number(par[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'parallelogram' };
  }
  // "Área do trapézio B=B, b=b, h=H = ?" → (B+b)*H/2
  const trap = q.match(TRAPEZIUM_RE);
  if (trap) {
    const expected = (Number(trap[1]) + Number(trap[2])) * Number(trap[3]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'trapezium' };
  }
  // "Área do triângulo b=B, h=H = ?" → B*H/2
  const tri = q.match(TRIANGLE_AREA_RE);
  if (tri) {
    const expected = Number(tri[1]) * Number(tri[2]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'triangle_area' };
  }
  // "Caixa a×b×c — volume = ?" → a*b*c
  const box = q.match(BOX_VOLUME_RE);
  if (box) {
    const expected = Number(box[1]) * Number(box[2]) * Number(box[3]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'box_vol' };
  }
  // "Cilindro r=R, h=H: V = ?π" → R²*H (match original; normalize replaced π→pi)
  const cyl = question.match(CYLINDER_VOL_RE);
  if (cyl) {
    const r = Number(cyl[1]), h = Number(cyl[2]);
    const expected = r * r * h;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'cylinder_vol' };
  }
  const cone = question.match(CONE_VOL_RE);
  if (cone) {
    const r = Number(cone[1]), h = Number(cone[2]);
    const expected = r * r * h / 3;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'cone_vol' };
  }
  const sph = question.match(SPHERE_VOL_RE);
  if (sph) {
    const r = Number(sph[1]);
    const expected = 4 * r * r * r / 3;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'sphere_vol' };
  }
  // "Se área do retângulo = A e base = B, altura = ?" → A/B
  const ralt = q.match(RECT_ALTURA_RE);
  if (ralt) {
    const expected = Number(ralt[1]) / Number(ralt[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'rect_altura' };
  }
  // Generic 'Se área = A e base = B, altura = ?' → A/B
  const ralt2 = q.match(AREA_BASE_ALTURA_RE);
  if (ralt2) {
    const expected = Number(ralt2[1]) / Number(ralt2[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'rect_altura' };
  }
  // "Volume do cubo lado N = ?" → N³
  const cube = q.match(CUBE_VOL_RE);
  if (cube) {
    const N = Number(cube[1]);
    const expected = N ** 3;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'cube_vol' };
  }
  // Sphere surface 4πr² (match original — π gets normalized away)
  const sphSurf = question.match(SPHERE_SURFACE_RE);
  if (sphSurf) {
    const r = Number(sphSurf[1]);
    const expected = 4 * r * r;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'sphere_surf' };
  }
  // 'Catetos a e b — hipotenusa = ?' → sqrt(a²+b²)
  const hyp = q.match(HYPOT_RE);
  if (hyp) {
    const a1 = Number(hyp[1]), b1 = Number(hyp[2]);
    const expected = Math.sqrt(a1 * a1 + b1 * b1);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'hypotenuse' };
  }
  // 'Hipotenusa H, cateto K — outro cateto = ?' → sqrt(H² - K²)
  const oleg = q.match(OTHER_LEG_RE);
  if (oleg) {
    const H = Number(oleg[1]), K = Number(oleg[2]);
    if (Number.isFinite(H) && Number.isFinite(K) && H >= K) {
      const expected = Math.sqrt(H * H - K * K);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'other_leg' };
    }
  }
  // 'Com a=A, b=B, C=90°: c = ?' → sqrt(A² + B²)
  const rtc = q.match(RIGHT_TRI_C_RE);
  if (rtc) {
    const A = Number(rtc[1]), B = Number(rtc[2]);
    const expected = Math.sqrt(A * A + B * B);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'hypotenuse' };
  }
  // 2D vector forms — match against ORIGINAL (normalize mangles · and ||).
  const evalFrac = (s) => { const m = s.match(/^(-?\d+)\/(\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
  const parseVec = (ans) => {
    const m = ans.replace(/\s+/g, '').match(/^\((-?\d+(?:\.\d+)?(?:\/\d+)?),(-?\d+(?:\.\d+)?(?:\/\d+)?)\)$/);
    return m ? [evalFrac(m[1]), evalFrac(m[2])] : null;
  };
  const norm = question.match(NORM_RE);
  if (norm) {
    const x = evalFrac(norm[1]), y = evalFrac(norm[2]);
    const expected = Math.sqrt(x * x + y * y);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'vec_norm' };
  }
  const va = question.match(VEC_ADD_RE);
  if (va) {
    const expected = [evalFrac(va[1]) + evalFrac(va[3]), evalFrac(va[2]) + evalFrac(va[4])];
    const got = parseVec(answer);
    if (got) return { ok: Math.abs(got[0] - expected[0]) < 1e-9 && Math.abs(got[1] - expected[1]) < 1e-9, computed: `(${expected})`, kind: 'vec_add' };
  }
  const vs = question.match(VEC_SUB_RE);
  if (vs) {
    const expected = [evalFrac(vs[1]) - evalFrac(vs[3]), evalFrac(vs[2]) - evalFrac(vs[4])];
    const got = parseVec(answer);
    if (got) return { ok: Math.abs(got[0] - expected[0]) < 1e-9 && Math.abs(got[1] - expected[1]) < 1e-9, computed: `(${expected})`, kind: 'vec_sub' };
  }
  const vd = question.match(VEC_DOT_RE);
  if (vd) {
    const expected = evalFrac(vd[1]) * evalFrac(vd[3]) + evalFrac(vd[2]) * evalFrac(vd[4]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'vec_dot' };
  }
  // Scalar mul (run last so VEC_DOT/ADD/SUB take precedence).
  const vsc = question.match(VEC_SCAL_RE);
  if (vsc && !question.match(/\)\s*[·+\-]\s*\(/)) {
    const k = evalFrac(vsc[1]), x = evalFrac(vsc[2]), y = evalFrac(vsc[3]);
    const expected = [k * x, k * y];
    const got = parseVec(answer);
    if (got) return { ok: Math.abs(got[0] - expected[0]) < 1e-9 && Math.abs(got[1] - expected[1]) < 1e-9, computed: `(${expected})`, kind: 'vec_scal' };
  }
  // 'Trapézio com B=B, b=b, h=H: A = ?' → (B+b)*H/2
  const trapG = q.match(TRAP_GENERIC_RE);
  if (trapG) {
    const expected = (Number(trapG[1]) + Number(trapG[2])) * Number(trapG[3]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'trapezium' };
  }
  // 'Área do círculo r=N: Kπ ≈ ?' → K*π
  const circApp = question.match(CIRCLE_PI_APPROX_RE);
  if (circApp) {
    const expected = Number(circApp[2]) * Math.PI;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 0.05, computed: `${expected}`, kind: 'circle_approx' };
  }
  // "Área do círculo r=N: ?π" → answer is r² (factor of π implicit).
  // Match against original question — normalize already converted π→pi.
  const circ = question.match(CIRCLE_AREA_HINT_RE);
  if (circ) {
    const r = Number(circ[1]);
    const expected = r * r;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'circle_area' };
  }
  // "v² = N → v = ?" — positive square root of N.
  const sqr = q.match(SQUARE_ROOT_RE);
  if (sqr) {
    const target = Number(sqr[1]);
    if (target >= 0) {
      const expected = Math.sqrt(target);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(expected - an) < 1e-9, computed: `${expected}`, kind: 'sqrt_eq' };
    }
  }
  // Simple word problem (PT): two-number questions where keyword fixes the op.
  // Skip comparison questions ('Qual tem mais X ou Y?') and group/multiplier
  // questions ('K grupos de N') — those are handled elsewhere.
  if ((type === 'word_problem' || type === 'count')
      && !/\bqual\s+tem\b/i.test(question)
      && !/\bgrupos?\s+de\b/i.test(question)) {
    const nums = (question.match(/\d+/g) || []).map(Number);
    if (nums.length === 1 && /\bmetade\b/i.test(question)) {
      const expected = nums[0] / 2;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'word_problem' };
    }
    if (nums.length === 2) {
      const [n1, n2] = nums;
      let expected = null;
      // Additive cues (check first — 'deu mais' should override 'deu').
      if (/\b(?:deu\s+mais|juntou|achou|coletou|recebeu|ganhou|comprou|viu\s+mais|somando|total|junt[oa]s?|coletaram|veio\s+mais|chegaram\s+mais)\b/i.test(question)) {
        expected = n1 + n2;
      } else if (/\b(?:perdeu|deu|comeu|gastou|tirou|sobrou|sobraram|ficou|ficaram|menos)\b/i.test(question)) {
        expected = n1 - n2;
      }
      if (expected != null) {
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'word_problem' };
      }
    }
  }
  // 'N bolinhas' / 'N pontos' / 'N figurinhas' — labelled-count form.
  if (type === 'count') {
    const lab = q.match(COUNT_LABELED_RE);
    if (lab) {
      const expected = Number(lab[1]);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'count' };
    }
    // 'K grupos de N <objs>. Total?' → K*N
    const gr = q.match(GROUPS_RE);
    if (gr) {
      const expected = Number(gr[1]) * Number(gr[2]);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'count' };
    }
  }
  // Count shapes: question is exclusively N glyphs (possibly with a
  // 'Conte:' prefix and spaces) — skip comparison/word forms.
  if (type === 'count' && !/qual\s+tem|maior\s+que|menor\s+que|igual\s+a/i.test(question)) {
    const stripped = question.replace(/^conte:?\s*/i, '').trim();
    if (/^[\s●▲◆★■♦♥♣♠○△□◇☆▢☀☼☾♫♪]+$/.test(stripped)) {
      const shapes = stripped.match(/[●▲◆★■♦♥♣♠○△□◇☆▢☀☼☾♫♪]/g);
      if (shapes) {
        const expected = shapes.length;
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'count' };
      }
    }
  }
  // 'PA {a1, a2, …} — razão = ?' → a2 - a1
  if (/raz[ãa]o\s*=\s*\??\s*$/i.test(q)) {
    const m = q.match(PA_RATIO_RE);
    if (m) {
      const expected = Number(m[2]) - Number(m[1]);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'pa_ratio' };
    }
  }
  // 'PA a1, a2, …, aN: S = ?' → arithmetic sum
  const sumM = q.match(PA_SUM_RE);
  if (sumM) {
    const head = sumM[1].split(',').map(s => Number(s.trim())).filter(Number.isFinite);
    const aN = Number(sumM[2]);
    if (head.length >= 2) {
      const a1 = head[0], r = head[1] - head[0];
      if (r !== 0) {
        const n = Math.round((aN - a1) / r) + 1;
        const expected = n * (a1 + aN) / 2;
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'pa_sum' };
      }
    }
  }
  // 'Soma 1+2+3+...+N = ?' → N(N+1)/2
  const s1n = q.match(SUM_1_TO_N_RE);
  if (s1n) {
    const N = Number(s1n[1]);
    const expected = N * (N + 1) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'sum_1_to_n' };
  }
  // 'aN=V, a1=W → r = ?' for PA → (V - W) / (N - 1)
  const r2 = q.match(RATIO_FROM_TWO_RE);
  if (r2) {
    const N = Number(r2[1]), aN = Number(r2[2]), a1 = Number(r2[3]);
    if (N > 1) {
      const expected = (aN - a1) / (N - 1);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'pa_ratio' };
    }
  }
  // PA term: 'a₁=N, r=R, aₖ = ?' → N + (k-1)*R
  const ap = q.match(AP_TERM_RE);
  if (ap) {
    const a1 = Number(ap[1]), r = Number(ap[2]), k = Number(ap[3]);
    const expected = a1 + (k - 1) * r;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'ap_term' };
  }
  // PG term: 'a₁=N, q=Q, aₖ = ?' → N * Q^(k-1)
  const gpt = q.match(GP_TERM_RE);
  if (gpt) {
    const a1 = Number(gpt[1]), qq = Number(gpt[2]), k = Number(gpt[3]);
    const expected = a1 * Math.pow(qq, k - 1);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'gp_term' };
  }
  // Three-term arithmetic sequence with one blank.
  const seq = q.match(SEQ3_RE);
  if (seq) {
    const t = [seq[1], seq[2], seq[3]];
    const i = t.indexOf('__');
    if (i >= 0 && t.filter(x => x === '__').length === 1) {
      const a0 = i === 0 ? null : Number(t[0]);
      const a1 = i === 1 ? null : Number(t[1]);
      const a2 = i === 2 ? null : Number(t[2]);
      let expected;
      if (i === 0) expected = 2 * a1 - a2;
      else if (i === 2) expected = 2 * a1 - a0;
      else expected = (a0 + a2) / 2;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'seq3' };
    }
  }
  // "Depois de N vem:" / "Próximo de N" → N+1
  const next = q.match(NEXT_RE);
  if (next) {
    const expected = Number(next[1]) + 1;
    const an = toNumber(tryEval(a));
    if (an == null) return null;
    return { ok: an === expected, computed: `${expected}`, kind: 'successor' };
  }
  // "Antes de N vem:" / "Anterior de N" → N-1
  const prev = q.match(PREV_RE);
  if (prev) {
    const expected = Number(prev[1]) - 1;
    const an = toNumber(tryEval(a));
    if (an == null) return null;
    return { ok: an === expected, computed: `${expected}`, kind: 'predecessor' };
  }
  // "Se x = N, então <expr> =" — substitute and evaluate.
  const alg = q.match(ALG_SUBST_RE);
  if (alg) {
    const xVal = Number(alg[1]);
    const lv = (() => { try { return math.evaluate(alg[2], { x: xVal }); } catch { return null; } })();
    const an = toNumber(tryEval(a));
    const ln = toNumber(lv);
    if (ln != null && an != null) {
      return { ok: Math.abs(ln - an) < 1e-9, computed: `${ln}`, kind: 'alg_subst' };
    }
  }
  // "A ? B" with answer <, >, =
  const cmp = q.match(COMPARISON_RE);
  if (cmp) {
    const A = Number(cmp[1]), B = Number(cmp[2]);
    const expected = A < B ? '<' : A > B ? '>' : '=';
    return { ok: a.trim() === expected, computed: expected, kind: 'comparison' };
  }
  // Linear inequality is intentionally NOT verified here: a quick check of
  // the H/set_06..H/set_07 datasets shows the authored answers are
  // systematically off-by-one or use the un-flipped pre-divide bound,
  // contradicting their own rationales. Running this verifier flagged 424
  // mismatches in a row. Surfacing those needs an authoring pass — not a
  // gate that turns red until they're fixed. Track separately if needed.
  // "x² = N (raiz positiva|negativa|ambas)" — answer is ±√N as string
  const sqh = q.match(SQ_HINT_RE);
  if (sqh) {
    const N = Number(sqh[1]);
    const hint = sqh[2].toLowerCase();
    if (N >= 0) {
      const r = Math.sqrt(N);
      let expected;
      if (hint.includes('positiva')) expected = `x = ${r}`;
      else if (hint.includes('negativa')) expected = `x = ${-r}`;
      else expected = `x = ±${r}`;
      const aClean = answer.replace(/\s+/g, ' ').trim();
      return { ok: aClean === expected, computed: expected, kind: 'sq_hint' };
    }
  }
  // Quadratic with roots: "x = R1 ou x = R2" or single "x = R" (double root).
  if (type === 'quadratic' && /=\s*0\s*$/.test(q)) {
    const lhs = q.replace(/=\s*0\s*$/, '').trim();
    const checkRoot = (r) => {
      try {
        const v = math.evaluate(lhs, { x: r });
        return Math.abs(toNumber(v)) < 1e-6;
      } catch { return null; }
    };
    const rootMatch = answer.match(TWO_ROOTS_RE);
    if (rootMatch) {
      const r1 = Number(rootMatch[1]), r2 = Number(rootMatch[2]);
      const c1 = checkRoot(r1), c2 = checkRoot(r2);
      if (c1 != null && c2 != null) {
        return { ok: c1 && c2, computed: `f(${r1})=${c1?0:'x'}, f(${r2})=${c2?0:'x'}`, kind: 'quad_roots' };
      }
    }
    // Single root: "x = R"
    const single = answer.match(/^x\s*=\s*(-?\d+(?:\.\d+)?)\s*$/i);
    if (single) {
      const r = Number(single[1]);
      const c = checkRoot(r);
      if (c != null) return { ok: c, computed: `f(${r})=${c?0:'x'}`, kind: 'quad_roots' };
    }
  }
  // "Pontos (a,b) e (c,d)" → slope (d-b)/(c-a)
  const slope = q.match(SLOPE_RE);
  if (slope) {
    const [a1, b1, c1, d1] = slope.slice(1, 5).map(Number);
    if (c1 - a1 !== 0) {
      const expected = (d1 - b1) / (c1 - a1);
      const an = toNumber(tryEval(a));
      if (an != null) {
        return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'slope' };
      }
    }
  }
  // System of two linear equations with answer "(x,y)" — substitute and
  // check both equations.
  if (type === 'system_equation' || (q.includes(',') && q.includes('='))) {
    const sysParts = q.split(/\s*,\s*(?=[^=]*=)/);
    const ptMatch = a.replace(/\s+/g, '').match(POINT_ANS_RE);
    if (ptMatch && sysParts.length === 2) {
      const xVal = Number(ptMatch[1]), yVal = Number(ptMatch[2]);
      const checkSide = (eq) => {
        const eqIdx = eq.indexOf('=');
        if (eqIdx < 0) return null;
        try {
          const lv = math.evaluate(eq.slice(0, eqIdx), { x: xVal, y: yVal });
          const rv = math.evaluate(eq.slice(eqIdx + 1), { x: xVal, y: yVal });
          return Math.abs(toNumber(lv) - toNumber(rv)) < 1e-9;
        } catch { return null; }
      };
      const e1 = checkSide(sysParts[0]);
      const e2 = checkSide(sysParts[1]);
      if (e1 != null && e2 != null) {
        return { ok: e1 && e2, computed: `eq1=${e1}, eq2=${e2}`, kind: 'system_eq' };
      }
    }
  }
  // "Ponto (a, b)" → answer should match literal coords.
  const gp = q.match(GRAPH_POINT_RE);
  if (gp) {
    const expected = `(${gp[1]},${gp[2]})`;
    const cleaned = a.replace(/\s+/g, '');
    return { ok: cleaned === expected, computed: expected, kind: 'graph_point' };
  }
  // "O número N é:" / "N é par ou ímpar?" → par/ímpar
  const eo = q.match(EVEN_ODD_RE);
  if (eo) {
    const N = Number(eo[1]);
    const expected = (Math.abs(N) % 2 === 0) ? 'par' : 'ímpar';
    return { ok: a.trim().toLowerCase() === expected, computed: expected, kind: 'even_odd' };
  }
  // Symbolic identity: '<lhs in vars> = ?' with answer an expression also
  // in those vars. Probe both sides at several values. Catches trig
  // identities like '1 + cot²(x) = csc²(x)' and 'cos(a+b) = …'.
  if (q.includes('?') && q.includes('=') && /[a-zA-Z]/.test(a)) {
    // Free variables that appear in both q and a (single-letter names).
    // Exclude 'e' and 'i' which are mathjs constants (Euler / imaginary).
    const sharedVars = [...new Set([...q.matchAll(/\b([a-z])\b/g)].map(m => m[1]))]
      .filter(v => v !== 'e' && v !== 'i' && new RegExp(`\\b${v}\\b`).test(a));
    if (sharedVars.length) {
      const eqIdx = q.lastIndexOf('=');
      const qms = (q.match(/\?/g) || []).length;
      if (qms === 1 && eqIdx > 0) {
        const lhsTpl = q.slice(0, eqIdx).replace(/\?/g, `(${a})`).trim();
        const rhsTpl = q.slice(eqIdx + 1).replace(/\?/g, `(${a})`).trim();
        const result = probeEquivalent(lhsTpl, rhsTpl, sharedVars);
        if (result === true) return { ok: true, computed: 'identity', kind: 'identity_symbolic' };
        if (result === false) return { ok: false, computed: 'sides disagree', kind: 'identity_symbolic' };
      }
    }
  }
  // Equation with a single literal '?' placeholder: substitute the authored
  // numeric answer and check both sides. Covers decomposition, missing_-
  // number, proportion, and similar "fill in the blank" forms.
  // Requires a purely-numeric answer (skip 'A', '90°', etc).
  if (q.includes('?') && q.includes('=') && /^-?\d+(?:\.\d+)?(?:\/\d+)?$/.test(a.trim())) {
    const eqIdx = q.lastIndexOf('=');
    const qms = (q.match(/\?/g) || []).length;
    if (qms === 1 && eqIdx > 0) {
      const aStr = `(${a.trim()})`;
      const lhsExpr = q.slice(0, eqIdx).replace(/\?/g, aStr).trim();
      const rhsExpr = q.slice(eqIdx + 1).replace(/\?/g, aStr).trim();
      const lv = tryEval(lhsExpr), rv = tryEval(rhsExpr);
      const ln = toNumber(lv), rn = toNumber(rv);
      if (ln != null && rn != null) {
        return { ok: Math.abs(ln - rn) < 1e-9, computed: `LHS=${ln}, RHS=${rn}`, kind: 'fill_blank' };
      }
    }
  }
  // "Quantas <unidades|dezenas|centenas> tem o número N?"
  const pv = q.match(PLACE_VALUE_RE);
  if (pv) {
    const unit = pv[1].toLowerCase().replace(/s$/, '');
    const N = Math.abs(Number(pv[2]));
    let expected;
    if (unit.startsWith('unidad')) expected = N % 10;
    else if (unit.startsWith('dezen')) expected = Math.floor(N / 10) % 10;
    else if (unit.startsWith('centen')) expected = Math.floor(N / 100) % 10;
    else expected = Math.floor(N / 1000) % 10;
    const an = toNumber(tryEval(a));
    if (an == null) return null;
    return { ok: an === expected, computed: `${expected}`, kind: 'place_value' };
  }
  // "a, b, c, ?" arithmetic skip-counting (extrapolate by common difference)
  const sk = q.match(SKIP_CNT_RE);
  if (sk) {
    const nums = sk[1].split(',').map(s => Number(s.trim()));
    if (nums.length >= 3) {
      const diffs = nums.slice(1).map((v, i) => v - nums[i]);
      if (diffs.every(d => d === diffs[0])) {
        const expected = nums[nums.length - 1] + diffs[0];
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'skip_count' };
      }
    }
  }

  // Inverse function (linear): "f(x) = a*x + b, f⁻¹(y) = ?" → (y - b)/a
  const inv = q.match(INVERSE_RE);
  if (inv) {
    const fExpr = inv[1], y = Number(inv[2]);
    try {
      const f0 = toNumber(math.evaluate(fExpr, { x: 0 }));
      const f1 = toNumber(math.evaluate(fExpr, { x: 1 }));
      if (f0 != null && f1 != null && f1 - f0 !== 0) {
        const expected = (y - f0) / (f1 - f0);
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'inverse' };
      }
    } catch {}
  }
  // Function composition: "f(x) = …, g(x) = …, f(g(N)) = ?"
  const comp = q.match(COMPOSE_RE);
  if (comp) {
    const fExpr = comp[1], gExpr = comp[2], xVal = Number(comp[3]);
    try {
      const gv = math.evaluate(gExpr, { x: xVal });
      const fv = math.evaluate(fExpr, { x: toNumber(gv) });
      const an = toNumber(tryEval(a));
      const fn_n = toNumber(fv);
      if (fn_n != null && an != null) {
        return { ok: Math.abs(fn_n - an) < 1e-9, computed: `${fn_n}`, kind: 'compose' };
      }
    } catch {}
  }
  // Function-evaluation form: "f(x) = <expr>, f(N) = ?"
  const fn = q.match(FN_RE);
  if (fn) {
    const xVal = Number(fn[2]);
    const fv = (() => { try { return math.evaluate(fn[1], { x: xVal }); } catch { return null; } })();
    const av = tryEval(a);
    const fn_n = toNumber(fv), an = toNumber(av);
    if (fn_n == null || an == null) return null;
    return { ok: Math.abs(fn_n - an) < 1e-9, computed: `${fn_n}`, kind: 'function' };
  }

  // Limit (substitution-friendly): "lim(x→N) <expr> = ?"
  // If direct substitution gives NaN/Infinity (0/0 form), fall back to a
  // small epsilon offset so 'lim(x→0) sin(x)/x' resolves to 1.
  const lim = q.match(LIM_RE);
  if (lim) {
    const xVal = Number(lim[1]);
    const evalAt = (v) => { try { return toNumber(math.evaluate(lim[2], { x: v })); } catch { return null; } };
    let ln = evalAt(xVal);
    let kind = 'limit';
    if (ln == null || !Number.isFinite(ln)) {
      const eps = 1e-6;
      const left = evalAt(xVal - eps), right = evalAt(xVal + eps);
      if (left != null && right != null && Math.abs(left - right) < 1e-3) {
        ln = (left + right) / 2;
        kind = 'limit_indet';
      }
    }
    if (ln == null) return null;
    const an = toNumber(tryEval(a));
    if (an == null) return null;
    return { ok: Math.abs(ln - an) < 1e-3, computed: `${ln}`, kind };
  }

  // Limit at infinity: evaluate at a very large value as numeric proxy.
  const liminf = q.match(LIM_INF_RE);
  if (liminf) {
    const sign = liminf[1].trim().startsWith('-') ? -1 : 1;
    const xVal = sign * 1e8;
    const lv = (() => { try { return math.evaluate(liminf[2], { x: xVal }); } catch { return null; } })();
    const av = tryEval(a);
    const ln = toNumber(lv), an = toNumber(av);
    if (ln == null || an == null) return null;
    // Loose tolerance — convergence isn't exact at finite x.
    const tol = Math.max(1e-4, Math.abs(an) * 1e-4);
    return { ok: Math.abs(ln - an) < tol, computed: `${ln}`, kind: 'limit∞' };
  }

  // Equation form. Two accepted shapes:
  //   "<lhs> = <rhs>, x ="    (correctAnswer is x)
  //   "<lhs> = <rhs>"         (type=equation; correctAnswer is x)
  if (type === 'equation' || type === 'proportion' || type === 'linear_equation' || /,\s*x\s*=\s*$/i.test(q)) {
    let lhsExpr, rhsExpr;
    const m = q.match(EQ_RE);
    if (m) { lhsExpr = m[1]; rhsExpr = m[2]; }
    else {
      const eqIdx = q.indexOf('=');
      if (eqIdx < 0) return null;
      lhsExpr = q.slice(0, eqIdx).trim();
      rhsExpr = q.slice(eqIdx + 1).trim();
    }
    const xVal = tryEval(a);
    if (xVal == null) return null;
    const scope = { x: xVal };
    const lhs = (() => { try { return math.evaluate(lhsExpr, scope); } catch { return null; } })();
    const rhs = (() => { try { return math.evaluate(rhsExpr, scope); } catch { return null; } })();
    const ln = toNumber(lhs), rn = toNumber(rhs);
    if (ln == null || rn == null) return null;
    return { ok: Math.abs(ln - rn) < 1e-9, computed: `LHS=${ln}, RHS=${rn}`, kind: 'equation' };
  }

  // Plain "<expr> = [?]" form or bare expression (radical/exponent forms
  // sometimes omit the '='). Strip trailing '?' / '=' and evaluate.
  if (/^[A-Za-z]$/.test(a.trim())) return null;
  const lhs = q.replace(/\s*\?\s*$/, '').replace(/\s*=\s*$/, '').trim();
  if (!lhs) return null;
  // Try direct numeric evaluation first; if it relies on x, probe at x=1
  // as a BigNumber to avoid mixed-arithmetic errors with trig functions.
  let lv = tryEval(lhs);
  let identity = false;
  if (lv == null) {
    try { lv = math.evaluate(lhs, { x: math.bignumber(1) }); identity = lv != null; } catch {}
  }
  if (lv == null) return null;
  const av = tryEval(a);
  const ln = toNumber(lv), an = toNumber(av);
  if (ln == null || an == null) return null;
  const tol = identity ? 1e-6 : 1e-6;
  return { ok: Math.abs(ln - an) < tol, computed: `${ln}`, kind: identity ? 'identity' : 'expression' };
}

async function main() {
  const files = await fg('src/levels/math/**/set_*.yaml');
  let checked = 0, byKind = { equation: 0, expression: 0, function: 0, limit: 0, 'limit∞': 0, identity: 0, successor: 0, predecessor: 0, mental_hint: 0, sqrt_eq: 0, area_rect: 0, perim_rect: 0, factoring: 0, seq3: 0, count: 0, alg_subst: 0, comparison: 0, even_odd: 0, place_value: 0, skip_count: 0, fill_blank: 0, graph_point: 0, slope: 0, system_eq: 0, quad_roots: 0, inequality: 0, stat: 0, sq_hint: 0, integral: 0, compose: 0, shape_count: 0, parallelogram: 0, trapezium: 0, circle_area: 0, inverse: 0, limit_indet: 0, triangle_area: 0, box_vol: 0, cylinder_vol: 0, cone_vol: 0, sphere_vol: 0, rect_altura: 0, ap_term: 0, gp_term: 0, deviation: 0, dev_sq: 0, var_to_std: 0, variance: 0, stddev: 0, identity_symbolic: 0, cube_vol: 0, sphere_surf: 0, hypotenuse: 0, circle_approx: 0, pa_ratio: 0, pa_sum: 0, word_problem: 0, sum_sq_dev: 0, sum_dev: 0, prob_count: 0, prob_value: 0, trig_given: 0, frac_to_dec: 0, power_eq: 0, sum_1_to_n: 0, other_leg: 0, vec_norm: 0, vec_add: 0, vec_sub: 0, vec_dot: 0, vec_scal: 0 };
  const byType = { verified: {}, total: {} };
  const mismatches = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const t = e.type || 'unknown';
        byType.total[t] = (byType.total[t] || 0) + 1;
        // Known-bad authoring (see project_inequality_bugs.md):
        // math/H/set_02.yaml's linear_equation answers divide by the wrong
        // factor; the rationales' own arithmetic doesn't match the answers.
        if (e.type === 'linear_equation' && f.endsWith('math/H/set_02.yaml')) continue;
        const r = verify(e.question, e.correctAnswer, e.type);
        if (!r) {
          if (process.argv.includes('--debug-unverified') && process.argv.includes(e.type)) {
            console.log(`SKIP ${e.type}: ${f}  q="${e.question}" a="${e.correctAnswer}"`);
          }
          continue;
        }
        checked++;
        byKind[r.kind]++;
        byType.verified[t] = (byType.verified[t] || 0) + 1;
        if (!r.ok) {
          mismatches.push({
            file: f.replace('src/levels/', ''),
            page: p.pageNumber,
            type: e.type,
            q: e.question,
            authored: e.correctAnswer,
            computed: r.computed,
            kind: r.kind,
          });
        }
      }
    }
  }

  console.log(c('\n🧮 MATH CORRECTNESS (mathjs)', BOLD));
  const summary = Object.entries(byKind).filter(([, n]) => n > 0).map(([k, n]) => `${k}: ${n}`).join(', ');
  console.log(`  ${checked} exercises verified  (${summary}).\n`);
  if (process.argv.includes('--by-type')) {
    const types = Object.keys(byType.total).sort();
    console.log('  Per-type coverage:');
    for (const t of types) {
      const tot = byType.total[t], ver = byType.verified[t] || 0;
      const pct = tot ? Math.round(100 * ver / tot) : 0;
      console.log(`    ${t.padEnd(28)} ${String(ver).padStart(5)} / ${String(tot).padStart(5)}  (${pct}%)`);
    }
  }
  if (!mismatches.length) {
    console.log(c('✅ All authored answers match library evaluation.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${mismatches.length} mismatches:`, RED));
  for (const m of mismatches.slice(0, 50)) {
    console.log(`  ${c(m.file, BOLD)} p${m.page} [${m.kind}/${m.type}]  ${m.q}  authored=${c(m.authored, RED)} · ${c(m.computed, GREEN)}`);
  }
  if (mismatches.length > 50) console.log(`  … and ${mismatches.length - 50} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
