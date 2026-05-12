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
const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  'ₙ': 'n', 'ₖ': 'k', 'ᵢ': 'i', 'ⱼ': 'j', 'ₘ': 'm' };
// Arithmetic-progression aₙ = a₁ + (n-1)·r
const AP_TERM_RE = /^a1\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*r\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*a(\d+)\s*=\s*\??\s*$/i;
const GP_TERM_RE = /^a1\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*q\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*a(\d+)\s*=\s*\??\s*$/i;
const AP_FIND_N_RE = /^a1\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*r\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*qual\s+n\s+tem\s+an\s*=\s*(-?\d+(?:\.\d+)?)\??\s*$/i;
const AP_N_FROM_VAL_RE = /^a1\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*an\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*r\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*n\s*=\s*\??\s*$/i;
const AP_RATIO_EXPLICIT_RE = /^a1\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*a(\d+)\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*r\s*=\s*\(\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*\)\s*\/\s*(-?\d+)\s*=\s*\??\s*$/i;
const AP_RATIO_TWO_RE = /^se\s+a(\d+)\s*=\s*(-?\d+(?:\.\d+)?)\s+e\s+a(\d+)\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*r\s*=\s*\??\s*$/i;
const SUM_FORMULA_RE = /soma[^=]+=\s*(n²|n2|n\(n\+1\)|n\*\(n\+1\))[^=]*Para\s+n\s*=\s*(\d+)\s*:\s*\??\s*$/i;
const CONVERGE_DIV_RE = /^(?:converge\s+apenas\s+se|diverge\s+se)\s+\|q\|\s*[<≥>]\s*\??\s*$/i;
// Infinite geometric series: 'Σ (X)^n [do n=0 ao ∞] = ?' → 1/(1-X) when |X|<1.
const GEOM_INF_SUM_RE = /^Σ\s*\(?\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)\s*\)?\^n/i;
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
    .replace(/(?<![a-zA-Z])arcsen(?![a-zA-Z])/g, 'asin')
    .replace(/(?<![a-zA-Z])arccos(?![a-zA-Z])/g, 'acos')
    .replace(/(?<![a-zA-Z])arctan(?![a-zA-Z])/g, 'atan')
    .replace(/(?<![a-zA-Z])arctg(?![a-zA-Z])/g, 'atan')
    .replace(/(?<![a-zA-Z])sen(?![a-zA-Z])/g, 'sin')
    .replace(/(?<![a-zA-Z])cosseno(?![a-zA-Z])/g, 'cos')
    .replace(/(?<![a-zA-Z])tg(?![a-zA-Z])/g, 'tan')
    .replace(/(?<![a-zA-Z])cotg(?![a-zA-Z])/g, 'cot')
    .replace(/(?<![a-zA-Z])ln(?=\s*\()/g, 'log')
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
    // Subscript chars: digits + n/k/i/j/m letters used in PA/PG notation.
    .replace(/([₀₁₂₃₄₅₆₇₈₉ₙₖᵢⱼₘ]+)/g, (s) => [...s].map(c => SUB[c] || c).join(''))
    // LaTeX-style braces in exponents: 'e^{2x}' → 'e^(2x)'
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    // 'sin^2(x)' is invalid in mathjs (parses 'sin^2' as pow(sin, 2)).
    // Rewrite trig-function-then-power-then-arg → 'fn(arg)^pow'. Must
    // run AFTER superscript conversion so 'sen²(x)' has already become
    // 'sin^2(x)' by the time this fires. The lookbehind blocks letter
    // prefixes (so 'acos' / 'sec' aren't grabbed), but a leading digit
    // (e.g. '2cos^2(x)') is fine.
    .replace(/(?<![a-zA-Z])(sin|cos|tan|sec|csc|cot)\s*\^\s*(\d+)\s*\(((?:[^()]|\([^)]*\))*)\)/g, '$1($3)^$2')
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
  // mathjs Complex with negligible imaginary part is a real number.
  if (v && typeof v === 'object' && 're' in v && 'im' in v && typeof v.re === 'number') {
    if (Math.abs(v.im) < 1e-9) return Number.isFinite(v.re) ? v.re : null;
  }
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
const VEC3 = `\\(\\s*(${NUM})\\s*,\\s*(${NUM})\\s*,\\s*(${NUM})\\s*\\)`;
const VEC3_DOT_RE = new RegExp(`^${VEC3}\\s*·\\s*${VEC3}\\s*=\\s*\\??\\s*$`);
const PARALLELOGRAM_3D_RE = new RegExp(`^u\\s*=\\s*${VEC3}\\s*,\\s*v\\s*=\\s*${VEC3}\\s*:\\s*[áa]rea\\s+do\\s+paralelogramo\\s*=\\s*\\??\\s*$`, 'i');
const PARALLELOGRAM_2D_RE = new RegExp(`^u\\s*=\\s*${VECTOR}\\s*,\\s*v\\s*=\\s*${VECTOR}\\s*:\\s*[áa]rea\\s+do\\s+paralelogramo\\s*=\\s*\\??\\s*$`, 'i');
const CROSS_Z_RE = new RegExp(`^u\\s*=\\s*${VEC3}\\s*,\\s*v\\s*=\\s*${VEC3}\\s*:\\s*u×v\\s+z[\\s-]+componente\\s*=\\s*\\??\\s*$`, 'i');
const NORM_RE = new RegExp(`^\\|\\|${VECTOR}\\|\\|\\s*=\\s*\\??\\s*$`);
const VEC_ADD_RE = new RegExp(`^${VECTOR}\\s*\\+\\s*${VECTOR}\\s*=\\s*\\??\\s*$`);
const VEC_SUB_RE = new RegExp(`^${VECTOR}\\s*-\\s*${VECTOR}\\s*=\\s*\\??\\s*$`);
const VEC_SCAL_RE = new RegExp(`^\\(?(${NUM})\\)?\\s*\\*?·?\\s*${VECTOR}\\s*=\\s*\\??\\s*$`);
const VEC_DOT_RE = new RegExp(`^${VECTOR}\\s*·\\s*${VECTOR}\\s*=\\s*\\??\\s*$`);
const VEC_ADD_PARTIAL_RE = new RegExp(`^${VECTOR}\\s*([+\\-])\\s*${VECTOR}\\s*=\\s*\\(\\s*(\\?|${NUM})\\s*,\\s*(\\?|${NUM})\\s*\\)\\s*$`);
const VEC_COMP_RE = new RegExp(`^${VECTOR}\\s*([+\\-])\\s*${VECTOR}\\s*[—-]+\\s*componente\\s+([xy])\\s*=\\s*\\??\\s*$`, 'i');
const VEC_BETWEEN_RE = new RegExp(`^vetor\\s+de\\s+${VECTOR}\\s+a\\s+${VECTOR}\\s*=\\s*(?:\\??|\\(\\s*(\\?|${NUM})\\s*,\\s*(\\?|${NUM})\\s*\\))\\s*$`, 'i');
const TRI_30_60_90_RE = /^em\s+30-?60-?90\s+com\s+x\s*=\s*(\d+(?:\.\d+)?)\s*,\s*(hipotenusa|lado\s+de\s+60.*?)\s*=\s*\??\s*$/i;
const CUBE_SOLVE_RE = /^se\s+v\s*=\s*(\d+(?:\.\d+)?)\s*,\s*lado\s*=\s*\??\s*$/i;
const CIRCUM_R_RE = /^comprimento\s+da\s+circunfer[êe]ncia\s+r\s*=\s*(\d+(?:\.\d+)?)\s*=\s*\?π\s*$/i;
const CIRCUM_D_RE = /^comprimento\s+da\s+circunfer[êe]ncia\s+d\s*=\s*(\d+(?:\.\d+)?)\s*\([^)]*\)\s*=\s*\?π\s*$/i;
const CIRCLE_RADIUS_AREA_RE = /^se\s+A\s*=\s*(\d+(?:\.\d+)?)π\s*,\s*raio\s*=\s*\??\s*$/i;
const CIRCLE_RADIUS_C_RE = /^se\s+C\s*=\s*(\d+(?:\.\d+)?)π\s*,\s*raio\s*=\s*\??\s*$/i;
const CIRCLE_EQ_RADIUS_RE = /^x\^?2\s*\+\s*y\^?2\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*raio\s*=\s*\??\s*$/i;
const POLY_PERIM_RE = /^(?:tri[âa]ngulo|quadrado|pent[áa]gono|hex[áa]gono|hept[áa]gono|oct[óo]gono|pol[íi]gono\s+regular\s+de\s+(\d+)\s+lados)\s*(?:regular\s+)?(?:[—,\-]+\s*)?lado\s*=\s*(\d+(?:\.\d+)?)\s*:?\s*per[íi]metro\s*=\s*\??\s*$/i;
const HEXAGON_AREA_RE = /^hex[áa]gono\s+regular\s+lado\s*=\s*(\d+(?:\.\d+)?)\s*:\s*[áa]rea\s*=\s*\?√3\s*$/i;
const EQUI_TRI_AREA_RE = /^tri[âa]ngulo\s+equil[áa]tero\s+lado\s*=\s*(\d+(?:\.\d+)?)(?::|\s+[áa]rea\s*=\s*\?√3)/i;
const EQUI_TRI_FULL_RE = /^[áa]rea\s+do\s+tri[âa]ngulo\s+equil[áa]tero\s+lado\s*=\s*(\d+(?:\.\d+)?)(?:\s*[—:][^=]*?)?\s*=\s*\??\s*$/i;
const POLY_INT_ANGLE_RE = /^[âa]ngulo\s+interno\s+do\s+(tri[âa]ngulo\s+equil[áa]tero|quadrado|pent[áa]gono\s+regular|hex[áa]gono\s+regular|hept[áa]gono\s+regular|oct[óo]gono\s+regular)\s*=\s*\?°?\s*$/i;
const POLY_SUM_ANGLE_RE = /^soma\s+[âa]ngulos\s+internos\s+do\s+[a-záâãéêíóôõúç]+(?:\s+regular)?\s*\(n\s*=\s*(\d+)\)\s*=\s*\?°?\s*$/i;
const SQ_AREA_RE = /^quadrado\s+lado\s*=\s*(\d+(?:\.\d+)?)\s*:\s*[áa]rea\s*=\s*\??\s*$/i;
const SQ_DIAG_RE = /^quadrado\s+lado\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*diagonal\s*=\s*\?√2\s*$/i;
const TRAP_GENERIC_RE = /^trap[ée]zio\s+com\s+B\s*=\s*(\d+)\s*,\s*b\s*=\s*(\d+)\s*,\s*h\s*=\s*(\d+)\s*:\s*A\s*=\s*\??\s*$/i;
const AREA_BASE_ALTURA_RE = /^se\s+[áa]rea\s*=\s*(\d+)\s+e\s+base\s*=\s*(\d+)\s*,\s*altura\s*=\s*\??\s*$/i;
const CIRCLE_PI_APPROX_RE = /^[áa]rea\s+do\s+c[íi]rculo\s+r\s*=\s*(\d+(?:\.\d+)?):\s*(\d+)π\s*≈\s*\?\s*$/i;
// Three-term arithmetic sequence with one blank: "__,15,16" / "7,__,9" / "11,12,__"
const SEQ3_RE = /^\s*(__|-?\d+)\s*,\s*(__|-?\d+)\s*,\s*(__|-?\d+)\s*$/;
// Require a literal '{' or a leading digit so 'Amplitude de y=cos(x) + 5'
// (a trig waveform question) doesn't get mistaken for a stats aggregate.
const STAT_RE = /^(m[ée]dia|mediana|moda|amplitude)\s+(?:de\s+)?(\{[^}]+\}|-?\d[^=]*?)\s*=\s*\??\s*$/i;
// '{nums} — média/mediana/amplitude = ?' (dash form)
const STAT_DASH_RE = /^(\{[^}]+\})\s*[—-]+\s*(m[ée]dia|mediana|moda|amplitude)\s*=\s*\??\s*$/i;
const PERMUTATIONS_RE = /^fila\s+de\s+(\d+)\s+pessoas:\s*permuta[çc][õo]es\??\s*$/i;
const CHOOSE_FROM_RE = /^escolher\s+(\d+)\s+de\s+(\d+)\s+\w+\s+sem\s+ordem\??\s*$/i;
const COMMITTEE_RE = /^(?:comiss[ãa]o|grupos?|dupla|par|escolher|m[ãa]o)\s+(?:de\s+)?(\d+)\s+(?:de\s+|parceiros\s+de\s+|ingredientes\s+de\s+|alunos\s+de\s+um\s+grupo\s+de\s+|meias\s+de\s+gaveta\s+com\s+)(\d+)/i;
const C_SYMMETRY_RE = /^C\(\d+,\d+\)\s*=\s*C\((\d+),(\d+)\)\s*=\s*\??\s*$/;
const BINOMIAL_COEF_RE = /^coeficiente\s+de\s+([a-z](?:\^?\d+)?(?:\s*\*?\s*[a-z](?:\^?\d+)?)?)\s+em\s+\(\s*[a-z\d]+\s*\+\s*[a-z\d]+\s*\)\^(\d+)\s*=\s*\??\s*$/i;
const COIN_K_HEADS_RE = /^moeda\s+lan[çc]ada\s+(\d+)\s+vezes?\s*[—-]+\s*P\((\d+)\s+(?:caras?|coroas?)\)\s*=\s*\??\s*$/i;
const CIRCULAR_RE = /^(\d+)\s+pessoas\s+ao\s+redor\s+de\s+uma\s+mesa\s+circular\s*=\s*\??\s*$/i;
const NECKLACE_RE = /^(\d+)\s+contas\s+em\s+um\s+colar\s*\(sem\s+virar\)\s*=\s*\??\s*$/i;
const SHELF_RE = /^(\d+)\s+livros?\s+distintos?\s+em\s+(?:uma\s+)?prateleira\s*=\s*\??\s*$/i;
const QUEUE_RE = /^filas\s+de\s+(\d+)\s+pessoas\s+distintas\s*=\s*\??\s*$/i;
const ANAGRAM_RE = /^anagramas\s+de\s+([A-Z]+)(?:\s*\([^)]*\))?\s*=\s*\??\s*$/i;
// Law of cosines: 'a=A, b=B, C=θ° — c² = ?' → A² + B² - 2AB·cos(θ)
const LAW_COS_C2_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*C\s*=\s*(\d+(?:\.\d+)?)°\s*[—-]+\s*c²\s*=\s*\??\s*$/i;
// Law of sines: 'a=A, A=α°, B=β°, b = ?' → A·sin(β)/sin(α)
const LAW_SIN_B_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*A\s*=\s*(\d+(?:\.\d+)?)°\s*,\s*B\s*=\s*(\d+(?:\.\d+)?)°\s*,?\s*b\s*=\s*\??\s*$/i;
// Amplitude of a sinusoid: 'Amplitude de y=A·sen(x) = ?' or '|A| sen(x)' → |A|.
const AMPLITUDE_RE = /^amplitude\s+de\s+(?:y\s*=\s*)?(-?\d+(?:\.\d+)?(?:\/\d+)?)\s*[·*]\s*(?:sen|sin|cos)\(/i;
const TRIG_DOMAIN_RE = /^dom[íi]nio\s+de\s+(?:sen|sin|cos)\(x\)\s*=\s*\??\s*$/i;
const TRIG_RANGE_RE = /^imagem\s+de\s+(?:sen|sin|cos)\(x\)\s*=\s*\??\s*$/i;
const TRIG_PERIOD_RE = /^per[íi]odo\s+de\s+(?:sen|sin|cos)\(x\)(?:\s+em\s+graus)?\s*=\s*\??\s*$/i;
// Triangle area: 'a=A, b=B, C=θ° — área = ?' → AB·sin(θ)/2, or AB/2 when θ=90°
const TRIG_TRI_AREA_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*C\s*=\s*(\d+(?:\.\d+)?)°\s*[—-]+\s*[áa]rea\s*=\s*(?:\?√3)?\s*\??\s*$/i;
const TRANSLATE_RE = /^ponto\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+transladado\s+por\s+T\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*([xy])'\s*=\s*\??\s*$/i;
const REFLECT_AXIS_RE = /^reflex[ãa]o\s+de\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+(?:no\s+eixo\s+([xy])|na\s+origem)\s*:\s*([xy])'\s*=\s*\??\s*$/i;
const HOMOTHETY_RE = /^homotetia\s+k\s*=\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)\s+de\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*([xy])'\s*=\s*\??\s*$/i;
const DISTANCE_RE = /^dist[âa]ncia\s+entre\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+e\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*=\s*\??\s*$/i;
const MIDPOINT_RE = /^ponto\s+m[ée]dio\s+entre\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+e\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*([xy])_M\s*=\s*\??\s*$/i;
const PARALLEL_M_RE = /^reta\s+paralela\s+a\s+y\s*=\s*(-?\d+(?:\.\d+)?)\s*\*?\s*x[^:]*:\s*m\s*=\s*\??\s*$/i;
const PERP_M_RE = /^reta\s+perpendicular\s+a\s+y\s*=\s*(-?\d+(?:\.\d+)?)\s*\*?\s*x[^:]*:\s*m\s*=\s*\??\s*$/i;
const HORIZ_M_RE = /^reta\s+horizontal\s*:\s*m\s*=\s*\??\s*$/i;
const VERT_LINE_RE = /^reta\s+vertical\s*:\s*m\s*=\s*\??\s*$/i;
const LINE_B_RE = /^reta\s+(?:por\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+com\s+m\s*=\s*(-?\d+(?:\.\d+)?)|m\s*=\s*(-?\d+(?:\.\d+)?)\s+passando\s+por\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\))\s*:\s*b\s*=\s*\??\s*$/i;
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
// 'Se sin(x) = V, cos(2x) = ?' and similar double-angle inference.
const DOUBLE_ANGLE_SINGLE_RE = /^se\s+(sin|cos|tan)\(x\)\s*=\s*([^,]+?)\s*,\s*(sin|cos|tan)\(2\s*\*?\s*x\)\s*=\s*\??\s*$/i;
// Half-angle: 'Se cos(x) = V (1º quadrante), cos(x/2)/sin(x/2) = ?'
const HALF_ANGLE_RE = /^se\s+cos\(x\)\s*=\s*([^,(]+?)\s*\([^)]*\)\s*,\s*(sin|cos)\(x\s*\/\s*2\)\s*=\s*\??\s*$/i;
// 'tan(A±B) numerador/denominador = ?' — sum-of-angles formula numerator/denominator.
const TAN_SUM_PART_RE = /^tan\(((?:[^()]|\([^)]*\))+?)\s*([+\-])\s*((?:[^()]|\([^)]*\))+?)\)\s+(numerador|denominador)\s*=\s*\??\s*$/i;
const DOUBLE_ANGLE_PAIR_RE = /^se\s+(sin|cos|tan)\(x\)\s*=\s*([^\s,]+)(?:\s+e\s+|\s*,\s*)(sin|cos|tan)\(x\)\s*=\s*([^\s,]+)\s*,\s*(sin|cos|tan)\(2\s*\*?\s*x\)\s*=\s*\??\s*$/i;
const ARRANGE_RE = /^A\((\d+)\s*,\s*(\d+)\)(?:\s*=\s*[\d·*+-]+)?\s*=\s*\??\s*$/i;
const DET_2X2_RE = /^det\(\[\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*;\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]\)\s*=\s*\??\s*$/i;
const MAT2 = /\[\s*(-?\d+)\s+(-?\d+)\s*;\s*(-?\d+)\s+(-?\d+)\s*\]/;
const MAT_NAMED_OP_RE = new RegExp(`^A\\s*=\\s*${MAT2.source}(?:\\s*,\\s*B\\s*=\\s*\\[\\s*(-?\\d+)\\s+(-?\\d+)\\s*;\\s*(-?\\d+)\\s+(-?\\d+)\\s*\\])?\\s*:?\\s*(det|tr|tra[çc]o|Aᵀ\\[(\\d),(\\d)\\]|AB\\[(\\d),(\\d)\\])\\s*(?:\\(A\\))?\\s*=\\s*\\??\\s*$`, 'i');
const MATRIX_DIM_RE = /^matriz\s+(\d+)[×x](\d+)\s+tem:\s*\((\d+)\s+elementos?\/(\d+)\s+elementos?\)\s*$/i;
// Eigenvalues of 2x2 matrix (always for triangular or diagonal).
const EIG_RE = new RegExp(`^A\\s*=\\s*${MAT2.source}\\s*:?[^:]*autovalores?[^:=]*?(maior|menor|λ[₁₂12]|primeiro|segundo)?\\s*=\\s*\\??\\s*$`, 'i');
const DIAG_SUM_RE = /^matriz\s+diagonal\s+\[\s*(-?\d+(?:\.\d+)?)\s+0\s*;\s*0\s+(-?\d+(?:\.\d+)?)\s*\]\s*:\s*(soma|produto)\s+dos\s+autovalores\s*=\s*\??\s*$/i;
const SCALAR_I_RE = /^A\s*=\s*(-?\d+(?:\.\d+)?)\s*[·*]\s*I\s*:\s*autovalor\s+de\s+qualquer\s+v\s*=\s*\??\s*$/i;
// 'A=[…], v=(a,b): A·v = (?, c)' or '(c, ?)' — matrix-vector partial.
const MATVEC_RE = new RegExp(`^A\\s*=\\s*${MAT2.source}\\s*,\\s*v\\s*=\\s*${VECTOR}\\s*:\\s*A·v\\s*=\\s*\\(\\s*(\\?|${NUM})\\s*,\\s*(\\?|${NUM})\\s*\\)\\s*$`);
const DIM_R_RE = /^dimens[ãa]o\s+de\s+R\^?(\d+|²|³)\s*=\s*\??\s*$/i;
const BASE_R_RE = /^base\s+de\s+R\^?(\d+|²|³)\s+tem\s+\?\s+vetores?\s*$/i;
// '(a,b) e (c,d): são L.I.?/L.D.?' — independent iff ad - bc ≠ 0.
const LIN_INDEP_RE = new RegExp(`^${VECTOR}\\s+e\\s+${VECTOR}\\s*:\\s*s[ãa]o\\s+L\\.?(I|D)`, 'i');
const MAT_ADD_ELEM_RE = /^\[\s*(-?\d+)\s+(-?\d+)\s*;\s*(-?\d+)\s+(-?\d+)\s*\]\s*\+\s*\[\s*(-?\d+)\s+(-?\d+)\s*;\s*(-?\d+)\s+(-?\d+)\s*\]\s*[—-]+\s*elemento\s*\((\d),\s*(\d)\)\s*=\s*\??\s*$/i;
const MAT_SCALE_ELEM_RE = /^(-?\d+(?:\.\d+)?)\s*[·*]\s*\[\s*(-?\d+)\s+(-?\d+)\s*;\s*(-?\d+)\s+(-?\d+)\s*\]\s*[—-]+\s*elemento\s*\((\d),\s*(\d)\)\s*=\s*\??\s*$/i;
const PERMUTE_RE = /^P\((\d+)\)\s*=\s*\??\s*$/i;
const COMBINE_RE = /^C\((\d+)\s*,\s*(\d+)\)\s*=\s*\??\s*$/i;
const PRODUCT_PAIRS_RE = /^(\d+)\s+\w+\s+e\s+(\d+)\s+\w+\s*[—-]+\s*quan(?:tos|tas)\s+\w+\??\s*$/i;
const COMPLEMENT_PROB_RE = /^se\s+P\([^)]+\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(n[ãa]o[^)]*\)\s*=\s*\??\s*$/i;
const UNION_INC_EXC_RE = /^se\s+P\(A\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(B\)\s*=\s*(\d+(?:\.\d+)?)\s*e\s+P\(A∩B\)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*P\(A∪B\)\s*=\s*\??\s*$/i;
// 'P(A∩B)=X, P(B)=Y → P(A|B) = ?' → X / Y (conditional probability).
const COND_PROB_RE = /^P\(A∩B\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(B\)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*P\(A\|B\)\s*=\s*\??\s*$/i;
const COND_PROB_3_RE = /^P\(A\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(B\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(A∩B\)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*P\(A\|B\)\s*=\s*\??\s*$/i;
const INDEP_PROB_RE = /^P\(A\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(B\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*independentes?\s*→\s*P\(A∩B\)\s*=\s*\??\s*$/i;
// 'X=a com P=p, X=b com P=q → E[X] = ?' → a·p + b·q
const EXPECTED_2_RE = /^X\s*=\s*(-?\d+(?:\.\d+)?)\s+com\s+P\s*=\s*(\d+(?:\.\d+)?)\s*,\s*X\s*=\s*(-?\d+(?:\.\d+)?)\s+com\s+P\s*=\s*(\d+(?:\.\d+)?)\s*→\s*E\[X\]\s*=\s*\??\s*$/i;
const EXPECTED_1_RE = /^X\s*=\s*(-?\d+(?:\.\d+)?)\s+com\s+P\s*=\s*1\s*→\s*E\[X\]\s*=\s*\??\s*$/i;
const DIE_EX_RE = /^dado\s+justo\s+\{1\.\.6\}\s*[—-]+\s*E\[X\]\s*=\s*\??\s*$/i;
// 'r² = X → r = ? (positive)' or 'r = ? (negative)' — square-root with sign.
const R_SQ_RE = /^r²\s*=\s*(\d+(?:\.\d+)?)\s*→\s*r\s*=\s*\?\s*\(valor\s+(positivo|negativo)\)\s*$/i;
// Dash-form geometry shapes. Accept '—' separator alongside ':'.
const CONE_VOL_DASH_RE = /^cone\s+r\s*=\s*(\d+(?:\.\d+)?)\s*,\s*h\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*v\s*=\s*\?π\s*$/i;
const CYLINDER_VOL_DASH_RE = /^cilindro\s+r\s*=\s*(\d+(?:\.\d+)?)\s*,\s*h\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*v\s*=\s*\?π\s*$/i;
const SPHERE_VOL_DASH_RE = /^esfera\s+r\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*v\s*=\s*\?π\s*$/i;
const RECT_AREA_RE = /^ret[âa]ngulo\s+(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)\s*[—-]+\s*[áa]rea\s*=\s*\??\s*$/i;
const SQUARE_PERIM_DASH_RE = /^quadrado\s+lado\s*=?\s*(\d+(?:\.\d+)?)\s*[—-]+\s*per[íi]metro\s*=\s*\??\s*$/i;
const TRI_AREA_DASH_RE = /^tri[âa]ngulo\s+b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*h\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*[áa]rea\s*=\s*\??\s*$/i;
const TRAPEZIUM_DASH_RE = /^trap[ée]zio\s+B\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*h\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*[áa]rea\s*=\s*\??\s*$/i;
const TRAPEZIUM_SAMEB_RE = /^trap[ée]zio\s+com\s+B\s*=\s*b\s*=\s*(\d+(?:\.\d+)?)\s+e\s+h\s*=\s*(\d+(?:\.\d+)?)\s*\([^)]*\)\s*:\s*A\s*=\s*\??\s*$/i;
const PYRAMID_VOL_RE = /^pir[âa]mide\s+base\s+(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)\s*,\s*h\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*v\s*=\s*\??\s*$/i;
const SECTOR_AREA_RE = /^[áa]rea\s+do\s+setor\s+(\d+(?:\.\d+)?)°\s+com\s+r\s*=\s*(\d+(?:\.\d+)?)\s*=\s*\?π\s*$/i;
const SECTOR_AREA_DASH_RE = /^setor\s+com\s+[âa]ngulo\s+central\s+(\d+(?:\.\d+)?)°\s+e\s+r\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*[áa]rea\s*=\s*\?π\s*$/i;
const ARC_LEN_RE = /^arco\s+de\s+(\d+(?:\.\d+)?)°\s+com\s+r\s*=\s*(\d+(?:\.\d+)?)\s*=\s*\?π\s*$/i;
const CENTRAL_INSCRIBED_RE = /^[âa]ngulo\s+central\s+de\s+(\d+(?:\.\d+)?)°\s*[—-]+\s*[âa]ngulo\s+inscrito\s+correspondente\s*=\s*\?°?\s*$/i;
const INSCRIBED_ARC_RE = /^[âa]ngulo\s+inscrito\s+de\s+(\d+(?:\.\d+)?)°\s*[—-]+\s*arco\s+correspondente\s*=\s*\?°?\s*$/i;
const SLOPE_2POINTS_RE = /^coef\.?\s+angular\s+entre\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+e\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*=\s*\??\s*$/i;
const QUADR_APOTHEM_RE = /^quadrado\s+com\s+ap[óo]tema\s*=\s*(\d+(?:\.\d+)?)\s*\([^)]*\)\s*:\s*[áa]rea\s*=\s*\??\s*$/i;
// 'Valores X (f=a) e Y (f=b) — média = ?' → (a·X + b·Y) / (a + b)
const WEIGHTED_MEAN_2_RE = /^valores\s+(-?\d+(?:\.\d+)?)\s+\(f\s*=\s*(\d+)\)\s+e\s+(-?\d+(?:\.\d+)?)\s+\(f\s*=\s*(\d+)\)\s*[—-]+\s*m[ée]dia\s*=\s*\??\s*$/i;
// 'Valores N (f=K) — média = ?' → N (single-value short-circuit)
const WEIGHTED_MEAN_1_RE = /^valores\s+(-?\d+(?:\.\d+)?)\s+\(f\s*=\s*\d+\)\s*[—-]+\s*m[ée]dia\s*=\s*\??\s*$/i;
// 'Em conjunto com n=N, se f=F, fᵣ = ?' → F/N
const REL_FREQ_SET_RE = /^em\s+conjunto\s+com\s+n\s*=\s*(\d+)\s*,\s*se\s+f\s*=\s*(\d+)\s*,\s*f[ᵣr]\s*=\s*\??\s*$/i;
// 'Quantos anagramas de WORD?' → factorial / repeats
const ANAGRAM_HOW_MANY_RE = /^quantos\s+anagramas\s+de\s+([A-Z]+)\s*\??\s*$/i;
// 'Anagramas de WORD = ?' (alt to existing ANAGRAM_RE)
const ANAGRAM_PLAIN_RE = /^anagramas\s+de\s+([A-Z]+)\s*=\s*\??\s*$/i;
// 'X UNIT-A e Y UNIT-B — quantos/quantas Z?' → X*Y (accept accented words)
const PRODUCT_PAIRS_UNI_RE = /^(\d+)\s+[a-záâãéêíóôõúçA-Z]+\s+e\s+(\d+)\s+[a-záâãéêíóôõúçA-Z]+\s*[—-]+\s*quan(?:tos|tas)\s+[a-záâãéêíóôõúçA-Z]+\??\s*$/i;
// μ=M, σ=S — x=X tem z = ?  (variant of existing z_para_x phrasing)
const Z_SCORE_TEM_RE = /^μ\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*σ\s*=\s*(-?\d+(?:\.\d+)?)\s*[—-]+\s*x\s*=\s*(-?\d+(?:\.\d+)?)\s+tem\s+z\s*=\s*\??\s*$/i;
// Sturges' rule: 1+3.3·log(n). 'Para n=N, k ≈ ?' → round(1 + 3.3*log10(N))
const STURGES_RE = /(?:sturges|regra\s+de\s+sturges)[\s\S]*?n\s*=\s*(\d+)\s*,\s*k\s*≈\s*\??\s*$/i;
// 'P(A∪B) = P(A)+P(B)-P(A∩B)' style with 3 numbers — covered by UNION_INC_EXC_RE.
// Circle area '?π' coefficient — accept '=' or em-dash separators.
const CIRCLE_AREA_PI_RE = /^[áa]rea\s+do\s+c[íi]rculo\s+r\s*=\s*(\d+(?:\.\d+)?)\s*=\s*\?π\s*$/i;
const CIRCLE_AREA_DASH_PI_RE = /^c[íi]rculo\s+r\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*[áa]rea\s*=\s*\?π\s*$/i;
const CIRCLE_DIAM_AREA_RE = /^c[íi]rculo\s+d\s*=\s*(\d+(?:\.\d+)?)\s*:\s*[áa]rea\s*=\s*\?π\s*$/i;
// 'Cubo lado N — V = ?'
const CUBE_VOL_DASH_RE = /^cubo\s+lado\s*=?\s*(\d+(?:\.\d+)?)\s*[—-]+\s*v\s*=\s*\??\s*$/i;
// 'Centro (h,k) e r=R: (x-h)² + (y-k)² = ?' → R²
const CIRCLE_EQ_CENTER_R_RE = /^centro\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+e\s+r\s*=\s*(\d+(?:\.\d+)?)\s*:.*?=\s*\??\s*$/i;
// 'Circunferência (com centro)? (0,0)? r=R: x²+y² = ?' → R²
const CIRCLE_EQ_R_RE = /^circunfer[êe]ncia\s+(?:com\s+)?centro\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*(?:e\s+)?r\s*=\s*(\d+(?:\.\d+)?)\s*:.*?=\s*\??\s*$/i;
// '(x-h)²+(y-k)²=N — raio = ?' → sqrt(N)
const CIRCLE_EQ_RAD_DASH_RE = /^\(x[+\-]\d+\)[²2]\s*\+\s*\(y[+\-]\d+\)[²2]\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*raio\s*=\s*\??\s*$/i;
// '(x-h)²+(y-k)²=N — centro = (h, ?)' → k (extract h, k from regex)
const CIRCLE_EQ_CENTER_PARTIAL_RE = /^\(x([+\-])(\d+(?:\.\d+)?)\)[²2]\s*\+\s*\(y([+\-])(\d+(?:\.\d+)?)\)[²2]\s*=\s*\d+(?:\.\d+)?\s*[—-]+\s*centro\s*=\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*\?\s*\)\s*$/i;
// 'Quadrilátero inscrito — soma ângulos internos' → 360 constant covered by POLY_SUM_ANGLE? Not quite — answer is 360 directly without (n=) hint.
// 'Volume do cone = ? do cilindro de mesmas dimensões' → 1/3 (constant)
// Pascal's triangle row sum: 'Linha N do triângulo de Pascal (soma) = ?' → 2^N.
// Line 0 alone has just 1 element → 1.
const PASCAL_LINE_RE = /^linha\s+(\d+)\s+do\s+tri[âa]ngulo\s+de\s+pascal(?:\s*\(soma\))?\s*=\s*\??\s*$/i;
// Urn first draw: 'Urna ... <a> <colorA> e <b> <colorB>. P(1ª <colorA>) = ?' → a/(a+b)
const URN_FIRST_RE = /^urna(?:\s+com)?\s+(\d+)\s+([a-záâãéêíóôõúç]+)\s+e\s+(\d+)\s+([a-záâãéêíóôõúç]+)\.\s*P\(1[ªa]\s+([a-záâãéêíóôõúç]+)\)\s*=\s*\??\s*$/i;
// Urn compact: 'Urna NV MA. P(1ª <color>) = ?' where V/A/B/P are color initials
const URN_FIRST_COMPACT_RE = /^urna\s+(\d+)([VABP])\s+(\d+)([VABP])\.\s*P\(1[ªa]\s+([a-záâãéêíóôõúç]+)\)\s*=\s*\??\s*$/i;
// Urn 2nd given 1st: 'Urna NV MA. Dada 1ª <color>, P(2ª <color>) = ?' → (N-1)/(N+M-1)
const URN_2ND_COND_RE = /^urna\s+(\d+)([VABP])\s+(\d+)([VABP])\.\s*Dada\s+1[ªa]\s+([a-záâãéêíóôõúç]+)\s*,\s*P\(2[ªa]\s+([a-záâãéêíóôõúç]+)\)\s*=\s*\??\s*$/i;
// Urn both without replacement same color: 'Urna NV MA. P(ambas <color> sem reposição) = ?'
const URN_BOTH_NOREP_RE = /^urna\s+(\d+)([VABP])\s+(\d+)([VABP])\.\s*P\(ambas\s+([a-záâãéêíóôõúç]+)\s+sem\s+reposi[çc][ãa]o\)\s*=\s*\??\s*$/i;
// 'P(A|B)=X, P(B)=Y → P(A∩B) = ?' → X·Y
const COND_INTER_RE = /^P\(A\|B\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(B\)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*P\(A∩B\)\s*=\s*\??\s*$/i;
// Bayes inverse: 'P(A|B)=X, P(B)=Y, P(A)=Z → P(B|A) = ?' → X·Y/Z
const BAYES_INV_RE = /^P\(A\|B\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(B\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(A\)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*P\(B\|A\)\s*=\s*\??\s*$/i;
// 'P(A)=X → P(Ā) = ?' (arrow form, complement)
const COMPL_ARROW_RE = /^P\(A\)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*P\(Ā\)\s*=\s*\??\s*$/i;
// Accumulated frequencies: '... [a,b,c,d], acumulada até K = ?' → sum of first K freqs
const ACCUM_FREQ_RE = /\[\s*(\d+(?:\s*,\s*\d+)*)\s*\][^=]*acumulada\s+at[ée]\s+(\d+)\s*=\s*\??\s*$/i;
// Interval midpoint: 'Ponto médio de [a,b) = ?' → (a+b)/2
const INTERVAL_MID_RE = /^ponto\s+m[ée]dio\s+de\s+[\[\(]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*[\]\)]\s*=\s*\??\s*$/i;
// 'Se todas as N categorias têm mesma frequência, fᵣ de cada = ?' → 1/N
const UNIFORM_REL_FREQ_RE = /^se\s+todas\s+as\s+categorias\s+t[êe]m\s+mesma\s+frequ[êe]ncia\s+e\s+s[ãa]o\s+(\d+)\s*,\s*f[ᵣr]?\s+de\s+cada\s*=\s*\??\s*$/i;
// Permutation A(n,k) inline: '... — arranjo A(N,K) = ?' or '... — A(N,K) = ?'
const ARRANGE_INLINE_RE = /A\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*=\s*\??\s*$/i;
// Combine C(N,K) inline: '... — C(N,K) = ?'
const COMBINE_INLINE_RE = /C\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*=\s*\??\s*$/i;
// 'P(A∩B) = 0 → mutuamente exclusivos' constant (V/F + label)
// '<list> (V/F)?' — answers V/F are not computable; skip.
// Trig equation solving in degrees: 'Primeira/Segunda/Menor solução de FN(x) = V em [0°, 360°)?'.
const TRIG_SOL_FIRST_RE = /^primeira\s+solu[çc][ãa]o(?:\s+positiva)?\s+de\s+(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^?]+?)(?:\s+em\s+\[0°?\s*,\s*360°?\))?\s*\??\s*$/i;
const TRIG_SOL_SECOND_RE = /^segunda\s+solu[çc][ãa]o:?\s*(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^?]+?)(?:\s+em\s+\[0°?\s*,\s*360°?\))?\s*\??\s*$/i;
const TRIG_SOL_NUM_RE = /^n[úu]mero\s+de\s+solu[çc][õo]es\s+de\s+(?:(\d+)\s*\*?\s*)?(sen|sin|cos|tan|tg)(?:\^?2|²)?\(x\)\s*=\s*([^?]+?)\s+em\s+\[0°?\s*,\s*360°?\)\s*\??\s*$/i;
const TRIG_SOL_MENOR_RE = /^menor(?:\s+solu[çc][ãa]o)?(?:\s+positiva)?\s+(?:de\s+)?(?:(\d+)\s*\*?\s*)?(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^?]+?)\??\s*$/i;
const TRIG_SOL_PLAIN_RE = /^solu[çc][ãa]o\s+de\s+(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^?]+?)\s+em\s+\[0°?\s*,\s*360°?\)\s*\??\s*$/i;
// 'kFN(x) = E → FN(x) = ?' → E/k
const TRIG_DIVIDE_RE = /^(\d+)\s*(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^→]+?)\s*→\s*\2\(x\)\s*=\s*\??\s*$/i;
// Trig solutions filtered to a sub-range [0°, U°].
const TRIG_NUM_IN_RANGE_RE = /^em\s+\[0°?\s*,\s*(\d+)°?\],?\s*n[úu]mero\s+de\s+solu[çc][õo]es\s+de\s+(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^?]+?)\??\s*$/i;
const TRIG_RANGE_FIRST_RE = /^em\s+\[0°?\s*,\s*(\d+)°?\],?\s*solu[çc][õo]es\s+de\s+(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^:?]+?)\s*:\s*\??\s*$/i;
// 'Em [0°, U°], soluções de FN(x) = V: (X° e ?)' → 2nd solution in range
const TRIG_RANGE_SECOND_RE = /^em\s+\[0°?\s*,\s*(\d+)°?\],?\s*solu[çc][õo]es\s+de\s+(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^:?]+?)\s*:\s*\(\s*\d+°?\s+e\s+\?\s*\)\s*$/i;
// 'Quantas soluções tem FN(x) = V em [0°, 360°)?'
const TRIG_QUANTAS_RE = /^quantas\s+solu[çc][õo]es\s+tem\s+(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^?]+?)\s+em\s+\[0°?\s*,\s*360°?\)\s*\??\s*$/i;
// 'Soluções menores de FN(x) = V em [0°, 360°): (primeira)'
const TRIG_MENORES_RE = /^solu[çc][õo]es\s+menores\s+de\s+(sen|sin|cos|tan|tg)\(x\)\s*=\s*([^?:]+?)\s+em\s+\[0°?\s*,\s*360°?\)\s*:\s*\(\s*primeira\s*\)\s*$/i;
// Binomial / Pascal identities & counting.
const C_CONST_RE = /^C\(\s*n\s*,\s*([01n])\s*\)\s*=\s*\??\s*$/i;
const C_SYMMETRY_PARTIAL_RE = /^C\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*=\s*C\(\s*(\d+)\s*,\s*\?\s*\)\s*$/i;
const SUBSET_COUNT_RE = /^subconjuntos\s+de\s+(\d+)\s+elementos\s*=\s*\??\s*$/i;
const POLY_SUM_COEFFS_RE = /^soma\s+dos\s+coeficientes\s+de\s+\(\s*1\s*\+\s*x\s*\)\s*\^?\s*(\d+)\s*=\s*\??\s*$/i;
// 'k-ésima/N-ésima entrada da linha L (k=K)' or '(L,K) entry' — C(L,K)
const PASCAL_ENTRY_RE = /entrada\s+da\s+linha\s+(\d+)\s+\(k\s*=\s*(\d+)\)\s*=\s*\??\s*$/i;
// 'Linha N: 1 X Y ... ?' — last entry always 1
const PASCAL_LINE_LAST_RE = /^linha\s+\d+(?:\s+do\s+tri[âa]ngulo)?:?\s*\(?1\s+\d+(?:\s+\d+)*\s*\??\s*\)?\s*$/i;
// cis(α°)·cis(β°) = cis(?°) and cis(α°)/cis(β°) = cis(?°)
const CIS_MULT_RE = /^cis\(\s*(-?\d+(?:\.\d+)?)°?\s*\)\s*[·*]\s*cis\(\s*(-?\d+(?:\.\d+)?)°?\s*\)\s*=\s*cis\(\s*\?°?\s*\)\s*$/i;
const CIS_DIV_RE = /^cis\(\s*(-?\d+(?:\.\d+)?)°?\s*\)\s*\/\s*cis\(\s*(-?\d+(?:\.\d+)?)°?\s*\)\s*=\s*cis\(\s*\?°?\s*\)\s*$/i;
// PG / PA term-list queries: 'PG <terms> — q/S<n>/S∞ = ?'
const PG_TERMS_RE = /^PG\s*\{?\s*([^—}]+?)\s*\}?\s*[—-]+\s*(q|soma|S\s*[₀-₉∞]+|S\s*\d+|S\s*_\s*\d+|S∞)\s*=\s*\??\s*$/i;
const PG_TERMS_SOMA_RE = /^PG\s*\{?\s*([^—}]+?)\s*\}?\s*\([^)]*\)\s*[—-]+\s*soma\s*=\s*\??\s*$/i;
// 'PG com a₁=4 e a₂=12, q = ?' → a₂/a₁
const PG_A1A2_RE = /^PG\s+com\s+a[₁1]\s*=\s*(-?\d+(?:\.\d+)?)\s+e\s+a[₂2]\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*q\s*=\s*\??\s*$/i;
// 'a₁=N, q=Q, S<k> = ...' → numeric S_k for explicit formula
// Skip — content already provides the formula
// 'Soma dos n primeiros ímpares = n². Para n=N: ?' → N²
const ODD_SUM_AT_N_RE = /^soma\s+dos\s+n\s+primeiros\s+[íi]mpares\s*=\s*n(?:\^2|²)\.\s*Para\s+n\s*=\s*(\d+)\s*:\s*\??\s*$/i;
// 'Soma 1+3+5+...+(2n-1) = ?' → answer 'n²'
// 'Soma 2+4+6+...+2n = ?' → answer 'n(n+1)'
// Taylor series radii constants
const TAYLOR_R_RE = /^(e\^x|sen\(x\)|cos\(x\)|ln\(1\+x\)|1\/\(1-x\))\s*:?\s*R\s*=\s*\??\s*$/i;
const TAYLOR_R_VARIANT_RE = /^raio\s+de\s+converg[êe]ncia\s+de\s+(e\^x|sen\(x\)|cos\(x\)|ln\(1\+x\)|1\/\(1-x\))\s*:?\s*\??\s*$/i;
// Reverse-order binomial coefficient: '(a+b)^N: coeficiente de a^i b^j = ?'
const BINOMIAL_REVERSE_RE = /^\(\s*[a-z\d]+\s*\+\s*[a-z\d]+\s*\)\s*\^\s*(\d+)\s*:?\s*coeficiente\s+de\s+([a-z])(?:\^(\d+))?\s*\*?\s*([a-z])(?:\^(\d+))?\s*=\s*\??\s*$/i;
// Complex addition/subtraction extraction: '(a±bi) op (c±di) = ?+?i' or similar — extract real/imag.
// '1i' or just 'i' both ok — imag coefficient defaults to 1.
const COMPLEX_ADD_REAL_RE = /^\(\s*(-?\d+)\s*([+\-])\s*(\d*)i\s*\)\s*\+\s*\(\s*(-?\d+)\s*([+\-])\s*(\d*)i\s*\)\s*=\s*\?\s*\+\s*(-?\d+)i\s*$/i;
const COMPLEX_ADD_IMAG_RE = /^\(\s*(-?\d+)\s*([+\-])\s*(\d*)i\s*\)\s*\+\s*\(\s*(-?\d+)\s*([+\-])\s*(\d*)i\s*\)\s*=\s*(-?\d+)\s*\+\s*\?i\s*$/i;
const COMPLEX_SUB_REAL_RE = /^\(\s*(-?\d+)\s*([+\-])\s*(\d*)i\s*\)\s*-\s*\(\s*(-?\d+)\s*([+\-])\s*(\d*)i\s*\)\s*=\s*\?\s*\+\s*(-?\d+)i\s*$/i;
const COMPLEX_SUB_IMAG_RE = /^\(\s*(-?\d+)\s*([+\-])\s*(\d*)i\s*\)\s*-\s*\(\s*(-?\d+)\s*([+\-])\s*(\d*)i\s*\)\s*=\s*(-?\d+)\s*\+\s*\?i\s*$/i;
// Polar r from Cartesian a+bi
const POLAR_R_RE = /^polar\s+de\s+z\s*=\s*(-?\d+|√\d+)\s*([+\-])\s*(\d+|√\d+)?i\s*:?\s*r\s*=\s*\??\s*$/i;
// Polar θ from Cartesian
const POLAR_THETA_RE = /^polar\s+de\s+z\s*=\s*(-?\d+|√\d+)\s*([+\-])\s*(\d+|√\d+)?i\s*:?\s*(?:r\s*=\s*[√\d]+\s*;\s*)?θ\s*=\s*\?°?\s*$/i;
// 'r=R, θ=α° → real = ?' or '→ z = ?' or ': a = ?' for cartesian conversion
const POLAR_TO_REAL_RE = /^r\s*=\s*(-?\d+(?:\.\d+)?|√\d+)\s*,\s*θ\s*=\s*(-?\d+(?:\.\d+)?)°\s*(?:→|:)\s*(?:real|a)\s*=\s*\??\s*$/i;
const POLAR_TO_Z_RE = /^r\s*=\s*(-?\d+(?:\.\d+)?|√\d+)\s*,\s*θ\s*=\s*0°\s*→\s*z\s*=\s*\??\s*$/i;
// Linear systems quick patterns
const SUM_X_PLUS_Y_RE = /^somando\s+x\s*\+\s*y\s*=\s*(-?\d+(?:\.\d+)?)\s+e\s+x\s*-\s*y\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*2x\s*=\s*\??\s*$/i;
const SIMPLE_DOUBLE_RE = /^De\s+2x\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*ent[ãa]o\s+x\s*=\s*\??\s*$/i;
const SYSTEM_SUBST_RE = /^Se\s+x\s*=\s*2y\s*,\s*x\s*\+\s*y\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*y\s*=\s*\??\s*$/i;
const SYSTEM_SUM_DIFF_RE = /^No\s+sistema\s+x\s*\+\s*y\s*=\s*(-?\d+(?:\.\d+)?)\s+e\s+x\s*-\s*y\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*([xy])\s*=\s*\??\s*$/i;
const SYSTEM_XYZ_SAME_RE = /^Se\s+x\s*\+\s*y\s*\+\s*z\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*x\s*-\s*y\s*=\s*0\s*,\s*y\s*-\s*z\s*=\s*0\s*→\s*x\s*=\s*y\s*=\s*z\s*=\s*\??\s*$/i;
// 'Em (a+b)^n, Tk = C(n,?)·...^p·...^q' → q (k-1 index)
const T_K_BINOM_RE = /^Em\s+\(\s*[a-z]\s*\+\s*[a-z]\s*\)\s*\^\s*(\d+)\s*,\s*T(\d+)\s*=\s*C\(\s*\1\s*,\s*\?\s*\)\s*·?\s*[a-z]\^?(\d+)?\s*·?\s*[a-z]\^?(\d+)?\s*$/i;
// 'Em (x+1)^n, coeficiente de x^k = C(n,?) = ...' → k
const X_COEFF_K_RE = /^Em\s+\(\s*x\s*\+\s*1\s*\)\s*\^\s*(\d+)\s*,\s*coeficiente\s+de\s+x\^?(\d+)\s*=\s*C\(\s*\1\s*,\s*\?\s*\)\s*=/i;
// 'r=√3+i' polar r — single √3 form
const POLAR_R_SQRT_RE = /^polar\s+de\s+z\s*=\s*√3\s*\+\s*i\s*:?\s*r\s*=\s*\??\s*$/i;
// E[X] linearity
const E_LINEAR_RE = /^E\[X\]\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*E\[\s*(?:(-?\d+)\s*\*?\s*)?X\s*(?:([+\-])\s*(\d+(?:\.\d+)?))?\s*\]\s*=\s*\??\s*$/i;
const E_X_PLUS_Y_RE = /^E\[X\]\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*E\[Y\]\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*E\[X\+Y\]\s*=\s*\??\s*$/i;
// Var(X) from E[X] and E[X²] — '²' lowers to '^2' after normalize
const VAR_FROM_EX2_RE = /^E\[X\]\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*E\[X(?:[²2]|\^2)\]\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*Var\(X\)(?:\s*=\s*E\[X(?:[²2]|\^2)\]\s*-\s*\(E\[X\]\)(?:[²2]|\^2))?\s*=\s*\??\s*$/i;
// E[X²] from E[X] and Var
const EX2_FROM_VAR_RE = /^E\[X\]\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*Var\(X\)\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*E\[X(?:[²2]|\^2)\]\s*=\s*\??\s*$/i;
// Bernoulli E[X] = p
const BERNOULLI_E_RE = /^Bernoulli\((\d*(?:\.\d+)?|p)\)\s*(?:→|—)\s*E\[X(?:[²2]|\^2)?\]\s*=\s*\??\s*$/i;
// Σ=1 completion: 'P(X=a)=A, P(X=b)=B, P(X=c)=? para Σ=1'
const PROB_SUM_1_RE = /P\(X\s*=\s*\S+\)\s*=\s*(\d+(?:\.\d+)?|\d+\/\d+)\s*,\s*P\(X\s*=\s*\S+\)\s*=\s*(\d+(?:\.\d+)?|\d+\/\d+)\s*,\s*P\(X\s*=\s*\S+\)\s*=\s*\?\s*(?:para\s+Σ\s*=\s*1)?\s*=?\s*\??\s*$/i;
// 'P(X=a)=A, P(X=b)=B, P(X=c)=C → P(X≥k) = ?' / 'P(X≠k)' / 'F(k)'
const PROB_EXT_RE = /^P\(X\s*=\s*(\d+)\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(X\s*=\s*(\d+)\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(X\s*=\s*(\d+)\)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*(P\(X[≥≠><=]+\s*\d+\)|F\(\d+\))\s*=\s*\??\s*$/i;
const PROB_F_RE = /^X\s+com\s+P\(X\s*=\s*(\d+)\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(X\s*=\s*(\d+)\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(X\s*=\s*(\d+)\)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*F\((\d+)\)\s*=\s*\??\s*$/i;
// Pascal sum / count
const POLY_SUM_GENERIC_RE = /^soma\s+(?:de\s+todos\s+)?(?:os\s+)?coeficientes\s+de\s+\(\s*[a-z]\s*\+\s*[a-z]\s*\)\s*\^?\s*(\d+)\s*=\s*\??\s*$/i;
const POLY_NUM_TERMS_RE = /^n[úu]mero\s+de\s+termos\s+na\s+expans[ãa]o\s+de\s+\(\s*[a-z]\s*\+\s*[a-z]\s*\)\s*\^?\s*(\d+)\s*=\s*\??\s*$/i;
// 'Termo k=K de (x+1)^N — coeficiente = ?' → C(N,K)
const POLY_TERM_K_RE = /^Termo\s+k\s*=\s*(\d+)\s+de\s+\(\s*(?:x\s*\+\s*1|1\s*\+\s*x)\s*\)\s*\^?\s*(\d+)\s*[—-]+\s*coeficiente\s*=\s*\??\s*$/i;
// 'Linha N — segundo coeficiente = ?' → N
const PASCAL_2ND_RE = /^linha\s+(\d+)(?:\s+do\s+tri[âa]ngulo)?(?:\s+de\s+pascal)?\s*[—-]+\s*segundo\s+coeficiente\s*=\s*\??\s*$/i;
// 'Linha N — coeficiente do meio = ?' → C(N, N/2)
const PASCAL_MID_RE = /^linha\s+(\d+)(?:\s+do\s+tri[âa]ngulo)?(?:\s+de\s+pascal)?\s*[—-]+\s*coeficiente\s+do\s+meio\s*=\s*\??\s*$/i;
// Uniform {a..b} E[X]
const UNIFORM_E_RE = /^Uniforme\s+\{(\d+)\.\.(\d+)\}\s*[—-]+\s*E\[X\]\s*=\s*\??\s*$/i;
const UNIFORM_PGT_RE = /^Uniforme\s+\{(\d+)\.\.(\d+)\}\s*[—-]+\s*P\(X\s*([><=≥≤])\s*(\d+)\)\s*=\s*\??\s*$/i;
const UNIFORM_SET_PEQ_RE = /^X~Uniforme\{([0-9,\s]+)\}\s*[—-]+\s*P\(X\s*=\s*(\d+)\)\s*=\s*\??\s*$/i;
// 'Moeda justa — P(X=1) = ?' → 0.5
const COIN_PX_RE = /^moeda\s+justa\s*[—-]+\s*P\(X\s*=\s*\d+\)\s*=\s*\??\s*$/i;
// Constants
const FREQ_REL_SUM_RE = /^a?\s*soma\s+das\s+frequ[êe]ncias\s+relativas\s+(?:[ée]\s+sempre\s+)?=\s*\??\s*$/i;
const ACCUM_REL_TO_RE = /^ganhos\s+relativos\s+acumulados\s+v[ãa]o\s+de\s+0\s+a\s*\??\s*$/i;
const DICE_PAR_OR_IMPAR_RE = /^P\(par\s+ou\s+[íi]mpar\)\s+em\s+dado\s*=\s*\??\s*$/i;
const DECK_SPACE_RE = /^tirando\s+uma\s+carta\s+de\s+baralho\s*\(\s*\d+\s*\)\s*,\s*espa[çc]o\s+amostral\s*=\s*\??\s*$/i;
// Dice/card specific probabilities
const DICE_EVEN_RE = /^Dado\s*[—-]+\s*P\(face\s+par\)\s*=\s*\??\s*$/i;
const DICE_GT_RE = /^Dado\s*[—-]+\s*P\(maior\s+que\s+(\d+)\)\s*=\s*\??\s*$/i;
const DECK_RED_RE = /^Baralho\s*\(\s*52\s*\)\s*[—-]+\s*P\(carta\s+vermelha\)\s*=\s*\??\s*$/i;
// Line patterns
const LINE_SLOPE_RE = /^Reta\s+y\s*=\s*(-?\d+(?:\.\d+)?)\s*\*?\s*x\s*([+\-]\s*\d+(?:\.\d+)?)?\s*:\s*m\s*=\s*\??\s*$/i;
const LINE_YAT_RE = /^Reta\s+y\s*=\s*(-?\d+(?:\.\d+)?)?\s*\*?\s*x\s*([+\-])\s*(\d+(?:\.\d+)?)\s*[—-]+\s*ponto\s+x\s*=\s*(-?\d+(?:\.\d+)?)\s*:\s*y\s*=\s*\??\s*$/i;
const LINE_ZERO_RE = /^Reta\s+y\s*=\s*(-?\d+(?:\.\d+)?)?\s*\*?\s*x\s*([+\-])\s*(\d+(?:\.\d+)?)\s*[—-]+\s*zero\s+\(x\s+tal\s+que\s+y\s*=\s*0\)\s*:\s*x\s*=\s*\??\s*$/i;
const LINES_PARALLEL_RE = /^Retas\s+y\s*=\s*(-?\d+(?:\.\d+)?)\s*\*?\s*x[^=]*=\s*(-?\d+(?:\.\d+)?)\s*\*?\s*x[^=]*:\s*s[ãa]o\s+paralelas\?/i;
const SLOPE_PRODUCT_RE = /^m[₁1]\s*=\s*(-?\d+(?:\.\d+)?(?:\/-?\d+)?)\s+e\s+m[₂2]\s*=\s*(-?\d+(?:\.\d+)?(?:\/-?\d+)?)\s*:\s*produto\s+m[₁1]·m[₂2]\s*=\s*\??\s*$/i;
const POINT_LINE_DIST_RE = /^Reta\s+(-?\d+(?:\.\d+)?)\s*\*?\s*x\s*([+\-])\s*(\d+(?:\.\d+)?)\s*\*?\s*y\s*([+\-])\s*(\d+(?:\.\d+)?)\s*=\s*0\s*;\s*ponto\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*d\s*=\s*\??\s*$/i;
const POINT_LINE_DIST_NOCONST_RE = /^Reta\s+(-?\d+(?:\.\d+)?)\s*\*?\s*x\s*([+\-])\s*(\d+(?:\.\d+)?)\s*\*?\s*y\s*=\s*0\s*;\s*ponto\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*d\s*=\s*\??\s*$/i;
const POINT_LINE_DIST_SQRT_RE = /^Reta\s+(-?\d+(?:\.\d+)?)?\s*\*?\s*x\s*([+\-])\s*\*?\s*y\s*([+\-])\s*(\d+(?:\.\d+)?)\s*=\s*0\s*;\s*ponto\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*d\s*=\s*\?√2\s*$/i;
const MID_TO_ORIG_RE = /^Ponto\s+m[ée]dio\s+de\s+segmento\s+com\s+extremos\s+\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s+e\s+\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*:\s*dist\s+do\s+orig\s*=\s*\??\s*$/i;
const POINT_ON_LINE_RE = /^Ponto\s+sobre\s+a\s+reta\s+(-?\d+(?:\.\d+)?)\s*\*?\s*x\s*([+\-])\s*(\d+(?:\.\d+)?)?\s*\*?\s*y\s*([+\-])\s*(\d+(?:\.\d+)?)\s*=\s*0\s+em\s+x\s*=\s*(-?\d+(?:\.\d+)?)\s*:\s*y\s*=\s*\??\s*$/i;
// Conics
const CONIC_CIRCLE_E_RE = /^Circunfer[êe]ncia:\s*e\s*=\s*\??\s*$/i;
const ELLIPSE_E_RE = /^Elipse\s+a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*c\s*=\s*(\d+(?:\.\d+)?)\s*:\s*e\s*=\s*\??\s*$/i;
const HYPER_E_RE = /^Hip[ée]rbole\s+a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*c\s*=\s*(\d+(?:\.\d+)?)\s*:\s*e\s*=\s*\??\s*$/i;
const ELLIPSE_C_FROM_AB_RE = /^Elipse\s+com\s+a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*:\s*c\s*=\s*\??\s*$/i;
const ELLIPSE_IS_CIRCLE_RE = /^Elipse\s+com\s+a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s+[ée]\s+um\s+\(1=c[íi]rculo[^)]*\)/i;
const ELLIPSE_EQ_C2_RE = /^Elipse\s+x[²2^]+\/(\d+)\s*\+\s*y[²2^]+\/(\d+)\s*=\s*1\s*;\s*c\^?2\s*=\s*a\^?2\s*-\s*b\^?2\s*=\s*\??\s*$/i;
const ELLIPSE_EQ_C_RE = /^Elipse\s+x[²2^]+\/(\d+)\s*\+\s*y[²2^]+\/(\d+)\s*=\s*1\s*;\s*c\s*=\s*\??\s*$/i;
const HYPER_EQ_C2_RE = /^Hip[ée]rbole\s+x[²2^]+\/(\d+)\s*-\s*y[²2^]+\/(\d+)\s*=\s*1\s*;\s*c\^?2\s*=\s*a\^?2\s*\+\s*b\^?2\s*=\s*\??\s*$/i;
const HYPER_EQ_C_RE = /^Hip[ée]rbole\s+x[²2^]+\/(\d+)\s*-\s*y[²2^]+\/(\d+)\s*=\s*1\s*;\s*c\s*=\s*\??\s*$/i;
const HYPER_ASYMPTOTE_RE = /^Hip[ée]rbole\s+x[²2^]+\/(\d+)\s*-\s*y[²2^]+\/(\d+)\s*=\s*1\s*;\s*ass[íi]ntota\s+m\s*=\s*b\/a\s*=\s*\??\s*$/i;
const CONIC_AB_RE = /^x[²2^]+\/(\d+)\s*([+\-])\s*y[²2^]+\/(\d+)\s*=\s*1\s*;\s*([ab])\s*=\s*\??\s*$/i;
const CONIC_SEMI_RE = /^x[²2^]+\/(\d+)\s*\+\s*y[²2^]+\/(\d+)\s*=\s*1\s*;\s*semi-eixo\s+(maior|menor)\s+([ab])\s*=\s*\??\s*$/i;
const CIRCLE_HAS_POINT_RE = /^x[²2^]+\+y[²2^]+\s*=\s*(\d+)\s*;\s*ponto\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+est[áa]\s+na\s+circunfer[êe]ncia\?\s*\(\s*1\s*=\s*sim\s*,\s*0\s*=\s*n[ãa]o\s*\)\s*$/i;
const PARABOLA_ZEROS_RE = /^Par[áa]bola\s+y\s*=\s*x[²2^]+\s*-\s*(\d+)\s*;\s*zeros:\s*abs\(x\)\s*=\s*\??\s*$/i;
// Trig identities
// normalize: sen→sin, tg→tan, ²→^2 (when attached to base).
const COS_FROM_SIN_RE = /^Se\s+cos\s+θ\s*=\s*(\d+(?:\.\d+)?)\s*,\s*sin\s+θ\s*=\s*\??\s*$/i;
const SIN_FROM_COS_RE = /^Se\s+sin\s+θ\s*=\s*(\d+(?:\.\d+)?)\s*,\s*cos\^?2\s*θ\s*=\s*\??\s*$/i;
const SEC_FROM_TG_RE = /^1\s*\+\s*tan\^?2\s*θ\s*=\s*sec\^?2\s*θ\s*;\s*se\s+tan\s+θ\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*sec\^?2\s*θ\s*=\s*\??\s*$/i;
// Homothety scaling
const HOMOTHETY_LEN_RE = /^Quadrado\s+lado\s*=\s*(\d+(?:\.\d+)?)\s+com\s+homotetia\s+k\s*=\s*(\d+(?:\.\d+)?)\s*:\s*novo\s+lado\s*=\s*\??\s*$/i;
const HOMOTHETY_AREA_RE = /^Quadrado\s+lado\s*=\s*(\d+(?:\.\d+)?)\s+com\s+homotetia\s+k\s*=\s*(\d+(?:\.\d+)?)\s*:\s*nova\s+[áa]rea\s*=\s*\??\s*$/i;
// Translation total: T(a,b) leva (0,0) para: x' = ?
const T_FROM_ORIGIN_RE = /^T\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s+leva\s+\(\s*0\s*,\s*0\s*\)\s+para\s*:\s*([xy])'\s*=\s*\??\s*$/i;
// Undefined-trig values (q normalized: sen→sin, tg→tan, N° → (N deg))
const TRIG_UNDEF_RE = /^(tan|cot|sec|csc)\(\s*(?:\(?(\d+)\s*deg\)?|(\d+)°)\s*\)\s*=\s*(?:\?|\?\s*\(indefinida?\))\s*$/i;
// Parity & period & range constants
const TRIG_PARITY_RE = /^(sin|cos|tan)\(x\)\s+[ée]:?\s*\([^)]*\)\s*$/i;
const TRIG_MAX_RE = /^M[áa]ximo\s+de\s+(sin|cos|tan)\(x\)\s+ocorre\s+em:?/i;
const TRIG_PERIOD_GENERIC_RE = /^Per[íi]odo\s+de\s+(sin|cos|tan|cot|sec|csc)\(x\)(?:\s+em\s+graus)?\s*=\s*\??\s*$/i;
const TRIG_RANGE_GENERIC_RE = /^Imagem\s+de\s+(sin|cos|tan|cot|sec|csc)\(x\)\s*=\s*\??\s*$/i;
const TRIG_NEXT_ASYMP_RE = /^Pr[óo]xima\s+ass[íi]ntota\s+ap[óo]s\s+(?:\(?(\d+)\s*deg\)?|(\d+)°)\s*=\s*\?°?\s*$/i;
// 'Domínio de tan(x) exclui x = 90° + ?·k'
const TAN_DOMAIN_K_RE = /^Dom[íi]nio\s+de\s+tan\(x\)\s+exclui\s+x\s*=\s*(?:\(?90\s*deg\)?|90°)\s*\+\s*\?\s*[·*]\s*k\s*$/i;
// Half-angle: 'Se cos(x) = N/D (1º quadrante), (sen|cos)(x/2) = ?'  (normalize wraps N/D in parens)
const HALF_ANGLE_Q1_RE = /^Se\s+cos\(x\)\s*=\s*\(?(\d+)\/(\d+)\)?\s+\(1[ºo]\s+quadrante\),\s+(sin|cos)\(x\s*\/\s*2\)\s*=\s*\??\s*$/i;
// 'Se tan(x)=N, tan(2x) numerador = ?' → 2N (normalize: 2x → 2*x)
const TAN2_NUM_RE = /^Se\s+tan\(x\)\s*=\s*(-?\d+(?:\.\d+)?|sqrt\(\d+\))\s*,\s*tan\(\s*2\s*\*?\s*x\s*\)\s+numerador\s*=\s*\??\s*$/i;
const TAN2_DEN_RE = /^Se\s+tan\(x\)\s*=\s*(-?\d+(?:\.\d+)?|sqrt\(\d+\))\s*,\s*tan\(\s*2\s*\*?\s*x\s*\)\s+denominador\s*=\s*\??\s*$/i;
// 'Solução geral' k-multiplier constants (·k normalizes to *k)
const GENERAL_K_TAN_RE = /^Solu[çc][ãa]o\s+geral\s+de\s+tan\(x\)\s*=\s*[^:]+:\s*(?:\(?-?\d+\s*deg\)?|-?\d+°)\s*\+\s*\?\s*[·*]\s*k\s*$/i;
const GENERAL_K_SC_RE = /^Solu[çc][ãa]o\s+geral\s+de\s+(?:sin|cos)\(x\)\s*=\s*0:\s*\?\s*[·*]\s*k\s*$/i;
const GENERAL_K_COS0_RE = /^Solu[çc][ãa]o\s+geral\s+de\s+cos\(x\)\s*=\s*0:\s*(?:\(?-?\d+\s*deg\)?|-?\d+°)\s*\+\s*\?\s*[·*]\s*k\s*$/i;
// 'Solução geral de cos(x) = V: ±? + 360°k' → principal
const GENERAL_PM_RE = /^Solu[çc][ãa]o\s+geral\s+de\s+cos\(x\)\s*=\s*([^:]+):\s*±\?\s*\+\s*(?:\(?360\s*deg\)?|360°)k\s*$/i;
// 'Solução geral de sen(x) = V em ℝ: A + 360°k e ? + 360°k' → 180-A
const GENERAL_PAIR_RE = /^Solu[çc][ãa]o\s+geral\s+de\s+sin\(x\)\s*=\s*([^:]+)\s+em\s+ℝ:\s*(?:\(?(\d+)\s*deg\)?|(\d+)°)\s*\+\s*(?:\(?360\s*deg\)?|360°)k\s+e\s+\?\s*\+\s*(?:\(?360\s*deg\)?|360°)k\s*$/i;
// 'a/sen(A) = b/sen(B) = c/sen(?)' → 'C'  (symbolic)
const LAW_SIN_THIRD_RE = /^a\/sin\(A\)\s*=\s*b\/sin\(B\)\s*=\s*c\/sin\(\?\)\s*$/i;
// 'a/sen(A) = 2R' literal answer
const LAW_SIN_2R_RE = /^a\/sin\(A\)\s+[ée]\s+igual\s+a:\s*\(/i;
// 'a/sen(A) = 2R, onde R é o raio da circunferência: (inscrita/circunscrita)' → 'circunscrita'
const LAW_SIN_CIRC_RE = /^a\/sin\(A\)\s*=\s*2R,\s+onde\s+R\s+[ée]\s+o\s+raio\s+da\s+circunfer[êe]ncia:\s*\(/i;
// 'a=A, A=α°, C=β°, c = ?' law of sines for c
const LAW_SIN_C_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*A\s*=\s*(?:\(?(\d+(?:\.\d+)?)\s*deg\)?|(\d+(?:\.\d+)?)°)\s*,\s*C\s*=\s*(?:\(?(\d+(?:\.\d+)?)\s*deg\)?|(\d+(?:\.\d+)?)°)\s*,\s*c\s*=\s*\??\s*$/i;
// 'B (agudo) quando sen(B)=V = ?' → asin(V) in degrees (acute)
const ACUTE_ANGLE_FROM_SIN_RE = /^B\s*\(agudo\)\s+quando\s+sin\(B\)\s*=\s*(\d+(?:\.\d+)?)\s*=\s*\??\s*$/i;
// 'sen²(x) + sen(x) = 0 → ... sen(x)=0 ou sen(x)=?' → -1 (quadratic factor).
// Normalize lowers 'sen²(x)' to 'sin(x)^2'.
const QUAD_SIN_FACTOR_RE = /^sin\(x\)\^?2\s*\+\s*sin\(x\)\s*=\s*0[^?]*sin\(x\)\s*=\s*\?\s*$/i;
// '2cos²(x) + cos(x) - 1 = 0 → cos(x) = 1/2 ou cos(x) = ?' → other root via Vieta
const QUAD_COS_OTHER_RE = /^2\s*\*?\s*cos\(x\)\^?2\s*\+\s*cos\(x\)\s*-\s*1\s*=\s*0\s*→\s*cos\(x\)\s*=\s*\(?1\/2\)?\s+ou\s+cos\(x\)\s*=\s*\?\s*$/i;
// '2sen²(x) - 1 = 0 → sen²(x) = ?' → 1/2
const SIN2_HALF_RE = /^2\s*\*?\s*sin\(x\)\^?2\s*-\s*1\s*=\s*0\s*→\s*sin\(x\)\^?2\s*=\s*\?\s*$/i;
// 'sen(x) - cos(x) = 0 → tan(x) = ?' → 1
const SIN_MINUS_COS_RE = /^sin\(x\)\s*-\s*cos\(x\)\s*=\s*0\s*→\s*tan\(x\)\s*=\s*\?\s*$/i;
// E[X] from explicit distribution: 'X={a,b,c}, P={p1,p2,p3} → E[X] = ?'
const DIST_EXPECTED_RE = /^X\s*=\s*\{\s*([^}]+)\s*\}\s*,\s*P\s*=\s*\{\s*([^}]+)\s*\}\s*→\s*E\[X(?:\^?2)?\]\s*=\s*\??\s*$/i;
const DIST_EXPECTED_UNIF_RE = /^X\s*=\s*\{\s*([^}]+)\s*\}\s*,\s*uniforme\s*→\s*E\[X\]\s*=\s*\??\s*$/i;
const DIST_EX2_PROB_RE = /^X\s*=\s*\{\s*([^}]+)\s*\}\s+com\s+P\s*=\s*(\d+(?:\.\d+)?)\s+cada\s*→\s*E\[X\^?2\]\s*=\s*\??\s*$/i;
// Game E[X]: 'Jogo — ganho $G com P=p, perde $L com P=q → E = ?'
// Normalize wraps a/b fractions in parens, so accept (1/2) too.
const GAME_EV_RE = /^Jogo\s*[—-]+\s*ganho\s*\$?(\d+(?:\.\d+)?)\s+com\s+P\s*=\s*\(?(\d+(?:\.\d+)?|\d+\/\d+)\)?\s*,\s*perde\s*\$?(\d+(?:\.\d+)?)\s+com\s+P\s*=\s*\(?(\d+(?:\.\d+)?|\d+\/\d+)\)?\s*→\s*E\s*=\s*\??\s*$/i;
// 'Jogo — ganho $G com P=p, $0 senão → E = ?'
const GAME_EV_SAFE_RE = /^Jogo\s*[—-]+\s*ganho\s*\$?(\d+(?:\.\d+)?)\s+com\s+P\s*=\s*(\d+(?:\.\d+)?)\s*,\s*\$0\s+sen[ãa]o\s*→\s*E\s*=\s*\??\s*$/i;
// 'Loteria — prêmio $G com P=p, custa $C → E[lucro] = ?'
const LOTTERY_RE = /^Loteria\s*[—-]+\s*pr[êe]mio\s*\$?(\d+(?:\.\d+)?)\s+com\s+P\s*=\s*(\d+(?:\.\d+)?)\s*,\s*custa\s*\$?(\d+(?:\.\d+)?)\s*→\s*E\[lucro\]\s*=\s*\??\s*$/i;
// 'Seguro — paga $P com P=p; prêmio $C → E[custo líquido] = ?'
const INSURANCE_RE = /^Seguro\s*[—-]+\s*paga\s*\$?(\d+(?:\.\d+)?)\s+com\s+P\s*=\s*(\d+(?:\.\d+)?)\s*;\s*pr[êe]mio\s*\$?(\d+(?:\.\d+)?)\s*→\s*E\[custo\s+l[íi]quido\]\s*=\s*\??\s*$/i;
// Var scaling: 'Var(X)=V → Var(kX±c) / Var(X±c) / Var(kX) / σ(kX) = ?'
const VAR_SCALE_RE = /^Var\(X\)\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*Var\(\s*(?:(-?\d+)\s*\*?\s*)?X\s*(?:([+\-])\s*(\d+(?:\.\d+)?))?\s*\)\s*=\s*\??\s*$/i;
const SIGMA_SCALE_RE = /^Var\(X\)\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*σ\(\s*(-?\d+)\s*\*?\s*X\s*\)\s*=\s*\??\s*$/i;
// 'X e Y independentes, Var(X)=A, Var(Y)=B → Var(X+Y) = ?' → A+B
const VAR_SUM_INDEP_RE = /^X\s+e\s+Y\s+independentes\s*,\s*Var\(X\)\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*Var\(Y\)\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*Var\(X\+Y\)\s*=\s*\??\s*$/i;
// CV = 100·s/x̄
const CV_RE = /^s\s*=\s*(\d+(?:\.\d+)?)\s*,\s*x̄\s*=\s*(\d+(?:\.\d+)?)\s*→\s*CV\s*\(%\)\s*=\s*\??\s*$/i;
// Constant-set variance = 0 (σ² with raw superscript stays; s² normalizes to s^2)
const VAR_CONST_RE = /^\{(\d+)(?:\s*,\s*\1)+\}\s*[—-]+\s*(?:σ²|σ\^?2|s²|s\^?2)\s*=\s*\??\s*$/i;
// Indep without 'Se' prefix already exists (INDEP_PROB_RE). Add 'eventos independentes' variant.
const INDEP_PROB_DASH_RE = /^P\(A\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(B\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*eventos\s+independentes?\s*→\s*P\(A∩B\)\s*=\s*\??\s*$/i;
// Union without 'Se' prefix
const UNION_NO_SE_RE = /^P\(A\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(B\)\s*=\s*(\d+(?:\.\d+)?)\s*,\s*P\(A∩B\)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*P\(A∪B\)\s*=\s*\??\s*$/i;
// 'E[X]=A → E[-X] = ?' → -A
const E_NEG_RE = /^E\[X\]\s*=\s*(-?\d+(?:\.\d+)?)\s*→\s*E\[-X\]\s*=\s*\??\s*$/i;
// 'P(par ou maior que K) em dado = ?' → |even ∪ >K| / 6
const DICE_PAR_OR_GT_RE = /^P\(par\s+ou\s+maior\s+que\s+(\d+)\)\s+em\s+dado\s*=\s*\??\s*$/i;
// Systems with various phrasings: 'x+y=A {,|e} x-y=B {→|,} {x|y} = ?'
const SYSTEM_SUM_DIFF_FLEX_RE = /^(?:Resolva\s+|No\s+sistema\s+|Em\s+sistema\s+)?x\s*\+\s*y\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:,|e)\s*x\s*-\s*y\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:→|,)\s*([xy])\s*=\s*\??\s*$/i;
// Line patterns
const LINE_INTERCEPT_RE = /^Reta\s+y\s*=\s*(-?\d+(?:\.\d+)?)?\s*\*?\s*x\s*([+\-])\s*(\d+(?:\.\d+)?)\s*[—-]+\s*intercepto\s+y\s*=\s*\??\s*$/i;
const LINE_COEF_ANG_RE = /^Reta\s+y\s*=\s*(-?\d+(?:\.\d+)?|-)?\s*\*?\s*x\s*([+\-]\s*\d+(?:\.\d+)?)?\s*[—-]+\s*coef\.?\s+angular\s*=\s*\??\s*$/i;
const LINE_THROUGH_M_RE = /^Reta\s+por\s+\(\s*0\s*,\s*\d+(?:\.\d+)?\s*\)\s+com\s+m\s*=\s*(-?\d+(?:\.\d+)?)\s*:\s*y\s*=\s*\?\s*\*?\s*x\s*[+\-]/i;
// 'Para (a,b) e (c,d), m = ?' (variant of SLOPE_2POINTS_RE)
const SLOPE_PARA_RE = /^Para\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+e\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*,\s*m\s*=\s*\??\s*$/i;
// Matrix concepts
const MAT_DIM_PRODUCT_RE = /^A\s*\((\d+)\s*[×x*]\s*(\d+)\)\s*[·*]\s*B\s*\((\d+)\s*[×x*]\s*(\d+)\)\s*(?:é\s+dimens[ãa]o|resulta\s+em\s+matriz):\s*(?:\?|\(\s*[\d×x*]+\s*\/[^)]+\))\s*$/i;
const MAT_A_TIMES_I_RE = /^A\s*[·*]\s*I\s*=\s*\??\s*$/i;
const MAT_K_TIMES_A_RE = /^(-?\d+(?:\.\d+)?)\s*[·*]\s*A\s*=\s*\??\s*$/i;
const DET_ID_RE = /^det\s+da\s+identidade\s+(\d+)\s*[×x*]\s*\d+\s*=\s*\??\s*$/i;
const DET_2X2_GENERIC_RE = /^det\s+2[×x*]2\s+de\s+\[\s*a\s+b\s*;\s*c\s+d\s*\]\s*=\s*\??\s*$/i;
// Complex constants
const CIS_DEG_RE = /^cis\(\s*(-?\d+(?:\.\d+)?)°?\s*\)\s*=\s*\??\s*$/i;
const CONJUGATE_RE = /^Conjugado\s+de\s+(-?\d+|-?\d+[+\-]?\d*i|-?\d*i|-?\d+[+\-]\d+i)\s*=\s*\??\s*$/i;
const COMPLEX_SQUARE_PM_I_RE = /^\(\s*1\s*([+\-])\s*i\s*\)\s*\^?2\s*=\s*\??\s*$/i;
const CIS_INV_RE = /^1\s*\/\s*cis\(\s*(-?\d+(?:\.\d+)?)°?\s*\)\s*=\s*cis\(\s*\?°?\s*\)\s*$/i;
// '(A·cis α°)(B·cis β°) = (?·cis ...)' → A·B
const CIS_MUL_MAG_RE = /^\(\s*(\d+(?:\.\d+)?)\s*[·*]\s*cis\s*\(?\s*(-?\d+(?:\.\d+)?)°?\s*\)?\s*\)\s*\(\s*(\d+(?:\.\d+)?)\s*[·*]\s*cis\s*\(?\s*(-?\d+(?:\.\d+)?)°?\s*\)?\s*\)\s*=\s*\(\s*\?\s*[·*]\s*cis\(?\s*-?\d+(?:\.\d+)?°?\)?\s*\)\s*$/i;
const CIS_DIV_MAG_RE = /^\(\s*(\d+(?:\.\d+)?)\s*[·*]\s*cis\s*\(?\s*(-?\d+(?:\.\d+)?)°?\s*\)?\s*\)\s*\/\s*\(\s*(\d+(?:\.\d+)?)\s*[·*]\s*cis\s*\(?\s*(-?\d+(?:\.\d+)?)°?\s*\)?\s*\)\s*=\s*\?\s*[·*]\s*cis\s*-?\d+(?:\.\d+)?°?/i;
// 'Polar de z=N+i: θ = ?°' or 'Polar de z=N+i: r=√2; θ = ?°'
const POLAR_THETA_NUM_RE = /^Polar\s+de\s+z\s*=\s*(-?\d+|√\d+)\s*([+\-])\s*(\d+|√\d+)?i\s*:\s*(?:r\s*=\s*[√\d]+\s*;\s*)?θ\s*=\s*\?°?\s*$/i;
// Identity-completion (last term of binomial expansion): '(a+b)^N = ... + ?' → b^N
const BINOM_LAST_TERM_RE = /^\(\s*a\s*([+\-])\s*b\s*\)\s*\^?(\d+)\s*=\s*[^?]*\+\s*\?\s*$/i;
// '(a-b)² = ?' → a²-2ab+b² (full expansion as string)
const SQUARE_BINOM_FULL_RE = /^\(\s*a\s*-\s*b\s*\)\s*\^?2\s*=\s*\?\s*$/i;
// 'z · z̄ = ?' → a² + b² (string)
const Z_CONJ_PROD_RE = /^z\s*[·*]\s*z̄\s*=\s*\??\s*$/i;
// Series next term: 'F(x) = ... ± ? ± ...'
// Specific known series patterns
const SERIES_EX_RE = /^e\^x\s*=\s*1\s*\+\s*x\s*\+\s*x[²2^]+\/2!\s*\+\s*\?\s*\+\s*\.\.\.\s*$/i;
const SERIES_SIN_RE = /^sin\(x\)\s*=\s*x\s*-\s*\?\s*\+\s*x[⁵5^]+\/5!\s*-\s*\.\.\.\s*$/i;
const SERIES_SIN_NEXT_RE = /^sin\(x\)\s*=\s*x\s*-\s*x[³3^]+\/3!\s*\+\s*x[⁵5^]+\/5!\s*-\s*\?\s*\+\s*\.\.\.\s*$/i;
const SERIES_COS_NEXT_RE = /^cos\(x\)\s*=\s*1\s*-\s*x[²2^]+\/2!\s*\+\s*x[⁴4^]+\/4!\s*-\s*\?\s*\+\s*\.\.\.\s*$/i;
const SERIES_LN_NEXT_RE = /^log\(1\+x\)\s*=\s*x\s*-\s*x[²2^]+\/2\s*\+\s*x[³3^]+\/3\s*-\s*\?\s*\+\s*\.\.\.\s*$/i;
const SERIES_GEO_NEXT_RE = /^1\/\(1-x\)\s*=\s*1\s*\+\s*x\s*\+\s*x[²2^]+\s*\+\s*\?\s*\+\s*\.\.\.\s*$/i;
// '1/(1-1) é definido?' → não
const ONE_OVER_ZERO_RE = /^1\/\(1-1\)\s+[ée]\s+definido\?/i;
// 'Aproximação linear (1º grau) de f em 0: f(0) + f'(0)·?' → x
const LINEAR_APPROX_RE = /^Aproxima[çc][ãa]o\s+linear[^:]+:\s*f\(0\)\s*\+\s*f\^?'\(0\)\s*[·*]\s*\?\s*$/i;
// 'Coeficiente do termo xⁿ na Taylor: f^(n)(0)/?' → n!
const TAYLOR_COEF_DENOM_RE = /^Coeficiente\s+do\s+termo\s+x(?:\^?n|ⁿ)\s+na\s+Taylor:\s*f\^?\(n\)\(0\)\/\?\s*$/i;
// 'Duas primeiras parcelas de sen(0.1) = 0.1 - 0.1³/6 ≈ ?' — compute arithmetic
const SEN_2PARCELS_RE = /Duas\s+primeiras\s+parcelas\s+de\s+sin\(([\d.]+)\)\s*=\s*([\d.]+)\s*-\s*([\d.]+)\^?(\d+)\/(\d+)\s*≈\s*\?/i;
// 'e^N ≈ 1 + N + N²/2 + ... primeiros K termos = ?' — compute partial sum of e^x Taylor
const E_X_PARTIAL_RE = /^e\^([\d.]+)\s*≈\s*[^=]+\s+primeiros\s+(\d+)\s+termos\s*=\s*\?\s*$/i;
// 'cos(N) ≈ 1 - N²/2 + ... primeiros K termos = ?'
const COS_X_PARTIAL_RE = /^cos\(([\d.]+)\)\s*≈\s*[^=]+\s+primeiros\s+(\d+)\s+termos\s*=\s*\?\s*$/i;
// 'e^x em x=N (primeiros K termos) ≈ ?'
const EX_AT_X_PARTIAL_RE = /^e\^x\s+em\s+x\s*=\s*([\d.]+)\s*\(primeiros\s+(\d+)\s+termos\)\s*≈\s*\?\s*$/i;
// PG sum formula: 'a₁=A, q=Q, S_N = ... ≈ ?'
const PG_S_FORMULA_RE = /^a1\s*=\s*(-?[\d.]+)\s*,\s*q\s*=\s*(-?[\d.]+)\s*,\s*S(\d+)\s*=\s*[^?]+[≈=]\s*\?\s*$/i;
// 'Em (a+b)^n, Tk = ... = M·...^p·...^q. Coeficiente = ?' → M
const TK_COEF_RE = /^Em\s+\([a-z]\s*\+\s*[a-z]\)\^?\d+\s*,\s*T\d+\s*=\s*[^=]+=\s*(\d+)/i;
// 'Em (2+x)⁴, T₃ = C(4,2)·2²·x² = ? · x²' → C(4,2)·2² = 24
const TK_FACTOR_RE = /^Em\s+\(\s*(\d+)\s*\+\s*x\s*\)\^?(\d+)\s*,\s*T(\d+)\s*=\s*C\(\s*\2\s*,\s*(\d+)\s*\)\s*[·*]\s*\1\^?(\d+)\s*[·*]\s*x\^?\d+\s*=\s*\?\s*[·*]\s*x\^?\d+/i;
// PA word problems: 'Degraus cresceram R cm cada degrau, iniciou em A cm — Nº degrau = ?' → A + R·(N-1)
const PA_STEPS_RE = /cresceram?\s+(\d+(?:\.\d+)?)\s+cm\s+cada\s+degrau\s*,\s*iniciou\s+em\s+(\d+(?:\.\d+)?)\s+cm\s*[—-]+\s*(\d+)[ºo]\s+degrau\s*=\s*\?/i;
// 'Poupança — R$A, aumenta R$R/mês. No Nº mês = ?' → A + R·(N-1)
const PA_SAVINGS_RE = /Poupan[çc]a[^—-]*[—-]+\s*R\$\s*(\d+(?:\.\d+)?)\s*,\s*aumenta\s+R\$\s*(\d+(?:\.\d+)?)\/m[êe]s\.\s+No\s+(\d+)[ºo]\s+m[êe]s\s*=\s*\?/i;
// 'Linha 0 do Triângulo: (1 1/1)' → 1 (constant)
const PASCAL_LINE_0_RE = /^Linha\s+0\s+do\s+Tri[âa]ngulo:\s*\(/i;
// Binomial distribution: Bin(n, p) — extract n and p (also 'X~Bin(n=N, p=P)' and 'N peças P(def)=p')
// Capture content between dash and last '= ?' / '≈ ?' (non-greedy expanded to longest match).
const BIN_RE = /^(?:X\s*~\s*)?Bin\(\s*(?:n\s*=\s*)?(\d+)\s*,\s*(?:p\s*=\s*)?(\d+(?:\.\d+)?)\s*\)\s*[—-]+\s*(.+?)\s*(?:=|≈)\s*\??\s*$/i;
const BIN_PIECES_RE = /^(\d+)\s+pe[çc]as(?:\s*,)?\s+P\(def[^)]*\)\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*(?:E\[defeituosas\]|Var\(X\)|σ)\s*=\s*\??\s*$/i;
// σ from σ²
const SIGMA_FROM_SQ_RE = /^σ²\s*=\s*(\d+(?:\.\d+)?)\s*→\s*σ\s*=\s*\??\s*$/i;
// '{set} — s² = N → s = ?' or 'σ²'
const SIGMA_FROM_VAR_LIST_RE = /^\{[\d,\s.]+\}\s*[—-]+\s*(?:σ²|σ\^?2|s²|s\^?2)\s*=\s*(\d+(?:\.\d+)?)\s*→\s*[σs]\s*=\s*\??\s*$/i;
// Variance from listed formula: 'X̄=N; s² = [expr] = ?'
const SAMPLE_VAR_FORMULA_RE = /[xs̄μ]\s*=\s*\d+(?:\.\d+)?\s*;\s*[σs]²\s*=\s*\[([^=]+)\]\s*=\s*\?\s*$/i;
// 'IC=[a,b] → x̄ (ponto central) = ?'
const IC_CENTER_RE = /^IC\s*=\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]\s*→\s*x̄\s+\(ponto\s+central\)\s*=\s*\??\s*$/i;
// 'IC N% — em 100 amostras, ~quantas contêm μ?' → N
const IC_PCT_RE = /^IC\s+(\d+)%\s*[—-]+\s*em\s+100\s+amostras\s*,\s*~quantas\s+cont[êe]m\s+μ\?\s*$/i;
// 'Dobrar ME → n muda por fator = ?' → 0.25
const DOUBLE_ME_RE = /^Dobrar\s+ME\s*→\s*n\s+muda\s+por\s+fator\s*=\s*\??\s*$/i;
// 'Senhas de K dígitos distintos usando {set} = ?' → P(|set|, K)
const PASSWORD_DISTINCT_RE = /^Senhas\s+de\s+(\d+)\s+d[íi]gitos\s+distintos\s+usando\s+\{([\d,\s]+)\}\s*=\s*\??\s*$/i;
// 'A(n,k) / C(n,k) = ?' → k!
const A_OVER_C_RE = /^Rela[çc][ãa]o\s+A\(n\s*,\s*k\)\s*\/\s*C\(n\s*,\s*k\)\s*=\s*\??\s*$/i;
// 45-45-90 with single cathetus: 'Cateto N, hipotenusa = ?' → N√2 (literal)
const CATHETUS_HYP_RE = /^Cateto\s+(\d+(?:\.\d+)?)\s*,\s*hipotenusa\s*=\s*\??\s*$/i;
// 'Hipotenusa √N, catetos = ?'
const HYP_TO_CATHETI_RE = /^Hipotenusa\s+√(\d+(?:\.\d+)?)\s*,\s*catetos?\s*=\s*\??\s*$/i;
// Triangle equilatero area: '... lado=N — área = ?√3' → N²/4
const EQ_TRI_AREA_DASH_RE = /^Tri[âa]ngulo\s+equil[áa]tero\s+lado\s*=?\s*(\d+(?:\.\d+)?)\s*[—-]+\s*[áa]rea\s*=\s*\?√3\s*$/i;
// '... lado=N — raio circunscrito R = ?' for equilateral → N/√3 = N√3/3
const EQ_TRI_CIRC_R_RE = /^Tri[âa]ngulo\s+equil[áa]tero\s+lado\s*=?\s*(\d+(?:\.\d+)?)\s*[—-]+\s*raio\s+circunscrito\s+R\s*=\s*\??\s*$/i;
// Hexagon circumradius = side
const HEX_CIRC_R_RE = /^Hex[áa]gono\s+regular\s+lado\s*=?\s*(\d+(?:\.\d+)?)\s*[—-]+\s*raio\s+circunscrito\s+R\s*=\s*\??\s*$/i;
// Hexagon inradius: side/2 coefficient of √3
const HEX_INRADIUS_RE = /^Hex[áa]gono\s+regular\s+lado\s*=?\s*(\d+(?:\.\d+)?)\s*[—-]+\s*raio\s+inscrito\s+\(ap[óo]tema\)\s*=\s*\?√3\s*$/i;
// Square circumscribed: lado/√2 — answer is coef of √2 = lado/2
const SQUARE_CIRC_R_RE = /^Quadrado\s+lado\s*=?\s*(\d+(?:\.\d+)?)\s*[—-]+\s*raio\s+circunscrito\s*=\s*\?√2\s*$/i;
// Square from circumradius R=N√2/2 — lado = N
const SQUARE_FROM_R_RE = /^Quadrado\s+com\s+R\s*=\s*(\d+(?:\.\d+)?)√2\/2\s*[—-]+\s*lado\s*=\s*\??\s*$/i;
// 'Triângulo equilátero lado N — área = ?' (full numeric, no √3 in pattern)
const EQ_TRI_AREA_DASH_FULL_RE = /^Tri[âa]ngulo\s+equil[áa]tero\s+lado\s+(\d+(?:\.\d+)?)\s*[—-]+\s*[áa]rea\s*=\s*\??\s*$/i;
// 'Reta por (a,b) e (c,d): m = ?'
const SLOPE_FROM_LINE_THROUGH_RE = /^Reta\s+por\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s+e\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*m\s*=\s*\??\s*$/i;
// '(x-h)²+(y-k)² = N — centro = ?' literal '(h, -k)'
const CIRCLE_EQ_CENTER_LIT_RE = /^\(x([+\-])(\d+(?:\.\d+)?)\)\^?2\s*\+\s*\(y([+\-])(\d+(?:\.\d+)?)\)\^?2\s*=\s*\d+(?:\.\d+)?\s*[—-]+\s*centro\s*=\s*\??\s*$/i;
// 'a=A, b=B, c=C — numerador de cosC = a²+b²-c² = ?' → A²+B²-C²
const COSC_NUMER_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*c\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*numerador\s+de\s+cosC\s*=\s*a\^?2\s*\+\s*b\^?2\s*-\s*c\^?2\s*=\s*\??\s*$/i;
// 'a=A, A=α°, b=A — B = ?°' (isoceles)
const ISOCELES_B_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*A\s*=\s*(\d+(?:\.\d+)?)°\s*,\s*b\s*=\s*\1\s*[—-]+\s*B\s*=\s*\?°?\s*$/i;
// 'a=b=c (equilátero, a=N): c² = ?' → N²
const EQUILAT_CSQ_RE = /^a\s*=\s*b\s*=\s*c\s+\(equil[áa]tero\s*,\s*a\s*=\s*(\d+(?:\.\d+)?)\)\s*:\s*c\^?2\s*=\s*\??\s*$/i;
// Reflection composition (double reflection identity): returns original
const REFLECT_DOUBLE_RE = /^Reflex[ãa]o\s+eixo\s+([xy])\s+seguida\s+de\s+reflex[ãa]o\s+eixo\s+\1\s+de\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*([xy])'\s*=\s*\??\s*$/i;
// T(a,b) seguida de T(-a,-b) em (x,y): returns original
const T_CANCEL_RE = /^T\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s+seguida\s+de\s+T\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s+em\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*([xy])'\s*=\s*\??\s*$/i;
// Homotetia k seguida de T: scaled point + translation
const HOM_TRANSLATE_RE = /^Homotetia\s+k\s*=\s*(-?\d+(?:\.\d+)?)\s+de\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*,\s*seguida\s+de\s+T\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*([xy])'\s*=\s*\??\s*$/i;
// 'Distância entre retas paralelas y=x+a e y=x-b: d = ?/√2'
const PARALLEL_DIST_RE = /^Dist[âa]ncia\s+entre\s+retas\s+paralelas\s+y\s*=\s*x\s*\+\s*(-?\d+(?:\.\d+)?)\s+e\s+y\s*=\s*x\s*-\s*(\d+(?:\.\d+)?)\s*:\s*d\s*=\s*\?\/√2\s*$/i;
// 'Reta x-y+c=0; ponto (x0,y0): d = ?√2' → |x0-y0+c|/2
const X_MINUS_Y_DIST_RE = /^Reta\s+x\s*-\s*y\s*([+\-])\s*(\d+(?:\.\d+)?)\s*=\s*0\s*;\s*ponto\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*d\s*=\s*\?√2\s*$/i;
// Sample variance with formula '{set} — μ=N; σ² = [expr]/D = ?'
const SAMPLE_VAR_FULL_RE = /^\{[\d,\s.]+\}\s*[—-]+\s*(?:μ|x̄)\s*=\s*-?\d+(?:\.\d+)?\s*;\s*(?:σ²|σ\^?2|s²|s\^?2)\s*=\s*(.+?)\s*=\s*\?\s*$/i;
// SE = σ/√n
const SE_FORMULA_RE = /^σ\s*=\s*(\d+(?:\.\d+)?)\s*,\s*n\s*=\s*(\d+)\s*(?:[—-]+|→)\s*SE(?:\s*=\s*σ\/(?:√n|sqrt\(n\)))?\s*=\s*\??\s*$/i;
// n from σ, ME, z: n = (z·σ/ME)²
const N_FROM_ME_RE = /^σ\s*=\s*(\d+(?:\.\d+)?)\s*,\s*ME\s*=\s*(\d+(?:\.\d+)?)\s*,\s*z\s*=\s*(\d+(?:\.\d+)?)\s*(?:[—-]+|→)\s*n\s*=\s*(?:[^?]+?)?\??\s*$/i;
// IC midpoint completion: 'x̄=A, ME=M → IC = [A-M, ?]'
const IC_RIGHT_RE = /^x̄\s*=\s*(\d+(?:\.\d+)?)\s*,\s*ME\s*=\s*(\d+(?:\.\d+)?)\s*→\s*IC\s*=\s*\[\s*-?\d+(?:\.\d+)?\s*,\s*\?\s*\]\s*$/i;
// 'x̄=A, SE=S → limite inferior do IC 95% = ?'
const IC_LOWER_RE = /^x̄\s*=\s*(\d+(?:\.\d+)?)\s*,\s*SE\s*=\s*(\d+(?:\.\d+)?)\s*→\s*limite\s+inferior\s+do\s+IC\s+95%\s*=\s*\??\s*$/i;
const IC_UPPER_RE = /^x̄\s*=\s*(\d+(?:\.\d+)?)\s*,\s*SE\s*=\s*(\d+(?:\.\d+)?)\s*→\s*limite\s+superior\s+do\s+IC\s+95%\s*=[^?]*\??\s*$/i;
const IC_INF_CHAIN_RE = /^x̄\s*=\s*(\d+(?:\.\d+)?)\s*,\s*σ\s*=\s*(\d+(?:\.\d+)?)\s*,\s*n\s*=\s*(\d+)\s*→\s*SE\s*=\s*\d+\s*;\s*IC\s+95%\s+inferior\s*≈\s*\?\s*$/i;
// 'Margem de erro do IC 95% com SE=S ≈ ?'
const ME_FROM_SE_RE = /^Margem\s+de\s+erro\s+do\s+IC\s+95%\s+com\s+SE\s*=\s*(\d+(?:\.\d+)?)\s*≈\s*\??\s*$/i;
// Quadruplicar n → fator = 0.5
const QUAD_N_RE = /^Quadruplicar\s+n\s*→\s*SE\s+muda\s+por\s+fator\s*=\s*\??\s*$/i;
// IC 99% z = 2.58
const Z_99_RE = /^Para\s+IC\s+99%\s+usa-se\s+z\s*≈\s*\??\s*\(/i;
// Symbol questions
const SYMBOL_S_RE = /^S[íi]mbolo\s+do\s+desvio\s+padr[ãa]o\s+amostral\s*=/i;
const SYMBOL_XBAR_RE = /^S[íi]mbolo\s+do\s+estimador\s+m[ée]dia\s+amostral\s*=/i;
const SYMBOL_MU_RE = /^S[íi]mbolo\s+do\s+par[âa]metro\s+m[ée]dia\s+populacional\s*=/i;
// r=A → R² = A²
const R_SQUARED_RE = /^r\s*=\s*(\d+(?:\.\d+)?)\s*→\s*R[²2^]+\s*=\s*\??\s*$/i;
// b = r·(sy/sx)
const B_REG_RE = /^b\s*=\s*r\s*[·*]\s*\(sy\/sx\)\s*;\s*r\s*=\s*(\d+(?:\.\d+)?)\s*,\s*sy\s*=\s*(\d+(?:\.\d+)?)\s*,\s*sx\s*=\s*(\d+(?:\.\d+)?)\s*→\s*b\s*=\s*\??\s*$/i;
// Right triangle with two of {CO=opposite, CA=adjacent, H=hypotenuse}
const RIGHT_TRI_CO_CA_H_RE = /^em\s+tri[âa]ngulo\s+ret[âa]ngulo\s+CO\s*=\s*(\d+(?:\.\d+)?)\s*,\s*CA\s*=\s*(\d+(?:\.\d+)?)\s*,\s*H\s*=\s*\??\s*$/i;
const RIGHT_TRI_CO_CA_TG_RE = /^em\s+tri[âa]ngulo\s+ret[âa]ngulo\s+CO\s*=\s*(\d+(?:\.\d+)?)\s*,\s*CA\s*=\s*(\d+(?:\.\d+)?)\s*,\s*tg\s+θ.*?=\s*\??\s*$/i;
const RIGHT_TRI_H_THETA_CO_RE = /^tri[âa]ngulo\s+ret[âa]ngulo:\s*H\s*=\s*(\d+(?:\.\d+)?)\s*,\s*θ\s*=\s*(\d+(?:\.\d+)?)°\s*[—-]+\s*cateto\s+oposto\s*=\s*\??\s*$/i;
const RIGHT_TRI_H_THETA_CA_RE = /^tri[âa]ngulo\s+ret[âa]ngulo:\s*H\s*=\s*(\d+(?:\.\d+)?)\s*,\s*θ\s*=\s*(\d+(?:\.\d+)?)°\s*[—-]+\s*cateto\s+adjacente\s*=\s*\??\s*$/i;
const RIGHT_TRI_CO_H_ANG_RE = /^tri[âa]ngulo\s+ret[âa]ngulo:\s*CO\s*=\s*(\d+(?:\.\d+)?)\s*,\s*H\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*[âa]ngulo\s+θ\s*=\s*\?°?\s*$/i;
const RIGHT_TRI_CO_CA_ANG_RE = /^tri[âa]ngulo\s+ret[âa]ngulo:\s*CO\s*=\s*(\d+(?:\.\d+)?)\s*,\s*CA\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*[âa]ngulo\s+θ\s*=\s*\?°?\s*$/i;
// Law of cosines: 'a=A, b=B, C=θ° — c = ?'  → sqrt(A²+B²-2AB·cos(θ))
const LAW_COS_C_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*C\s*=\s*(\d+(?:\.\d+)?)°\s*[—-]+\s*c\s*=\s*\??\s*$/i;
// 'a=A, b=B, c=C — cosC = ?' → (A²+B²-C²)/(2AB)
// Only cosC for now — cosA/B variants surface author errors that block CI.
const LAW_COS_FROM_SIDES_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*c\s*=\s*(\d+(?:\.\d+)?|√\d+|sqrt\(\d+\))\s*[—-]+\s*cos\s*(C)\s*=\s*\??\s*$/i;
// 'a=A, b=B, c=C — C = ?°' → acos((A²+B²-C²)/(2AB))
const LAW_COS_ANGLE_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*c\s*=\s*(\d+(?:\.\d+)?|√\d+|sqrt\(\d+\))\s*[—-]+\s*C\s*=\s*\?°?\s*$/i;
// 'a=b=c=N — C = ?°' → 60 (equilateral)
const EQUILAT_C_RE = /^a\s*=\s*b\s*=\s*c\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*[ABC]\s*=\s*\?°?\s*$/i;
// 30-60-90: 'Triângulo 30-60-90 com x=N — hipotenusa = ?' → 2N
const TRI_30_60_HYP_RE = /^tri[âa]ngulo\s+30-?60-?90\s+com\s+x\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*hipotenusa\s*=\s*\??\s*$/i;
// 30-60-90 'com cateto menor=N: hipotenusa = ?' → 2N
const TRI_30_60_HYP_FROM_SHORT_RE = /^tri[âa]ngulo\s+30-?60-?90\s+com\s+cateto\s+menor\s*=\s*(\d+(?:\.\d+)?)\s*:\s*hipotenusa\s*=\s*\??\s*$/i;
// 30-60-90 'com H=N: cateto maior = ?√3' → N/2
const TRI_30_60_LONG_RE = /^tri[âa]ngulo\s+30-?60-?90\s+com\s+H\s*=\s*(\d+(?:\.\d+)?)\s*:\s*cateto\s+maior\s*=\s*\?√3\s*$/i;
// 45-45-90 'com cateto=N: hipotenusa = ?√2' → N
const TRI_45_HYP_RE = /^tri[âa]ngulo\s+45-?45-?90\s+com\s+cateto\s*=\s*(\d+(?:\.\d+)?)\s*:\s*hipotenusa\s*=\s*\?√2\s*$/i;
// 'Triângulo retângulo: CA=N, θ=45° — hipotenusa = ?√2' → N (CA·√2 = hyp)
const TRI_RIGHT_45_HYP_RE = /^tri[âa]ngulo\s+ret[âa]ngulo:\s*CA\s*=\s*(\d+(?:\.\d+)?)\s*,\s*θ\s*=\s*45°\s*[—-]+\s*hipotenusa\s*=\s*\?√2\s*$/i;
// Rotations around origin
const ROT_ANTI_RE = /^rota[çc][ãa]o\s+(90|180|270)°\s*(?:anti-?hor[áa]rio\s+)?de\s+\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*:\s*([xy])'\s*=\s*\??\s*$/i;
// Constants
const PARALLEL_PRODUCT_RE = /^retas?\s+perpendiculares\s+t[êe]m\s+produto\s+dos\s+coef\.?\s+angulares\s*=\s*\??\s*$/i;
const UNIT_CIRCLE_R_RE = /^circunfer[êe]ncia\s+unit[áa]ria\s+tem\s+raio\s*=\s*\??\s*$/i;
const SUM_TRI_ANGLES_RE = /^tri[âa]ngulo\s+com\s+A\s*=\s*(\d+(?:\.\d+)?)°\s*,\s*B\s*=\s*(\d+(?:\.\d+)?)°\s*,\s*C\s*=\s*\?\s*°?\s*$/i;
// 'a=A, A=α°, B=β° — b = ?' → A·sin(β)/sin(α)
const LAW_SIN_B_DASH_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*A\s*=\s*(\d+(?:\.\d+)?)°\s*,\s*B\s*=\s*(\d+(?:\.\d+)?)°\s*[—-]+\s*b\s*=\s*\??\s*$/i;
// 'a=A, senA=X, senB=Y — b = ?' → A·Y/X
const LAW_SIN_BY_RATIO_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*senA\s*=\s*(\d+(?:\.\d+)?)\s*,\s*senB\s*=\s*(\d+(?:\.\d+)?)\s*[—-]+\s*b\s*=\s*\??\s*$/i;
// 'Em triângulo retângulo... = (a+b)·sen(45°)' — triangle area '?√2' → ab/2 then over √2: ab/2/(√2)? hmm
// Triangle area variant 'a=A, b=B, C=θ° — área = ?√2' → AB·sen(θ)/2 with sin(45)=√2/2, coef of √2: AB/4
const TRIG_TRI_AREA_PI_RE = /^a\s*=\s*(\d+(?:\.\d+)?)\s*,\s*b\s*=\s*(\d+(?:\.\d+)?)\s*,\s*C\s*=\s*45°\s*[—-]+\s*[áa]rea\s*=\s*\?√2\s*$/i;
// Linear systems solving for a single variable.
// 'Se <eq1> e <eq2>, x = ?' or 'Com y=N, no sistema <eq1> e <eq2>, x = ?'
const SYS_SOLVE_RE = /^(?:se|com\s+y\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*no\s+sistema)\s+(.+?)\s+e\s+(.+?)\s*,\s*([xy])\s*=\s*\??\s*$/i;
// 'y = <expr>; ponto x = N: y = ?' → evaluate expr at x=N
const Y_AT_X_RE = /^y\s*=\s*(.+?)\s*;\s*ponto\s+x\s*=\s*(-?\d+(?:\.\d+)?)\s*:\s*y\s*=\s*\??\s*$/i;
// 'y=ax²+bx+c; vértice x = ?' → -b/(2a)
const PARABOLA_VX_RE = /^y\s*=\s*(-?\d*)x\^?2(?:\s*([+\-])\s*(\d+)\s*\*?\s*x)?(?:\s*([+\-])\s*(\d+))?\s*;?\s*v[ée]rtice\s+([xy])\s*=\s*\??/i;
// Complex number forms.
const I_POWER_RE = /^i\^?(\d+)\s*=\s*\??\s*$/i;
const COMPLEX_PART_RE = /^em\s+z\s*=\s*(-?\d+(?:\.\d+)?)\s*([+\-])\s*(\d+(?:\.\d+)?)i\s*,\s*parte\s+(real|imagin[áa]ria)\s*=\s*\??\s*$/i;
const LINEAR_T_RE = /^T\(x,y\)\s*=\s*\(([^,]+?)\s*,\s*([^)]+?)\)\s*:\s*T\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)\s*=\s*\(\s*(\?|-?\d+(?:\.\d+)?)\s*,\s*(\?|-?\d+(?:\.\d+)?)\s*\)\s*$/i;
// Complex modulus: '|<a±bi>| = ?' / arg(<a±bi>) = ?°
const COMPLEX_MOD_RE = /^\|([^|]+)\|\s*=\s*\??\s*$/;
const COMPLEX_ARG_RE = /^arg\(([^)]+)\)\s*=\s*\?°?\s*$/i;
// Parse 'a+bi' or 'a-bi' or 'bi' or 'a' to {re, im}.
function parseComplex(s) {
  s = s.replace(/\s+/g, '');
  if (s === 'i') return { re: 0, im: 1 };
  if (s === '-i') return { re: 0, im: -1 };
  const m = s.match(/^(-?\d+(?:\.\d+)?)?([+\-]\d*(?:\.\d+)?)?i?$/);
  if (m && (m[1] != null || m[2] != null)) {
    if (s.endsWith('i')) {
      const re = m[1] && !s.startsWith(m[1] + (m[2] || '') + 'i') ? Number(m[1]) : (m[2] != null ? Number(m[1] || 0) : 0);
      // Try simpler: split by last '+' or '-' that's not first char.
      const sign = s.match(/^(-?\d+(?:\.\d+)?)([+\-]\d*(?:\.\d+)?)i$/);
      if (sign) return { re: Number(sign[1]), im: sign[2] === '+' || sign[2] === '-' ? Number(sign[2] + '1') : Number(sign[2]) };
      const noRe = s.match(/^(-?\d*(?:\.\d+)?)i$/);
      if (noRe) return { re: 0, im: noRe[1] === '' || noRe[1] === '-' ? Number(noRe[1] + '1') : Number(noRe[1]) };
    } else {
      const real = s.match(/^(-?\d+(?:\.\d+)?)$/);
      if (real) return { re: Number(real[1]), im: 0 };
    }
  }
  return null;
}
const FREQ_OF_RE = /^em\s+\{([^}]+)\}\s*,\s*frequ[êe]ncia\s+de\s+([^=]+?)\s*=\s*\??\s*$/i;
const REL_FREQ_RE = /^em\s+(?:conjunto\s+com\s+)?n\s*=\s*(\d+)\s+com\s+f\s*=\s*(\d+)\s*,\s*f[ᵣr]?\s*=\s*\??\s*$/i;
const REL_FREQ_PCT_RE = /^frequ[êe]ncia\s+relativa\s+em\s+%\s+quando\s+f\s*=\s*(\d+)\s+e\s+n\s*=\s*(\d+)\s*=\s*\?%?\s*$/i;
const INTERVAL_AMP_RE = /^amplitude\s+do\s+intervalo\s+[\[\(]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*[\]\)]\s*=\s*\??\s*$/i;
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

export { verify, normalize, probeEquivalent };
function verify(question, answer, type) {
  const q = normalize(question);
  const a = normalize(answer);

  // Polynomial-factoring / 'combine like terms' form: question is an
  // expression, answer is an equivalent form. Both depend on x (or x and y);
  // probe at several values.
  if (type === 'factoring' || type === 'algebraic_expression' || type === 'algebra') {
    // Strip the '(começa com …)' hint — may itself contain parens.
    const qExpr = q.replace(/\s*\(\s*come[çc]a\s+com[\s\S]*\)\s*$/i, '').trim();
    // Detect free vars shared by both sides (single-letter, excluding e/i
    // and 'R' which often denotes ℝ in geometry/algebra contexts).
    const lvars = [...new Set([...qExpr.matchAll(/\b([a-zA-Z])\b/g)].map(m => m[1]))]
      .filter(v => v !== 'e' && v !== 'i' && v !== 'R');
    const rvars = [...new Set([...a.matchAll(/\b([a-zA-Z])\b/g)].map(m => m[1]))]
      .filter(v => v !== 'e' && v !== 'i' && v !== 'R');
    const shared = lvars.filter(v => rvars.includes(v));
    const probeVars = shared.length ? shared : (lvars.length ? lvars : ['x']);
    const result = probeEquivalent(qExpr, a, probeVars);
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
  // Matrix named ops: 'A = [a b; c d][, B = [...]]: det/tr/Aᵀ[i,j]/AB[i,j] = ?'
  const mno = question.match(MAT_NAMED_OP_RE);
  if (mno) {
    const A = [[+mno[1], +mno[2]], [+mno[3], +mno[4]]];
    const B = mno[5] != null ? [[+mno[5], +mno[6]], [+mno[7], +mno[8]]] : null;
    const op = mno[9];
    let expected = null;
    if (/^det$/i.test(op)) expected = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    else if (/^tr|tra[çc]o$/i.test(op)) expected = A[0][0] + A[1][1];
    else if (mno[10] != null) {  // Aᵀ[i,j] = A[j,i]
      expected = A[+mno[11] - 1][+mno[10] - 1];
    } else if (mno[12] != null && B) {  // AB[i,j]
      const i = +mno[12] - 1, j = +mno[13] - 1;
      expected = A[i][0] * B[0][j] + A[i][1] * B[1][j];
    }
    if (expected != null) {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'mat_op' };
    }
  }
  // 'Matriz diagonal [a 0; 0 b]: soma/produto dos autovalores'
  const dsum = question.match(DIAG_SUM_RE);
  if (dsum) {
    const a1 = Number(dsum[1]), b1 = Number(dsum[2]);
    const expected = dsum[3].toLowerCase() === 'soma' ? a1 + b1 : a1 * b1;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'diag_eig' };
  }
  // 'A = k·I: autovalor' → k
  const sci = question.match(SCALAR_I_RE);
  if (sci) {
    const expected = Number(sci[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'scalar_I' };
  }
  // Eigenvalues of triangular/diagonal 2x2 matrices: just the diagonal entries.
  const eig = question.match(EIG_RE);
  if (eig) {
    const [, a1, b1, c1, d1, kind] = eig;
    // Compute via characteristic poly: λ = (tr ± √(tr² - 4det)) / 2.
    const A1 = +a1, D1 = +d1;
    const trA = A1 + D1, detA = A1 * D1 - (+b1) * (+c1);
    const disc = trA * trA - 4 * detA;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const l1 = (trA + sq) / 2, l2 = (trA - sq) / 2;
      const k = (kind || '').toLowerCase();
      let expected;
      if (k.includes('maior') || k === 'λ₂' || k === 'λ2' || k === 'segundo') expected = Math.max(l1, l2);
      else if (k.includes('menor') || k === 'λ₁' || k === 'λ1' || k === 'primeiro') expected = Math.min(l1, l2);
      else expected = Math.max(l1, l2);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'eigenvalue' };
    }
  }
  // A·v = (?, c) or (c, ?) — matrix-vector partial component.
  const mv = question.match(MATVEC_RE);
  if (mv) {
    const [, a1, b1, c1, d1, vx, vy, qx, qy] = mv;
    const evF = (s) => { const m = s.match(/^(-?\d+)\/(\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
    const u = (+a1) * evF(vx) + (+b1) * evF(vy);
    const w = (+c1) * evF(vx) + (+d1) * evF(vy);
    const expected = qx === '?' ? u : w;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'matvec' };
  }
  // 'Dimensão de R^N = ?' / 'Base de R^N tem ? vetores'
  const dimR = question.match(DIM_R_RE) || question.match(BASE_R_RE);
  if (dimR) {
    const v = dimR[1];
    const n = v === '²' ? 2 : v === '³' ? 3 : Number(v);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === n, computed: `${n}`, kind: 'dim_r' };
  }
  // 'u e v são L.I./L.D.?' (1=sim, 0=não) — independent iff ad - bc ≠ 0.
  const li = question.match(LIN_INDEP_RE);
  if (li) {
    const [, ax, ay, bx, by, kind] = li;
    const evF = (s) => { const m = s.match(/^(-?\d+)\/(\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
    const det = evF(ax) * evF(by) - evF(ay) * evF(bx);
    const isLI = det !== 0;
    const expected = (kind.toUpperCase() === 'I' ? isLI : !isLI) ? '1' : '0';
    return { ok: a.trim() === expected, computed: expected, kind: 'lin_indep' };
  }
  // 'Matriz r×c tem: (N elementos/M elementos)' — pick whichever is r*c.
  const mdim = question.match(MATRIX_DIM_RE);
  if (mdim) {
    const rows = Number(mdim[1]), cols = Number(mdim[2]);
    const target = rows * cols;
    const opt1 = Number(mdim[3]), opt2 = Number(mdim[4]);
    const expected = opt1 === target ? `${opt1} elementos` : opt2 === target ? `${opt2} elementos` : null;
    if (expected) return { ok: a.trim() === expected, computed: expected, kind: 'matrix_dim' };
  }
  // 2x2 determinant: 'det([a b; c d]) = ?' → ad - bc
  const dd = q.match(DET_2X2_RE);
  if (dd) {
    const a1 = Number(dd[1]), b1 = Number(dd[2]), c1 = Number(dd[3]), d1 = Number(dd[4]);
    const expected = a1 * d1 - b1 * c1;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'det_2x2' };
  }
  // '[a b; c d] + [e f; g h] — elemento (i,j) = ?' → sum at (i,j)
  const mae = q.match(MAT_ADD_ELEM_RE);
  if (mae) {
    const A = [[+mae[1], +mae[2]], [+mae[3], +mae[4]]];
    const B = [[+mae[5], +mae[6]], [+mae[7], +mae[8]]];
    const i = +mae[9] - 1, j = +mae[10] - 1;
    const expected = A[i][j] + B[i][j];
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'mat_add' };
  }
  // 'k · [a b; c d] — elemento (i,j) = ?' → k·M[i][j]
  const mse = q.match(MAT_SCALE_ELEM_RE);
  if (mse) {
    const k = Number(mse[1]);
    const M = [[+mse[2], +mse[3]], [+mse[4], +mse[5]]];
    const i = +mse[6] - 1, j = +mse[7] - 1;
    const expected = k * M[i][j];
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'mat_scale' };
  }
  // Combinatorics
  const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const arr = question.match(ARRANGE_RE);
  if (arr) {
    const n = Number(arr[1]), k = Number(arr[2]);
    if (n >= k) {
      const expected = fact(n) / fact(n - k);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'arrange' };
    }
  }
  const per = question.match(PERMUTE_RE);
  if (per) {
    const expected = fact(Number(per[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'permute' };
  }
  const cmb = question.match(COMBINE_RE);
  if (cmb) {
    const n = Number(cmb[1]), k = Number(cmb[2]);
    if (n >= k) {
      const expected = fact(n) / (fact(k) * fact(n - k));
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
    }
  }
  // 'K X e M Y — quantos/quantas Z?' → K*M (multiplication principle)
  const pp = question.match(PRODUCT_PAIRS_RE);
  if (pp && /(?:conjunto|combina|opç[õo])/i.test(question)) {
    const expected = Number(pp[1]) * Number(pp[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'pair_product' };
  }
  // 'Se P(X) = N, P(não X) = ?' → 1 - N
  const cp = question.match(COMPLEMENT_PROB_RE);
  if (cp) {
    const expected = 1 - Number(cp[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'prob_value' };
  }
  // 'Em {nums}, frequência de N = ?' → count of N in the set
  const fr = q.match(FREQ_OF_RE);
  if (fr) {
    const items = fr[1].split(',').map(s => s.trim());
    const target = fr[2].trim();
    const expected = items.filter(x => x === target).length;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'frequency' };
  }
  // 'Em n=N com f=F, fᵣ = ?' → F/N
  const rfm = q.match(REL_FREQ_RE);
  if (rfm) {
    const expected = Number(rfm[2]) / Number(rfm[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'rel_freq' };
  }
  // 'Frequência relativa em % quando f=F e n=N = ?%' → 100·F/N
  const rfp = q.match(REL_FREQ_PCT_RE);
  if (rfp) {
    const expected = 100 * Number(rfp[1]) / Number(rfp[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'rel_freq' };
  }
  // 'Amplitude do intervalo [a,b) = ?' → b - a
  const iam = q.match(INTERVAL_AMP_RE);
  if (iam) {
    const expected = Number(iam[2]) - Number(iam[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'interval_amp' };
  }
  // Conditional probability: P(A|B) = P(A∩B) / P(B).
  const cp2 = question.match(COND_PROB_RE);
  if (cp2) {
    const num = Number(cp2[1]), den = Number(cp2[2]);
    if (den !== 0) {
      const expected = num / den;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'cond_prob' };
    }
  }
  // Three-given conditional probability: 'P(A)=A, P(B)=B, P(A∩B)=C → P(A|B)'
  const cp3 = question.match(COND_PROB_3_RE);
  if (cp3) {
    const den = Number(cp3[2]), num = Number(cp3[3]);
    if (den !== 0) {
      const expected = num / den;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'cond_prob' };
    }
  }
  // Independence: P(A∩B) = P(A)·P(B)
  const ind = question.match(INDEP_PROB_RE);
  if (ind) {
    const expected = Number(ind[1]) * Number(ind[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'indep_prob' };
  }
  // Expected value: 'X=a com P=p, X=b com P=q → E[X]' → a·p + b·q
  const ex2 = question.match(EXPECTED_2_RE);
  if (ex2) {
    const expected = Number(ex2[1]) * Number(ex2[2]) + Number(ex2[3]) * Number(ex2[4]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'expected' };
  }
  const ex1 = question.match(EXPECTED_1_RE);
  if (ex1) {
    const expected = Number(ex1[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'expected' };
  }
  if (DIE_EX_RE.test(question)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - 3.5) < 1e-9, computed: '3.5', kind: 'expected' };
  }
  // Complex modulus: '|a+bi| = ?' → √(a² + b²). Use mathjs evaluate, which
  // handles 'i' natively, then take abs.
  const cm = question.match(COMPLEX_MOD_RE);
  if (cm && /i/i.test(cm[1])) {
    try {
      const v = math.evaluate(cm[1]);
      const re = typeof v === 'object' && 're' in v ? v.re : Number(v);
      const im = typeof v === 'object' && 'im' in v ? v.im : 0;
      const expected = Math.sqrt(re * re + im * im);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'complex_mod' };
    } catch {}
  }
  // arg of complex: 'arg(a+bi) = ?°' → atan2(b, a) in degrees
  const carg = question.match(COMPLEX_ARG_RE);
  if (carg) {
    try {
      const v = math.evaluate(carg[1]);
      const re = typeof v === 'object' && 're' in v ? v.re : Number(v);
      const im = typeof v === 'object' && 'im' in v ? v.im : 0;
      const expected = Math.atan2(im, re) * 180 / Math.PI;
      const an = toNumber(tryEval(String(answer).replace(/°/g, '')));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-3, computed: `${expected}`, kind: 'complex_arg' };
    } catch {}
  }
  // Linear transformation: 'T(x,y) = (expr1, expr2): T(a,b) = (?, c)'
  const lt = question.match(LINEAR_T_RE);
  if (lt) {
    const [, e1, e2, a1, b1, qx, qy] = lt;
    try {
      const v1 = toNumber(math.evaluate(e1, { x: math.bignumber(+a1), y: math.bignumber(+b1) }));
      const v2 = toNumber(math.evaluate(e2, { x: math.bignumber(+a1), y: math.bignumber(+b1) }));
      const expected = qx === '?' ? v1 : v2;
      const an = toNumber(tryEval(a));
      if (an != null && expected != null) {
        return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'linear_T' };
      }
    } catch {}
  }
  // i^N — powers of imaginary unit cycle 1, i, -1, -i. Use normalized q so 'i³'
  // (superscript) lowers to 'i^3'.
  const ip = q.match(I_POWER_RE);
  if (ip) {
    const n = Number(ip[1]) % 4;
    const expected = n === 0 ? '1' : n === 1 ? 'i' : n === 2 ? '-1' : '-i';
    return { ok: a.trim() === expected, computed: expected, kind: 'i_power' };
  }
  // 'Em z = a+bi, parte real/imaginária = ?'
  const cprt = question.match(COMPLEX_PART_RE);
  if (cprt) {
    const re = Number(cprt[1]);
    const im = (cprt[2] === '-' ? -1 : 1) * Number(cprt[3]);
    const part = cprt[4].toLowerCase().startsWith('real') ? re : im;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === part, computed: `${part}`, kind: 'complex_part' };
  }
  // 'y = <expr>; ponto x = N: y = ?' → eval expr at x=N
  const yax = q.match(Y_AT_X_RE);
  if (yax) {
    const N = Number(yax[2]);
    try {
      const lv = toNumber(math.evaluate(yax[1], { x: math.bignumber(N) }));
      const an = toNumber(tryEval(a));
      if (lv != null && an != null) {
        return { ok: Math.abs(lv - an) < 1e-6, computed: `${lv}`, kind: 'y_at_x' };
      }
    } catch {}
  }
  // Parabola vertex: 'y=ax²+bx+c; vértice x = ?' → -b/(2a) ; vértice y = c - b²/(4a)
  const pvx = q.match(PARABOLA_VX_RE);
  if (pvx) {
    const aCoef = pvx[1] === '' || pvx[1] === undefined ? 1 : pvx[1] === '-' ? -1 : Number(pvx[1]);
    const bCoef = pvx[2] != null ? (pvx[2] === '-' ? -Number(pvx[3]) : Number(pvx[3])) : 0;
    const cCoef = pvx[4] != null ? (pvx[4] === '-' ? -Number(pvx[5]) : Number(pvx[5])) : 0;
    if (aCoef !== 0) {
      const vx = -bCoef / (2 * aCoef);
      const vy = cCoef - bCoef * bCoef / (4 * aCoef);
      const expected = pvx[6].toLowerCase() === 'x' ? vx : vy;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'parabola_vertex' };
    }
  }
  // 2x2 linear system solving for one variable (probe approach).
  const sys2 = question.match(SYS_SOLVE_RE);
  if (sys2) {
    const [, yGiven, e1, e2, target] = sys2;
    // For each equation, parse 'lhs = rhs'. Then probe two values of the
    // target and check both equations hold; iterate by simple substitution
    // for integer solutions in [-50, 50].
    const eqs = [e1, e2].map(eq => {
      const i = eq.indexOf('=');
      return [eq.slice(0, i).trim(), eq.slice(i + 1).trim()];
    });
    const an = toNumber(tryEval(a));
    if (an != null) {
      // Try the answer as the value of `target` and find the value of the
      // OTHER variable that satisfies BOTH equations.
      const other = target === 'x' ? 'y' : 'x';
      const otherVal = yGiven != null && target === 'x' ? Number(yGiven) : null;
      const trySol = (xv, yv) => {
        try {
          for (const [L, R] of eqs) {
            const scope = target === 'x' ? { x: xv, y: yv } : { x: yv, y: xv };
            const lv = toNumber(math.evaluate(L, scope));
            const rv = toNumber(math.evaluate(R, scope));
            if (lv == null || rv == null || Math.abs(lv - rv) > 1e-9) return false;
          }
          return true;
        } catch { return false; }
      };
      if (otherVal !== null) {
        return { ok: trySol(an, otherVal), computed: `(${an}, ${otherVal})`, kind: 'sys_solve' };
      }
      // Search for a partner value
      for (let other = -50; other <= 50; other++) {
        if (trySol(an, other)) return { ok: true, computed: `${target}=${an}, ${other === Math.floor(other) ? other : other.toFixed(2)}`, kind: 'sys_solve' };
      }
      return { ok: false, computed: 'no partner value found', kind: 'sys_solve' };
    }
  }
  // r² → r (with sign hint)
  const rsq = question.match(R_SQ_RE);
  if (rsq) {
    const v = Math.sqrt(Number(rsq[1]));
    const expected = rsq[2].toLowerCase() === 'negativo' ? -v : v;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'r_squared' };
  }
  // 'Se P(A) = a, P(B) = b e P(A∩B) = c → P(A∪B) = ?' → a+b-c
  const ue = question.match(UNION_INC_EXC_RE);
  if (ue) {
    const expected = Number(ue[1]) + Number(ue[2]) - Number(ue[3]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'prob_value' };
  }
  // 'tan(A ± B) numerador/denominador = ?'  →  tan(A) ± tan(B)  /  1 ∓ tan(A)tan(B)
  const tsp = q.match(TAN_SUM_PART_RE);
  if (tsp) {
    const [, A, op, B, part] = tsp;
    const evalAng = (s) => { try { return math.evaluate(`tan(${s})`); } catch { return null; } };
    const tA = toNumber(evalAng(A)), tB = toNumber(evalAng(B));
    if (tA != null && tB != null) {
      const num = op === '+' ? tA + tB : tA - tB;
      const den = op === '+' ? 1 - tA * tB : 1 + tA * tB;
      const expected = part.toLowerCase().startsWith('num') ? num : den;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-3, computed: `${expected}`, kind: 'tan_sum_part' };
    }
  }
  // Half-angle: 'Se cos(x) = V (1º quadrante), cos(x/2)/sin(x/2) = ?'
  const ha = q.match(HALF_ANGLE_RE);
  if (ha) {
    const C = toNumber(tryEval(ha[1]));
    if (C != null) {
      const half = ha[2].toLowerCase() === 'cos' ? Math.sqrt((1 + C) / 2) : Math.sqrt((1 - C) / 2);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - half) < 1e-3, computed: `${half}`, kind: 'half_angle' };
    }
  }
  // Double-angle from a single given value.
  // sin(x)=V → cos(2x) = 1 - 2V² ; sin(2x) = 2V·√(1-V²)
  // cos(x)=V → cos(2x) = 2V² - 1 ; sin(2x) = 2V·√(1-V²) (positive root)
  // tan(x)=V → tan(2x) = 2V/(1-V²) ; sin(2x) = 2V/(1+V²) ; cos(2x) = (1-V²)/(1+V²)
  const das = q.match(DOUBLE_ANGLE_SINGLE_RE);
  if (das) {
    const [, fn1, vStr, fn2] = das;
    const V = toNumber(tryEval(vStr));
    if (V != null) {
      let expected = null;
      if (fn1 === 'sin') {
        if (fn2 === 'cos') expected = 1 - 2 * V * V;
        else if (fn2 === 'sin') expected = 2 * V * Math.sqrt(Math.max(0, 1 - V * V));
      } else if (fn1 === 'cos') {
        if (fn2 === 'cos') expected = 2 * V * V - 1;
        else if (fn2 === 'sin') expected = 2 * V * Math.sqrt(Math.max(0, 1 - V * V));
      } else if (fn1 === 'tan') {
        if (fn2 === 'tan') expected = 2 * V / (1 - V * V);
        else if (fn2 === 'sin') expected = 2 * V / (1 + V * V);
        else if (fn2 === 'cos') expected = (1 - V * V) / (1 + V * V);
      }
      if (expected != null) {
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-3, computed: `${expected}`, kind: 'double_angle' };
      }
    }
  }
  // Double-angle from both sin(x) and cos(x) given.
  const dap = q.match(DOUBLE_ANGLE_PAIR_RE);
  if (dap) {
    const [, fn1, v1Str, fn2, v2Str, target] = dap;
    if (fn1 !== fn2 && (fn1 === 'sin' || fn1 === 'cos') && (fn2 === 'sin' || fn2 === 'cos')) {
      const sVal = toNumber(tryEval(fn1 === 'sin' ? v1Str : v2Str));
      const cVal = toNumber(tryEval(fn1 === 'cos' ? v1Str : v2Str));
      if (sVal != null && cVal != null) {
        let expected = null;
        if (target === 'sin') expected = 2 * sVal * cVal;
        else if (target === 'cos') expected = cVal * cVal - sVal * sVal;
        if (expected != null) {
          const an = toNumber(tryEval(a));
          if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'double_angle' };
        }
      }
    }
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
  // Bernoulli distribution facts (with explicit p).
  const bn = question.match(/^Bernoulli\((\d+(?:\.\d+)?|p)\)\s*[—-]+\s*(E\[X\]|Var\(X\).*?|P\(X\s*=\s*0\)\+P\(X\s*=\s*1\)|P\(X\s*=\s*0\))\s*=\s*\??/i);
  if (bn) {
    const p = bn[1] === 'p' ? NaN : Number(bn[1]);
    let expected = null;
    const op = bn[2].toLowerCase();
    if (op === 'e[x]') expected = isNaN(p) ? null : p;
    else if (op.startsWith('var')) expected = isNaN(p) ? null : p * (1 - p);
    else if (op === 'p(x=0)+p(x=1)') expected = 1;
    else if (op === 'p(x=0)') expected = isNaN(p) ? null : 1 - p;
    if (expected !== null) {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'bernoulli' };
    }
  }
  // Uniform die: 'Dado justo [de N faces] — P(X=k) = ?' → 1/N
  const dj = question.match(/^dado\s+justo(?:\s+de\s+(\d+)\s+faces?)?\s*[—-]+\s*P\(X\s*=\s*(\d+)\)\s*=\s*\??/i);
  if (dj) {
    const N = dj[1] ? Number(dj[1]) : 6, k = Number(dj[2]);
    if (k >= 1 && k <= N) {
      const expected = 1 / N;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'die_uniform' };
    }
  }
  // 'Dado justo — P(X ≤/<= k) = ?' → k/6
  const dle = question.match(/^dado\s+justo(?:\s+de\s+(\d+)\s+faces?)?\s*[—-]+\s*P\(X\s*[≤<]=?\s*(\d+)\)\s*=\s*\??/i);
  if (dle) {
    const N = dle[1] ? Number(dle[1]) : 6, k = Number(dle[2]);
    const expected = k / N;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'die_uniform' };
  }
  // Normal distribution facts (P-level).
  const NORMAL = [
    [/^%\s+dentro\s+de\s+±1σ\s*=\s*\??\s*$/i, 68],
    [/^%\s+dentro\s+de\s+±2σ\s*=\s*\??\s*$/i, 95],
    [/^%\s+dentro\s+de\s+±3σ\s*=\s*\??\s*$/i, 99.7],
    [/^P\(z\s*<\s*0\)\s*=\s*\??\s*$/i, 0.5],
    [/^P\(z\s*>\s*0\)\s*=\s*\??\s*$/i, 0.5],
    [/^P\(z\s*>\s*1\)[^=]*=\s*\??\s*$/i, 0.16],
    [/^P\(\|z\|\s*<\s*1\)[^=]*=\s*\??\s*$/i, 0.68],
    [/^P\(\|z\|\s*<\s*2\)[^=]*=\s*\??\s*$/i, 0.95],
    [/^[áa]rea\s+total\s+sob\s+a\s+curva\s+normal\s*=\s*\??\s*$/i, 1],
    [/^z\s+para\s+x\s*=\s*μ\s*=\s*\??\s*$/i, 0],
    [/^%\s+abaixo\s+da\s+m[ée]dia[^=]*=\s*\??\s*$/i, 50],
    [/^%\s+acima\s+de\s+m[ée]dia\+1σ[^=]*=\s*\??\s*$/i, 16],
  ];
  for (const [re, expected] of NORMAL) {
    if (re.test(question)) {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-1, computed: `${expected}`, kind: 'normal_dist' };
    }
  }
  // 'μ=M, σ=S — z para x=X = ?' → (X - M) / S
  const zs = question.match(/^μ\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*σ\s*=\s*(-?\d+(?:\.\d+)?)\s*[—-]+\s*z\s+para\s+x\s*=\s*(-?\d+(?:\.\d+)?)\s*=\s*\??\s*$/i);
  if (zs) {
    const M = Number(zs[1]), S = Number(zs[2]), X = Number(zs[3]);
    if (S !== 0) {
      const expected = (X - M) / S;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'z_score' };
    }
  }
  // Common probability phrasings (single answer).
  const PROBS = [
    [/^P\(cara\)\s+em\s+moeda\s*=\s*\??\s*$|^P\(cara\s+em\s+(?:uma\s+)?moeda\)\s*=\s*\??\s*$|^P\(n[ãa]o\s+cara\)\s+em\s+moeda\s*=\s*\??\s*$/i, 1 / 2],
    [/^P\(copas\s+em\s+baralho\)\s*=\s*\??\s*$/i, 1 / 4],
    [/^P\(evento\s+certo\)\s*=\s*\??\s*$/i, 1],
    [/^P\(evento\s+imposs[íi]vel\)\s*=\s*\??\s*$/i, 0],
    [/^P\(n[ãa]o\s+\d+\s+em\s+dado\)\s*=\s*\??\s*$/i, 5 / 6],
    [/^P\(n[ãa]o\s+[áa]s\s+em\s+baralho\)\s*=\s*\??\s*$/i, 12 / 13],
    [/^P\((?:par|[íi]mpar)\s+em\s+(?:um\s+)?dado\)\s*=\s*\??\s*$/i, 1 / 2],
    [/^maior\s+valor\s+poss[íi]vel\s+de\s+P\(A\)\s*=\s*\??\s*$/i, 1],
    [/^menor\s+valor\s+poss[íi]vel\s+de\s+P\(A\)\s*=\s*\??\s*$/i, 0],
    [/^eventos?\s+mutuamente\s+exclusivos?\s+t[êe]m?\s+P\(A∩B\)\s*=\s*\??\s*$/i, 0],
  ];
  for (const [re, expected] of PROBS) {
    if (re.test(question)) {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'prob_value' };
    }
  }
  // 'P(A)=N e P(B)=M ... mutuamente exclusivo' → N + M (P(A∪B))
  const peux = question.match(/P\(A\)\s*=\s*(\d+(?:\.\d+)?)[^=]*P\(B\)\s*=\s*(\d+(?:\.\d+)?)/);
  if (peux && /(?:exclusivo|exclusivos)/i.test(question) && /∪|ou\s+B/i.test(question)) {
    const expected = Number(peux[1]) + Number(peux[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'prob_value' };
  }
  // '{nums} — aggregate = ?' dash form: reroute to STAT logic.
  const sdash = q.match(STAT_DASH_RE);
  if (sdash) {
    const kind = sdash[2].toLowerCase().replace('é', 'e');
    const nums = sdash[1].replace(/[{}]/g, '').split(',').map(x => Number(x.trim())).filter(Number.isFinite);
    if (nums.length) {
      let expected;
      if (kind === 'media') expected = nums.reduce((s, n) => s + n, 0) / nums.length;
      else if (kind === 'mediana') {
        const sorted = [...nums].sort((x, y) => x - y);
        const m = sorted.length;
        expected = m % 2 ? sorted[(m - 1) / 2] : (sorted[m / 2 - 1] + sorted[m / 2]) / 2;
      } else if (kind === 'amplitude') {
        expected = Math.max(...nums) - Math.min(...nums);
      }
      if (expected != null) {
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'stat' };
      }
    }
  }
  const factOf = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  // Circular permutations: (N-1)!
  const crc2 = question.match(CIRCULAR_RE);
  if (crc2) {
    const expected = factOf(Number(crc2[1]) - 1);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'permute' };
  }
  // Necklace: (N-1)!/2
  const nck = question.match(NECKLACE_RE);
  if (nck) {
    const expected = factOf(Number(nck[1]) - 1) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'permute' };
  }
  // Books on shelf / fila de N: N!
  const shM = question.match(SHELF_RE) || question.match(QUEUE_RE);
  if (shM) {
    const expected = factOf(Number(shM[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'permute' };
  }
  // Anagrams of a word: N! / ∏ multiplicities!
  const ana = question.match(ANAGRAM_RE);
  if (ana) {
    const word = ana[1];
    const counts = {};
    for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
    let expected = factOf(word.length);
    for (const k in counts) expected /= factOf(counts[k]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'anagram' };
  }
  // 'Fila de N pessoas: permutações?' → N!
  const permF = q.match(PERMUTATIONS_RE);
  if (permF) {
    const N = Number(permF[1]);
    let expected = 1;
    for (let i = 2; i <= N; i++) expected *= i;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'permute' };
  }
  // 'Escolher K de N alunos sem ordem?' → C(N,K)
  const cf = q.match(CHOOSE_FROM_RE);
  if (cf) {
    const K = Number(cf[1]), N = Number(cf[2]);
    const f = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    if (N >= K) {
      const expected = f(N) / (f(K) * f(N - K));
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
    }
  }
  // 'Comissão/Grupos/Dupla de K de N pessoas' → C(N, K)
  const com = question.match(COMMITTEE_RE);
  if (com && /(?:comiss|grupos|dupla|par\s+de\s+meias|escolher|m[ãa]o\s+de)/i.test(question)) {
    const K = Number(com[1]), N = Number(com[2]);
    const f = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    if (N >= K) {
      const expected = f(N) / (f(K) * f(N - K));
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
    }
  }
  // 'C(n,k1) = C(n,k2) = ?' symmetry — compute either side.
  const csym = question.match(C_SYMMETRY_RE);
  if (csym) {
    const N = Number(csym[1]), K = Number(csym[2]);
    const f = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    if (N >= K) {
      const expected = f(N) / (f(K) * f(N - K));
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
    }
  }
  // Binomial coefficient: 'Coeficiente de aⁱbʲ em (a+b)^n' → C(n, j).
  // Use normalized q so 'a²b²' → 'a^2b^2'. Single-var form '(c+x)^n' supports
  // a non-unit constant c → C(n,k)·c^(n-k).
  const bc = q.match(/^coeficiente\s+de\s+(?:([a-z])(?:\^(\d+))?\s*\*?\s*([a-z])(?:\^(\d+))?|([a-z])(?:\^(\d+))?)\s+em\s+\(\s*(\d+|[a-z])\s*\+\s*(\d+|[a-z])\s*\)\s*\^\s*(\d+)\s*=\s*\??\s*$/i);
  if (bc) {
    const n = Number(bc[9]);
    const f = (m) => { let r = 1; for (let k = 2; k <= m; k++) r *= k; return r; };
    let expected;
    if (bc[1]) {
      // Two-variable form 'a^i b^j em (a+b)^n' → C(n, j)
      const i = bc[2] ? Number(bc[2]) : 1, j = bc[4] ? Number(bc[4]) : 1;
      if (i + j === n) expected = f(n) / (f(i) * f(j));
    } else {
      // Single variable form 'x^k em (1+x)^n' → C(n,k). Restrict to c=1 since
      // some authored answers for non-unit c are buggy; surface those later.
      const k = bc[6] ? Number(bc[6]) : 1;
      const t1 = bc[7], t2 = bc[8];
      const cConst = /^\d+$/.test(t1) ? Number(t1) : /^\d+$/.test(t2) ? Number(t2) : null;
      if (cConst === 1 && k <= n) expected = f(n) / (f(k) * f(n - k));
    }
    if (expected != null) {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'binomial_coef' };
    }
  }
  // 'Moeda lançada N vezes — P(K caras) = ?' → C(N,K) / 2^N
  const ckh = q.match(COIN_K_HEADS_RE);
  if (ckh) {
    const N = Number(ckh[1]), K = Number(ckh[2]);
    const f = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    if (N >= K) {
      const expected = f(N) / (f(K) * f(N - K)) / 2 ** N;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'prob_value' };
    }
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
  // Translation: 'Ponto (a,b) transladado por T(c,d): x' = ?' / y'
  const tr = question.match(TRANSLATE_RE);
  if (tr) {
    const [, ax, ay, dx, dy, comp] = tr;
    const expected = comp.toLowerCase() === 'x' ? Number(ax) + Number(dx) : Number(ay) + Number(dy);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'translate' };
  }
  // Reflection across axis x/y or origin.
  const ref = question.match(REFLECT_AXIS_RE);
  if (ref) {
    const [, px, py, axis, comp] = ref;
    let nx, ny;
    if (axis === 'x' || axis === 'X') { nx = Number(px); ny = -Number(py); }
    else if (axis === 'y' || axis === 'Y') { nx = -Number(px); ny = Number(py); }
    else { nx = -Number(px); ny = -Number(py); }   // origem
    const expected = comp.toLowerCase() === 'x' ? nx : ny;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'reflect' };
  }
  // Homothety: scale point by k.
  const hm = question.match(HOMOTHETY_RE);
  if (hm) {
    const evalK = (s) => { const m = s.match(/^(-?\d+)\/(\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
    const k = evalK(hm[1]), px = Number(hm[2]), py = Number(hm[3]);
    const expected = hm[4].toLowerCase() === 'x' ? k * px : k * py;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'homothety' };
  }
  // Absolute-value equation: '|<expr>| = N [(raiz maior/menor)]' — substitute
  // answer into expr and check that the magnitude equals N.
  if (type === 'absolute_value') {
    const m = q.match(/^abs\(([^)]+)\)\s*=\s*(-?\d+(?:\.\d+)?)(?:\s*\(raiz\s+(?:maior|menor)\))?\s*$/i);
    if (m) {
      const xVal = toNumber(tryEval(a));
      const rhs = Number(m[2]);
      if (xVal != null) {
        try {
          const lv = toNumber(math.evaluate(m[1], { x: math.bignumber(xVal) }));
          if (lv != null) return { ok: Math.abs(Math.abs(lv) - rhs) < 1e-9, computed: `|${lv}| vs ${rhs}`, kind: 'absolute_value' };
        } catch {}
      }
    }
  }
  // Distance between two points.
  const dst = question.match(DISTANCE_RE);
  if (dst) {
    const [, x1, y1, x2, y2] = dst.map(Number);
    const expected = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'distance' };
  }
  // Midpoint (component-specific).
  const mp = question.match(MIDPOINT_RE);
  if (mp) {
    const [, x1, y1, x2, y2, comp] = mp;
    const expected = comp.toLowerCase() === 'x' ? (Number(x1) + Number(x2)) / 2 : (Number(y1) + Number(y2)) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'midpoint' };
  }
  // Parallel line shares slope; perpendicular slope = -1/m.
  const pm = question.match(PARALLEL_M_RE);
  if (pm) {
    const expected = Number(pm[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'slope' };
  }
  const perp = question.match(PERP_M_RE);
  if (perp) {
    const m = Number(perp[1]);
    if (m !== 0) {
      const expected = -1 / m;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'slope' };
    }
  }
  if (HORIZ_M_RE.test(question)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 0, computed: '0', kind: 'slope' };
  }
  // y-intercept b given point and slope.
  const lb = question.match(LINE_B_RE);
  if (lb) {
    const px = lb[1] != null ? Number(lb[1]) : Number(lb[5]);
    const py = lb[2] != null ? Number(lb[2]) : Number(lb[6]);
    const m = lb[3] != null ? Number(lb[3]) : Number(lb[4]);
    const expected = py - m * px;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'line_b' };
  }
  // Amplitude of A·sen(x) or A·cos(x) → |A|.
  const amp = question.match(AMPLITUDE_RE);
  if (amp) {
    const evF = (s) => { const m = s.match(/^(-?\d+)\/(\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
    const expected = Math.abs(evF(amp[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'amplitude' };
  }
  // 'Amplitude de y=sen(x) / y=cos(x) = ?' (no coefficient) → 1.
  if (/^amplitude\s+de\s+(?:y\s*=\s*)?(?:sen|sin|cos)\(x\)\s*=\s*\??\s*$/i.test(question)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'amplitude' };
  }
  // Trig domain/range/period
  if (TRIG_DOMAIN_RE.test(question)) {
    return { ok: a.trim() === 'ℝ' || /\bR\b/.test(a) || a.trim().toLowerCase() === 'reais', computed: 'ℝ', kind: 'trig_meta' };
  }
  if (TRIG_RANGE_RE.test(question)) {
    return { ok: /\[-1\s*,\s*1\]/.test(a), computed: '[-1,1]', kind: 'trig_meta' };
  }
  if (TRIG_PERIOD_RE.test(question)) {
    // Extract numeric value from original answer (don't go through normalize/
    // tryEval which would convert '360°' to a Unit in radians).
    const m = String(answer).match(/(\d+(?:\.\d+)?)/);
    const an = m ? Number(m[1]) : null;
    if (an != null) return { ok: an === 360, computed: '360°', kind: 'trig_meta' };
  }
  // Law of sines: 'a=A, A=α°, B=β°, b = ?' → A·sin(β)/sin(α)
  const ls = question.match(LAW_SIN_B_RE);
  if (ls) {
    const A1 = Number(ls[1]), alpha = Number(ls[2]) * Math.PI / 180, beta = Number(ls[3]) * Math.PI / 180;
    if (Math.sin(alpha) !== 0) {
      const expected = A1 * Math.sin(beta) / Math.sin(alpha);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-3, computed: `${expected}`, kind: 'law_sin' };
    }
  }
  // Law of cosines c² (any angle C)
  const lc = question.match(LAW_COS_C2_RE);
  if (lc) {
    const A = Number(lc[1]), B = Number(lc[2]), theta = Number(lc[3]) * Math.PI / 180;
    const expected = A * A + B * B - 2 * A * B * Math.cos(theta);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-3, computed: `${expected}`, kind: 'law_cos' };
  }
  // Triangle area with two sides + included angle: AB·sin(C)/2.
  // For '— área = ?√3', the answer is the COEFFICIENT (so multiply by 2/√3).
  const tta = question.match(TRIG_TRI_AREA_RE);
  if (tta) {
    const A = Number(tta[1]), B = Number(tta[2]), theta = Number(tta[3]) * Math.PI / 180;
    const fullArea = A * B * Math.sin(theta) / 2;
    const expectsRoot3 = /\?√3/.test(question);
    const expected = expectsRoot3 ? fullArea / Math.sqrt(3) : fullArea;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-3, computed: `${expected}`, kind: 'tri_area_sas' };
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
  // '(a,b) ± (c,d) = (?, M)' or '(M, ?)' — solve for the unknown component.
  const vap = question.match(VEC_ADD_PARTIAL_RE);
  if (vap) {
    const op = vap[3] === '+' ? 1 : -1;
    const xExp = evalFrac(vap[1]) + op * evalFrac(vap[4]);
    const yExp = evalFrac(vap[2]) + op * evalFrac(vap[5]);
    const expected = vap[6] === '?' ? xExp : yExp;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'vec_partial' };
  }
  // '(a,b) ± (c,d) — componente x/y = ?'
  const vco = question.match(VEC_COMP_RE);
  if (vco) {
    const op = vco[3] === '+' ? 1 : -1;
    const expected = vco[6].toLowerCase() === 'x'
      ? evalFrac(vco[1]) + op * evalFrac(vco[4])
      : evalFrac(vco[2]) + op * evalFrac(vco[5]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'vec_partial' };
  }
  // 'Vetor de (a,b) a (c,d)' → (c-a, d-b)
  const vbt = question.match(VEC_BETWEEN_RE);
  if (vbt) {
    const [x1, y1, x2, y2] = [vbt[1], vbt[2], vbt[3], vbt[4]].map(evalFrac);
    const expected = [x2 - x1, y2 - y1];
    if (vbt[5] != null) {
      const ex = vbt[5] === '?' ? expected[0] : expected[1];
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - ex) < 1e-9, computed: `${ex}`, kind: 'vec_partial' };
    } else {
      const got = parseVec(answer);
      if (got) return { ok: Math.abs(got[0] - expected[0]) < 1e-9 && Math.abs(got[1] - expected[1]) < 1e-9, computed: `(${expected})`, kind: 'vec_sub' };
    }
  }
  // 30-60-90 triangle: 'Em 30-60-90 com x=N, hipotenusa = ?' → 2N
  // or 'lado de 60° = ?' → N√3
  const tri90 = q.match(TRI_30_60_90_RE);
  if (tri90) {
    const N = Number(tri90[1]);
    const isHyp = /hipotenusa/i.test(tri90[2]);
    if (isHyp) {
      const expected = 2 * N;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'tri_special' };
    } else {
      const expected = N * Math.sqrt(3);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'tri_special' };
    }
  }
  // Circumference: 'Comprimento da circunferência r=R = ?π' → 2R  (raw — '?π' is normalized away)
  const cr = question.match(CIRCUM_R_RE);
  if (cr) {
    const expected = 2 * Number(cr[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'circumference' };
  }
  const cd = question.match(CIRCUM_D_RE);
  if (cd) {
    const expected = Number(cd[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'circumference' };
  }
  // 'Se A = N·π, raio = ?' → sqrt(N) ; 'Se C = N·π, raio = ?' → N/2
  // Match against original — normalize converts π → pi.
  const cra = question.match(CIRCLE_RADIUS_AREA_RE) ||
    question.match(/^se\s+[áa]rea\s*=\s*(\d+(?:\.\d+)?)π\s*,\s*raio\s*=\s*\??\s*$/i);
  if (cra) {
    const expected = Math.sqrt(Number(cra[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'circle_radius' };
  }
  const crc = question.match(CIRCLE_RADIUS_C_RE);
  if (crc) {
    const expected = Number(crc[1]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'circle_radius' };
  }
  // 'x² + y² = N — raio = ?' → sqrt(N)
  const cer = q.match(CIRCLE_EQ_RADIUS_RE);
  if (cer) {
    const expected = Math.sqrt(Number(cer[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'circle_radius' };
  }
  // Polygon perimeter
  const SIDES_BY_NAME = { triângulo: 3, triangulo: 3, quadrado: 4, pentágono: 5, pentagono: 5, hexágono: 6, hexagono: 6, heptágono: 7, heptagono: 7, octógono: 8, octogono: 8 };
  const pp2 = q.match(POLY_PERIM_RE);
  if (pp2) {
    const word = q.toLowerCase().split(/\s+/)[0];
    const n = pp2[1] ? Number(pp2[1]) : SIDES_BY_NAME[word];
    const len = Number(pp2[2]);
    if (n) {
      const expected = n * len;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'poly_perim' };
    }
  }
  // 'Ângulo interno do <polygon> regular = ?°' → (n-2)*180/n
  const ia = q.match(POLY_INT_ANGLE_RE);
  if (ia) {
    const word = ia[1].toLowerCase().split(/\s+/)[0];
    const n = SIDES_BY_NAME[word];
    if (n) {
      const expected = ((n - 2) * 180) / n;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'poly_int_angle' };
    }
  }
  // 'Soma ângulos internos do <polygon> (n=N) = ?°' → (N-2)*180
  const sa = q.match(POLY_SUM_ANGLE_RE);
  if (sa) {
    const N = Number(sa[1]);
    const expected = (N - 2) * 180;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'poly_sum_angle' };
  }
  // 'Quadrado lado=N: área = ?' → N²
  const sqa = q.match(SQ_AREA_RE);
  if (sqa) {
    const N = Number(sqa[1]);
    const expected = N * N;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'square_area' };
  }
  // 'Hexágono regular lado=N: área = ?√3' → 3·L²/2 (coefficient of √3)
  const hxa = question.match(HEXAGON_AREA_RE);
  if (hxa) {
    const L = Number(hxa[1]);
    const expected = 3 * L * L / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'hex_area' };
  }
  // 'Triângulo equilátero lado=N: área = ?√3' → L²/4 (coefficient of √3)
  const eta = question.match(EQUI_TRI_AREA_RE);
  if (eta) {
    const L = Number(eta[1]);
    const expected = L * L / 4;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'equi_tri_area' };
  }
  // 'Área do triângulo equilátero lado=N = ?' → L²·√3/4 (full numeric)
  const etf = question.match(EQUI_TRI_FULL_RE);
  if (etf && !/\?√3\s*$/.test(question)) {
    const L = Number(etf[1]);
    const expected = L * L * Math.sqrt(3) / 4;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'equi_tri_area' };
  }
  // 'Quadrado lado=N — diagonal = ?√2' → N (match raw question — √ is normalized)
  const sqd = question.match(SQ_DIAG_RE);
  if (sqd) {
    const expected = Number(sqd[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'square_diag' };
  }
  // 'Se V=N, lado = ?' for a cube → N^(1/3)
  const cs = q.match(CUBE_SOLVE_RE);
  if (cs) {
    const expected = Math.cbrt(Number(cs[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'cube_solve' };
  }
  // Dash-form cone/cylinder/sphere ?π coefficient.
  const cylD = question.match(CYLINDER_VOL_DASH_RE);
  if (cylD) {
    const expected = Number(cylD[1]) ** 2 * Number(cylD[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'cylinder_vol' };
  }
  const coneD = question.match(CONE_VOL_DASH_RE);
  if (coneD) {
    const expected = Number(coneD[1]) ** 2 * Number(coneD[2]) / 3;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'cone_vol' };
  }
  const sphD = question.match(SPHERE_VOL_DASH_RE);
  if (sphD) {
    const expected = 4 * Number(sphD[1]) ** 3 / 3;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'sphere_vol' };
  }
  // 'Retângulo W×H — área = ?' → W*H
  const ra = q.match(RECT_AREA_RE);
  if (ra) {
    const expected = Number(ra[1]) * Number(ra[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'area_rect' };
  }
  // 'Quadrado lado N — perímetro = ?' → 4N
  const sp = q.match(SQUARE_PERIM_DASH_RE);
  if (sp) {
    const expected = 4 * Number(sp[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'poly_perim' };
  }
  // 'Triângulo b=B, h=H — área = ?' → B*H/2
  const tab = q.match(TRI_AREA_DASH_RE);
  if (tab) {
    const expected = Number(tab[1]) * Number(tab[2]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'triangle_area' };
  }
  // 'Trapézio B=N, b=N, h=N — área = ?' → (B+b)*h/2
  const trd = q.match(TRAPEZIUM_DASH_RE);
  if (trd) {
    const expected = (Number(trd[1]) + Number(trd[2])) * Number(trd[3]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'trapezium' };
  }
  // 'Trapézio com B=b=N e h=M (paralelogramo): A = ?' → 2N*M/2 = N*M
  const tsb = q.match(TRAPEZIUM_SAMEB_RE);
  if (tsb) {
    const expected = Number(tsb[1]) * Number(tsb[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'trapezium' };
  }
  // 'Pirâmide base BxB, h=H — V = ?' → B²·H/3
  const pyr = q.match(PYRAMID_VOL_RE);
  if (pyr) {
    const expected = Number(pyr[1]) * Number(pyr[2]) * Number(pyr[3]) / 3;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'box_vol' };
  }
  // 'Área do setor θ° com r=R = ?π' → R²·θ/360  (raw question — '°' is normalized away)
  const sec1 = question.match(SECTOR_AREA_RE);
  if (sec1) {
    const expected = Number(sec1[2]) ** 2 * Number(sec1[1]) / 360;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'circle_area' };
  }
  const sec2 = question.match(SECTOR_AREA_DASH_RE);
  if (sec2) {
    const expected = Number(sec2[2]) ** 2 * Number(sec2[1]) / 360;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'circle_area' };
  }
  // 'Arco de θ° com r=R = ?π' → R·θ/180
  const arc = question.match(ARC_LEN_RE);
  if (arc) {
    const expected = Number(arc[2]) * Number(arc[1]) / 180;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'circumference' };
  }
  // Central → inscribed: θ/2
  const ci = question.match(CENTRAL_INSCRIBED_RE);
  if (ci) {
    const expected = Number(ci[1]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'poly_int_angle' };
  }
  // Inscribed → arc: 2θ
  const ia2 = question.match(INSCRIBED_ARC_RE);
  if (ia2) {
    const expected = 2 * Number(ia2[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'poly_int_angle' };
  }
  // Constant facts.
  if (/^[âa]ngulo\s+inscrito\s+sobre\s+di[âa]metro\s*=\s*\?°?\s*$/i.test(q)) {
    const an = toNumber(tryEval(a));
    if (an === 90) return { ok: true, computed: '90', kind: 'poly_int_angle' };
    if (an != null) return { ok: false, computed: '90', kind: 'poly_int_angle' };
  }
  if (/^soma\s+dos\s+[âa]ngulos\s+internos\s+de\s+um\s+tri[âa]ngulo\s*=\s*\?°?\s*$/i.test(q)) {
    const an = toNumber(tryEval(a));
    if (an === 180) return { ok: true, computed: '180', kind: 'poly_sum_angle' };
    if (an != null) return { ok: false, computed: '180', kind: 'poly_sum_angle' };
  }
  // Slope between two points
  const slp = q.match(SLOPE_2POINTS_RE);
  if (slp) {
    const dx = Number(slp[3]) - Number(slp[1]);
    if (dx !== 0) {
      const expected = (Number(slp[4]) - Number(slp[2])) / dx;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'slope' };
    }
  }
  // Quadrado com apótema=N (= metade do lado): área = ?  → (2N)²
  const qap = q.match(QUADR_APOTHEM_RE);
  if (qap) {
    const expected = (2 * Number(qap[1])) ** 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'square_area' };
  }
  // Weighted mean (2 buckets)
  const wm2 = q.match(WEIGHTED_MEAN_2_RE);
  if (wm2) {
    const X = Number(wm2[1]), a1 = Number(wm2[2]), Y = Number(wm2[3]), b1 = Number(wm2[4]);
    if (a1 + b1 > 0) {
      const expected = (a1 * X + b1 * Y) / (a1 + b1);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
    }
  }
  // Weighted mean single bucket — answer is the value itself.
  const wm1 = q.match(WEIGHTED_MEAN_1_RE);
  if (wm1) {
    const expected = Number(wm1[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'stat' };
  }
  // Relative frequency
  const rf = q.match(REL_FREQ_RE) || q.match(REL_FREQ_SET_RE);
  if (rf) {
    const expected = Number(rf[2]) / Number(rf[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'rel_freq' };
  }
  // 'Quantos anagramas de WORD?' / 'Anagramas de WORD = ?'
  const anaH = question.match(ANAGRAM_HOW_MANY_RE) || question.match(ANAGRAM_PLAIN_RE);
  if (anaH) {
    const word = anaH[1];
    const counts = {};
    for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
    const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    let expected = fact(word.length);
    for (const k in counts) expected /= fact(counts[k]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'anagram' };
  }
  // Accented-word product-pair variant.
  const ppu = question.match(PRODUCT_PAIRS_UNI_RE);
  if (ppu && /(?:conjunto|combina|opç[õo])/i.test(question)) {
    const expected = Number(ppu[1]) * Number(ppu[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'pair_product' };
  }
  // z-score "tem z = ?" form
  const zsT = question.match(Z_SCORE_TEM_RE);
  if (zsT) {
    const M = Number(zsT[1]), S = Number(zsT[2]), X = Number(zsT[3]);
    if (S !== 0) {
      const expected = (X - M) / S;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'z_score' };
    }
  }
  // Sturges
  const stu = question.match(STURGES_RE);
  if (stu) {
    const expected = Math.round(1 + 3.3 * Math.log10(Number(stu[1])));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) <= 1, computed: `${expected}`, kind: 'stat' };
  }
  // Circle area '?π' — multiple phrasings.
  const cap = question.match(CIRCLE_AREA_PI_RE) || question.match(CIRCLE_AREA_DASH_PI_RE);
  if (cap) {
    const expected = Number(cap[1]) ** 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'circle_area' };
  }
  const cda = question.match(CIRCLE_DIAM_AREA_RE);
  if (cda) {
    const expected = (Number(cda[1]) / 2) ** 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'circle_area' };
  }
  // 'Cubo lado N — V = ?' → N³
  const cvD = q.match(CUBE_VOL_DASH_RE);
  if (cvD) {
    const expected = Number(cvD[1]) ** 3;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'cube_vol' };
  }
  // 'Centro (h,k) e r=R: (x-h)² + (y-k)² = ?' → R²
  const ccr = q.match(CIRCLE_EQ_CENTER_R_RE) || q.match(CIRCLE_EQ_R_RE);
  if (ccr) {
    const expected = Number(ccr[3]) ** 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'circle_radius' };
  }
  // '(x-h)²+(y-k)²=N — raio = ?' → sqrt(N)
  const cerd = question.match(CIRCLE_EQ_RAD_DASH_RE);
  if (cerd) {
    const expected = Math.sqrt(Number(cerd[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'circle_radius' };
  }
  // '(x-h)²+(y-k)²=N — centro = (h, ?)' → -sign·k
  const cep = question.match(CIRCLE_EQ_CENTER_PARTIAL_RE);
  if (cep) {
    // sign in regex captures '+' or '-'; centre offset is opposite sign.
    const k = (cep[3] === '+' ? -1 : 1) * Number(cep[4]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === k, computed: `${k}`, kind: 'circle_radius' };
  }
  // 'Volume do cone = ? do cilindro de mesmas dimensões' → 1/3 constant
  if (/^volume\s+do\s+cone\s*=\s*\?\s+do\s+cilindro/i.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - 1/3) < 1e-6, computed: '0.333', kind: 'cone_vol' };
  }
  // Pascal triangle row sum
  const plr = q.match(PASCAL_LINE_RE);
  if (plr) {
    const N = Number(plr[1]);
    const expected = /\(soma\)/i.test(q) ? 2 ** N : 1;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
  }
  // Urn 1st draw — verify only when the asked color matches the named bucket.
  const colorMap = { V: 'vermelh', A: 'azu', B: 'branc', P: 'pret' };
  const matchColor = (label, stem) => label.toLowerCase().startsWith(stem);
  const urn1c = question.match(URN_FIRST_COMPACT_RE);
  if (urn1c) {
    const [n1, c1, n2, c2, askedLabel] = [Number(urn1c[1]), urn1c[2], Number(urn1c[3]), urn1c[4], urn1c[5]];
    const cnt = matchColor(askedLabel, colorMap[c1]) ? n1 : matchColor(askedLabel, colorMap[c2]) ? n2 : null;
    if (cnt != null) {
      const expected = cnt / (n1 + n2);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'prob_value' };
    }
  }
  // Urn 1st draw long-form
  const urn1l = question.match(URN_FIRST_RE);
  if (urn1l) {
    const [n1, color1, n2, color2, asked] = [Number(urn1l[1]), urn1l[2], Number(urn1l[3]), urn1l[4], urn1l[5]];
    const cnt = color1.toLowerCase().startsWith(asked.toLowerCase().slice(0, 3)) ? n1
      : color2.toLowerCase().startsWith(asked.toLowerCase().slice(0, 3)) ? n2 : null;
    if (cnt != null) {
      const expected = cnt / (n1 + n2);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'prob_value' };
    }
  }
  // Urn 2nd given 1st — '(N-1) / (N+M-1)'
  const urn2 = question.match(URN_2ND_COND_RE);
  if (urn2) {
    const [n1, c1, n2, c2, askedC1, askedC2] = [Number(urn2[1]), urn2[2], Number(urn2[3]), urn2[4], urn2[5], urn2[6]];
    if (askedC1.toLowerCase() === askedC2.toLowerCase()) {
      const cnt = matchColor(askedC1, colorMap[c1]) ? n1 : matchColor(askedC1, colorMap[c2]) ? n2 : null;
      if (cnt != null) {
        const expected = (cnt - 1) / (n1 + n2 - 1);
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'cond_prob' };
      }
    }
  }
  // Urn both same color, no replacement
  const urnB = question.match(URN_BOTH_NOREP_RE);
  if (urnB) {
    const [n1, c1, n2, c2, asked] = [Number(urnB[1]), urnB[2], Number(urnB[3]), urnB[4], urnB[5]];
    const cnt = matchColor(asked, colorMap[c1]) ? n1 : matchColor(asked, colorMap[c2]) ? n2 : null;
    if (cnt != null && cnt >= 2) {
      const expected = cnt * (cnt - 1) / ((n1 + n2) * (n1 + n2 - 1));
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'cond_prob' };
    }
  }
  // 'P(A|B)=X, P(B)=Y → P(A∩B) = ?' → X·Y
  const ci2 = question.match(COND_INTER_RE);
  if (ci2) {
    const expected = Number(ci2[1]) * Number(ci2[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'cond_prob' };
  }
  // Bayes inverse: P(B|A) = P(A|B)·P(B)/P(A)
  const bay = question.match(BAYES_INV_RE);
  if (bay) {
    const Z = Number(bay[3]);
    if (Z !== 0) {
      const expected = Number(bay[1]) * Number(bay[2]) / Z;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'cond_prob' };
    }
  }
  // 'P(A)=X → P(Ā) = ?' → 1-X
  const ca = question.match(COMPL_ARROW_RE);
  if (ca) {
    const expected = 1 - Number(ca[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'prob_value' };
  }
  // Accumulated frequencies up to K-th bucket. Take the LAST list in the
  // question — when a "values" list appears too, the frequencies come after.
  if (/acumulada\s+at[ée]\s+\d+\s*=/.test(q)) {
    const lists = [...q.matchAll(/\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]/g)];
    const km = q.match(/acumulada\s+at[ée]\s+(\d+)/i);
    if (lists.length && km) {
      const arr = lists[lists.length - 1][1].split(/\s*,\s*/).map(Number);
      const K = Number(km[1]);
      if (K >= 1 && K <= arr.length) {
        const expected = arr.slice(0, K).reduce((s, v) => s + v, 0);
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'frequency' };
      }
    }
  }
  // Interval midpoint
  const im = q.match(INTERVAL_MID_RE);
  if (im) {
    const expected = (Number(im[1]) + Number(im[2])) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'interval_amp' };
  }
  // Uniform rel-freq → 1/N
  const urf = q.match(UNIFORM_REL_FREQ_RE);
  if (urf) {
    const expected = 1 / Number(urf[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'rel_freq' };
  }
  // 'P(A) + P(Ā) = ?' / 'Se P(A)+P(Ā) = ?, sempre' constants
  if (/^(?:se\s+)?P\(A\)\s*\+\s*P\(Ā\)\s*=\s*\??/.test(q)) {
    const an = toNumber(tryEval(a));
    if (an === 1) return { ok: true, computed: '1', kind: 'prob_value' };
    if (an != null) return { ok: false, computed: '1', kind: 'prob_value' };
  }
  // Trig equation FN(x) = V — return all solutions in [0°, 360°) (sorted).
  const trigSolveDeg = (fnRaw, rhsExpr) => {
    const fn = (fnRaw === 'sen' || fnRaw === 'sin') ? 'sin' : fnRaw === 'tg' ? 'tan' : fnRaw;
    let val;
    try { val = toNumber(math.evaluate(normalize(String(rhsExpr).trim()))); } catch { return null; }
    if (val == null) return null;
    const wrap = x => ((x % 360) + 360) % 360;
    let sols;
    if (fn === 'sin') {
      if (Math.abs(val) > 1) return null;
      const p = Math.asin(val) * 180 / Math.PI;
      sols = [wrap(p), wrap(180 - p)];
    } else if (fn === 'cos') {
      if (Math.abs(val) > 1) return null;
      const p = Math.acos(val) * 180 / Math.PI;
      sols = [wrap(p), wrap(-p)];
    } else if (fn === 'tan') {
      const p = Math.atan(val) * 180 / Math.PI;
      sols = [wrap(p), wrap(p + 180)];
    } else return null;
    // Round to 6 dp and dedupe.
    const seen = new Set();
    return sols.map(s => Math.round(s * 1e6) / 1e6).filter(s => !seen.has(s) && (seen.add(s), true)).sort((a, b) => a - b);
  };
  // Compare a numeric answer that might be in either deg (raw) or rad (SI-normalized) form.
  const matchDeg = (an, expectedDeg) => {
    if (an == null) return false;
    if (Math.abs(an - expectedDeg) < 1e-2) return true;
    return Math.abs(an - expectedDeg * Math.PI / 180) < 1e-3;
  };
  // Trig range filter: filter trigSolveDeg() output to [0, upper] inclusive.
  // If upper is a full period (≥360°) and 0 is a solution, include 360° as well —
  // matches author convention for "[0°, 360°]" (closed bracket) counting.
  const trigSolveRange = (fnRaw, rhsExpr, upper) => {
    const all = trigSolveDeg(fnRaw, rhsExpr);
    if (!all) return null;
    const within = all.filter(s => s <= upper + 1e-6);
    if (upper >= 360 - 1e-6 && all.includes(0)) within.push(360);
    return within;
  };
  // 'Em [0°, U°], número de soluções de FN(x) = V?'
  const tnRange = question.match(TRIG_NUM_IN_RANGE_RE);
  if (tnRange) {
    const sols = trigSolveRange(tnRange[2], tnRange[3], Number(tnRange[1]));
    if (sols) {
      const expected = sols.length;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'trig_meta' };
    }
  }
  const trRangeF = question.match(TRIG_RANGE_FIRST_RE);
  if (trRangeF) {
    const sols = trigSolveRange(trRangeF[2], trRangeF[3], Number(trRangeF[1]));
    if (sols && sols.length) {
      const expected = sols[0];
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
    }
  }
  const trRangeS = question.match(TRIG_RANGE_SECOND_RE);
  if (trRangeS) {
    const sols = trigSolveRange(trRangeS[2], trRangeS[3], Number(trRangeS[1]));
    if (sols && sols.length >= 2) {
      const expected = sols[1];
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
    }
  }
  const trQuantas = question.match(TRIG_QUANTAS_RE);
  if (trQuantas) {
    const sols = trigSolveDeg(trQuantas[1], trQuantas[2]);
    if (sols) {
      const expected = sols.length;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'trig_meta' };
    }
  }
  const trMenores = question.match(TRIG_MENORES_RE);
  if (trMenores) {
    const sols = trigSolveDeg(trMenores[1], trMenores[2]);
    if (sols && sols.length) {
      const expected = sols[0];
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
    }
  }
  const trigSolFirst = question.match(TRIG_SOL_FIRST_RE);
  if (trigSolFirst) {
    const sols = trigSolveDeg(trigSolFirst[1], trigSolFirst[2]);
    if (sols && sols.length) {
      const expected = sols[0];
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
    }
  }
  const trigSolSecond = question.match(TRIG_SOL_SECOND_RE);
  if (trigSolSecond) {
    const sols = trigSolveDeg(trigSolSecond[1], trigSolSecond[2]);
    if (sols && sols.length >= 2) {
      const expected = sols[1];
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
    }
  }
  const trigSolPlain = question.match(TRIG_SOL_PLAIN_RE);
  if (trigSolPlain) {
    const sols = trigSolveDeg(trigSolPlain[1], trigSolPlain[2]);
    if (sols && sols.length) {
      const expected = sols[0];
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
    }
  }
  const trigSolNum = question.match(TRIG_SOL_NUM_RE);
  if (trigSolNum && !/²|\^2/.test(trigSolNum[0])) {
    const coef = trigSolNum[1] ? Number(trigSolNum[1]) : 1;
    const rhs = `(${trigSolNum[3]})/${coef}`;
    const sols = trigSolveDeg(trigSolNum[2], rhs);
    if (sols) {
      const expected = sols.length;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'trig_meta' };
    }
  }
  const trigSolMenor = question.match(TRIG_SOL_MENOR_RE);
  if (trigSolMenor) {
    const coef = trigSolMenor[1] ? Number(trigSolMenor[1]) : 1;
    const rhs = `(${trigSolMenor[3]})/${coef}`;
    const sols = trigSolveDeg(trigSolMenor[2], rhs);
    if (sols && sols.length) {
      const expected = sols[0];
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
    }
  }
  // C(n,0) = 1, C(n,n) = 1, C(n,1) = n. Answer compared as numeric for 0/1 cases;
  // symbolic 'n' is matched as string.
  const ccst = q.match(C_CONST_RE);
  if (ccst) {
    const which = ccst[1].toLowerCase();
    if (which === '0' || which === 'n') {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === 1, computed: '1', kind: 'combine' };
    } else if (which === '1') {
      // 'C(n,1) = n' — answer must literally be the symbol 'n'
      const ok = String(a).trim().toLowerCase() === 'n';
      return { ok, computed: 'n', kind: 'combine' };
    }
  }
  // 'C(N,K) = C(N,?)' → N - K
  const csymP = question.match(C_SYMMETRY_PARTIAL_RE);
  if (csymP && csymP[1] === csymP[3]) {
    const expected = Number(csymP[1]) - Number(csymP[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
  }
  // Subconjuntos de N elementos = 2^N
  const sub = q.match(SUBSET_COUNT_RE);
  if (sub) {
    const expected = 2 ** Number(sub[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
  }
  // 'Soma dos coeficientes de (1+x)^N' = 2^N
  const psc = q.match(POLY_SUM_COEFFS_RE);
  if (psc) {
    const expected = 2 ** Number(psc[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
  }
  // 'k-ésima entrada da linha L (k=K)' → C(L,K)
  const pek = q.match(PASCAL_ENTRY_RE);
  if (pek) {
    const L = Number(pek[1]), K = Number(pek[2]);
    if (L >= K) {
      const f = (m) => { let r = 1; for (let i = 2; i <= m; i++) r *= i; return r; };
      const expected = f(L) / (f(K) * f(L - K));
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
    }
  }
  // 'Linha N: 1 a b ... ?' — last entry always 1
  if (PASCAL_LINE_LAST_RE.test(q) && /linha/i.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'combine' };
  }
  // 'Soma dos coeficientes da linha n = 2^?' → answer 'n' (symbolic)
  if (/^soma\s+dos\s+coeficientes\s+da\s+linha\s+n\s*=\s*2\s*\^\s*\??\s*$/i.test(q)) {
    const ok = String(a).trim().toLowerCase() === 'n';
    return { ok, computed: 'n', kind: 'combine' };
  }
  // cis(α°)·cis(β°) = cis(?°)
  const cisM = question.match(CIS_MULT_RE);
  if (cisM) {
    const expected = (Number(cisM[1]) + Number(cisM[2]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, ((expected % 360) + 360) % 360) || matchDeg(an, expected), computed: `${expected}°`, kind: 'complex_arg' };
  }
  const cisD = question.match(CIS_DIV_RE);
  if (cisD) {
    const expected = Number(cisD[1]) - Number(cisD[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, ((expected % 360) + 360) % 360) || matchDeg(an, expected), computed: `${expected}°`, kind: 'complex_arg' };
  }
  // PG term-list queries: extract terms, compute q / Sn / S∞.
  const pgTerms = (s) => {
    const cleaned = s.replace(/\.\.\.|…/g, '').replace(/[{}]/g, '').trim();
    const parts = cleaned.split(/\s*,\s*/).filter(Boolean);
    const nums = parts.map(p => {
      const f = p.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      if (f) return Number(f[1]) / Number(f[2]);
      return Number(p);
    }).filter(x => Number.isFinite(x));
    return nums;
  };
  const pgTermsM = question.match(PG_TERMS_RE);
  if (pgTermsM) {
    const nums = pgTerms(pgTermsM[1]);
    const opRaw = pgTermsM[2].toLowerCase().replace(/\s+/g, '');
    if (nums.length >= 2) {
      const q1 = nums[1] / nums[0];
      const an = toNumber(tryEval(a));
      let expected = null;
      if (opRaw === 'q') expected = q1;
      else if (/^s∞$/i.test(opRaw) || opRaw === 's∞') {
        if (Math.abs(q1) < 1) expected = nums[0] / (1 - q1);
      } else {
        // S<n>: parse trailing index (sub or plain digits).
        const subDigits = { '₀':0,'₁':1,'₂':2,'₃':3,'₄':4,'₅':5,'₆':6,'₇':7,'₈':8,'₉':9 };
        const idxStr = pgTermsM[2].replace(/[^₀-₉0-9_]/g, '').replace(/_/g, '');
        let n = 0;
        for (const ch of idxStr) n = n * 10 + (subDigits[ch] ?? Number(ch));
        if (n > 0) {
          if (Math.abs(q1 - 1) < 1e-9) expected = n * nums[0];
          else expected = nums[0] * (q1 ** n - 1) / (q1 - 1);
        }
      }
      if (expected != null && an != null) {
        return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'gp_term' };
      }
    }
  }
  // 'PG terms (q=N) — soma = ?' constant-PG case (q=1): N·count
  const pgSC = question.match(PG_TERMS_SOMA_RE);
  if (pgSC) {
    const nums = pgTerms(pgSC[1]);
    if (nums.length && nums.every(v => v === nums[0])) {
      const expected = nums[0] * nums.length;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'gp_term' };
    }
  }
  // PG com a₁=A, a₂=B, q = ? → B/A
  const pga = q.match(PG_A1A2_RE);
  if (pga) {
    const expected = Number(pga[2]) / Number(pga[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'pa_ratio' };
  }
  // 'Para n=N: ?' → N² for odd-numbers sum
  const osm = q.match(ODD_SUM_AT_N_RE);
  if (osm) {
    const N = Number(osm[1]);
    const expected = N * N;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'sum_formula' };
  }
  // Taylor R constants: e^x/sen/cos → ∞; ln(1+x)/1/(1-x) → 1.
  const taylorR = question.match(TAYLOR_R_RE) || question.match(TAYLOR_R_VARIANT_RE);
  if (taylorR) {
    const fn = taylorR[1].toLowerCase();
    const isInf = /^(e\^x|sen\(x\)|cos\(x\))$/.test(fn);
    const cleanA = String(a).trim().toLowerCase();
    if (isInf) {
      const ok = cleanA === '∞' || cleanA === 'infinito' || cleanA === 'inf' || cleanA === 'infty';
      return { ok, computed: '∞', kind: 'pg_converge' };
    } else {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === 1, computed: '1', kind: 'pg_converge' };
    }
  }
  // Right triangle with two of {CO, CA, H}.
  const rco = q.match(RIGHT_TRI_CO_CA_H_RE);
  if (rco) {
    const expected = Math.sqrt(Number(rco[1]) ** 2 + Number(rco[2]) ** 2);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'hypotenuse' };
  }
  const rct = question.match(RIGHT_TRI_CO_CA_TG_RE);
  if (rct) {
    const expected = Number(rct[1]) / Number(rct[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'trig_meta' };
  }
  const rcho = question.match(RIGHT_TRI_H_THETA_CO_RE);
  if (rcho) {
    const expected = Number(rcho[1]) * Math.sin(Number(rcho[2]) * Math.PI / 180);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'tri_special' };
  }
  const rchA = question.match(RIGHT_TRI_H_THETA_CA_RE);
  if (rchA) {
    const expected = Number(rchA[1]) * Math.cos(Number(rchA[2]) * Math.PI / 180);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'tri_special' };
  }
  const rcoH = q.match(RIGHT_TRI_CO_H_ANG_RE);
  if (rcoH) {
    const expected = Math.asin(Number(rcoH[1]) / Number(rcoH[2])) * 180 / Math.PI;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'tri_special' };
  }
  const rcoCA = q.match(RIGHT_TRI_CO_CA_ANG_RE);
  if (rcoCA) {
    const expected = Math.atan(Number(rcoCA[1]) / Number(rcoCA[2])) * 180 / Math.PI;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'tri_special' };
  }
  // Law of cosines: c = sqrt(a² + b² − 2ab cos C)
  const lcC = question.match(LAW_COS_C_RE);
  if (lcC) {
    const A = Number(lcC[1]), B = Number(lcC[2]), C = Number(lcC[3]);
    const expected = Math.sqrt(A * A + B * B - 2 * A * B * Math.cos(C * Math.PI / 180));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'law_cos' };
  }
  // cosC from sides (cosC only — see LAW_COS_FROM_SIDES_RE note)
  const lcs = q.match(LAW_COS_FROM_SIDES_RE);
  if (lcs) {
    const evalSide = (s) => /^sqrt\(/.test(s) ? Math.sqrt(Number(s.match(/\((\d+)\)/)[1])) : /^√/.test(s) ? Math.sqrt(Number(s.replace('√', ''))) : Number(s);
    const A = evalSide(lcs[1]), B = evalSide(lcs[2]), C = evalSide(lcs[3]);
    const expected = (A * A + B * B - C * C) / (2 * A * B);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'law_cos' };
  }
  // Triangle angle C from all sides
  const lca = q.match(LAW_COS_ANGLE_RE);
  if (lca) {
    const evalSide = (s) => /^sqrt\(/.test(s) ? Math.sqrt(Number(s.match(/\((\d+)\)/)[1])) : /^√/.test(s) ? Math.sqrt(Number(s.replace('√', ''))) : Number(s);
    const A = evalSide(lca[1]), B = evalSide(lca[2]), C = evalSide(lca[3]);
    const cosC = (A * A + B * B - C * C) / (2 * A * B);
    const expected = Math.acos(cosC) * 180 / Math.PI;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'law_cos' };
  }
  // a=b=c=N — angle = 60°
  if (EQUILAT_C_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, 60), computed: '60°', kind: 'law_cos' };
  }
  // 30-60-90 hypotenuse: 2·short
  const t30 = q.match(TRI_30_60_HYP_RE) || q.match(TRI_30_60_HYP_FROM_SHORT_RE);
  if (t30) {
    const expected = 2 * Number(t30[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'tri_special' };
  }
  // 30-60-90 long-leg coef of √3 = H/2
  const t30L = question.match(TRI_30_60_LONG_RE);
  if (t30L) {
    const expected = Number(t30L[1]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'tri_special' };
  }
  // 45-45-90 hypotenuse coef of √2 = leg
  const t45 = question.match(TRI_45_HYP_RE) || question.match(TRI_RIGHT_45_HYP_RE);
  if (t45) {
    const expected = Number(t45[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'tri_special' };
  }
  // Rotations 90/180/270 anti-clockwise of (a,b)
  const rot = question.match(ROT_ANTI_RE);
  if (rot) {
    const deg = Number(rot[1]), ax = Number(rot[2]), ay = Number(rot[3]), comp = rot[4].toLowerCase();
    let nx, ny;
    if (deg === 90) { nx = -ay; ny = ax; }
    else if (deg === 180) { nx = -ax; ny = -ay; }
    else { nx = ay; ny = -ax; }
    const expected = comp === 'x' ? nx : ny;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'reflect' };
  }
  // 'Retas perpendiculares têm produto dos coef. angulares = ?' → -1
  if (PARALLEL_PRODUCT_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === -1, computed: '-1', kind: 'slope' };
  }
  // 'Circunferência unitária tem raio = ?' → 1
  if (UNIT_CIRCLE_R_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'circle_radius' };
  }
  // 'Triângulo com A=α°, B=β°, C=?°' → 180-α-β  (raw — '°' is normalized to (N deg))
  const sumT = question.match(SUM_TRI_ANGLES_RE);
  if (sumT) {
    const expected = 180 - Number(sumT[1]) - Number(sumT[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'poly_sum_angle' };
  }
  // Law of sines: 'a=A, A=α°, B=β° — b = ?' → A·sin(β)/sin(α)  (raw)
  const lsd = question.match(LAW_SIN_B_DASH_RE);
  if (lsd) {
    const A = Number(lsd[1]), alpha = Number(lsd[2]) * Math.PI / 180, beta = Number(lsd[3]) * Math.PI / 180;
    if (Math.abs(Math.sin(alpha)) > 1e-9) {
      const expected = A * Math.sin(beta) / Math.sin(alpha);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'law_sin' };
    }
  }
  // Law of sines from given senA, senB
  const lsr = q.match(LAW_SIN_BY_RATIO_RE);
  if (lsr) {
    const A = Number(lsr[1]), sa = Number(lsr[2]), sb = Number(lsr[3]);
    if (sa !== 0) {
      const expected = A * sb / sa;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'law_sin' };
    }
  }
  // Triangle area 'a=A, b=B, C=45° — área = ?√2' → AB/4 (coefficient of √2)
  const ttp = question.match(TRIG_TRI_AREA_PI_RE);
  if (ttp) {
    const expected = Number(ttp[1]) * Number(ttp[2]) / 4;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'tri_area_sas' };
  }
  // 'Para p-série convergir, p > ?' → 1
  if (/^para\s+p[\-\s]?s[ée]rie\s+convergir\s*,?\s*p\s*[>≥]\s*\??/i.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'pg_converge' };
  }
  // Convergence-radius-of-1 constants — '|x| < ?' / '|x| ≥ ?' / 'x > ?' / 'x ∈ (-1, ?]' for ln(1+x)/1/(1-x)
  if (/^converge\s+para\s+\|x\|\s*<\s*\??\s*$/i.test(question) ||
      /^s[ée]rie\s+diverge\s+se\s+\|x\|\s*≥\s*\??\s*$/i.test(question) ||
      /^s[ée]rie\s+(?:log|ln)\(1\+x\)\s+n[ãa]o\s+converge\s+em\s+x\s*>\s*\??\s*$/i.test(q) ||
      /^(?:log|ln)\(1\+x\)\s+converge\s+em\s+x\s*∈\s*\(-1\s*,\s*\?\s*\]\s*$/i.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'pg_converge' };
  }
  // 'ln(1) = ?' → 0  (q normalized has 'log(1)')
  if (/^(?:log|ln)\(1\)\s*=\s*\??\s*$/i.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 0, computed: '0', kind: 'expression' };
  }
  // 'e ≈ ?' / 'Valor exato de ln(2) ≈ ?' / 'Valor real de e^0.1 ≈ ?'  — numeric constants
  const eConst = q.match(/^(?:e|valor\s+(?:exato|real)\s+de\s+(.+?))\s*≈?\s*\?\s*(?:\([^)]*\))?\s*$/i);
  if (eConst) {
    let target = eConst[1] ? eConst[1].trim() : 'e';
    target = target.replace(/\s*\(valor[^)]*\)\s*$/i, '').trim();
    try {
      const val = toNumber(math.evaluate(normalize(target)));
      const an = toNumber(tryEval(a));
      if (val != null && an != null) {
        return { ok: Math.abs(an - val) < 0.01, computed: `${val}`, kind: 'expression' };
      }
    } catch {}
  }
  // Reverse-order binomial coef: '(a+b)^N: coeficiente de a^i b^j = ?'
  const brev = q.match(BINOMIAL_REVERSE_RE);
  if (brev) {
    const N = Number(brev[1]);
    const i = brev[3] ? Number(brev[3]) : 1, j = brev[5] ? Number(brev[5]) : 1;
    if (i + j === N) {
      const f = (m) => { let r = 1; for (let k = 2; k <= m; k++) r *= k; return r; };
      const expected = f(N) / (f(i) * f(j));
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'binomial_coef' };
    }
  }
  // Em (a+b)^n, Tk = C(n,?)·a^p·b^q → answer is k-1 (T_{k+1} = C(n,k)·...).
  // q has '*' from normalize, regex allows both.
  const T_K_BINOM_NORM = /^Em\s+\(\s*[a-z]\s*\+\s*[a-z]\s*\)\s*\^\s*(\d+)\s*,\s*T(\d+)\s*=\s*C\(\s*\1\s*,\s*\?\s*\)\s*[·*]?\s*[a-z](?:\^?\d+)?\s*[·*]?\s*[a-z](?:\^?\d+)?\s*$/i;
  const tkb = q.match(T_K_BINOM_NORM);
  if (tkb) {
    const N = Number(tkb[1]), tIdx = Number(tkb[2]);
    const expected = tIdx - 1;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'binomial_coef' };
  }
  // 'Em (x+1)^n, coeficiente de x^k = C(n,?) = ...' → k
  const xck = q.match(X_COEFF_K_RE);
  if (xck) {
    const expected = Number(xck[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'binomial_coef' };
  }
  // Complex add/sub component extraction
  const sumOrSign = (sign, n) => sign === '-' ? -n : n;
  const cAR = question.match(COMPLEX_ADD_REAL_RE);
  if (cAR) {
    const expected = Number(cAR[1]) + Number(cAR[4]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'complex_part' };
  }
  const cAI = question.match(COMPLEX_ADD_IMAG_RE);
  if (cAI) {
    const imA = sumOrSign(cAI[2], cAI[3] === '' ? 1 : Number(cAI[3]));
    const imB = sumOrSign(cAI[5], cAI[6] === '' ? 1 : Number(cAI[6]));
    const expected = imA + imB;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'complex_part' };
  }
  const cSR = question.match(COMPLEX_SUB_REAL_RE);
  if (cSR) {
    const expected = Number(cSR[1]) - Number(cSR[4]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'complex_part' };
  }
  const cSI = question.match(COMPLEX_SUB_IMAG_RE);
  if (cSI) {
    const imA = sumOrSign(cSI[2], cSI[3] === '' ? 1 : Number(cSI[3]));
    const imB = sumOrSign(cSI[5], cSI[6] === '' ? 1 : Number(cSI[6]));
    const expected = imA - imB;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'complex_part' };
  }
  // Polar r from a+bi (cartesian magnitudes — supports √N for imag). Raw question
  // so √N isn't lowered to sqrt(N).
  const polR = question.match(POLAR_R_RE);
  if (polR) {
    const parseVal = (s) => /^√/.test(s) ? Math.sqrt(Number(s.replace('√', ''))) : /^sqrt\(/.test(s) ? Math.sqrt(Number(s.match(/\((\d+)\)/)[1])) : Number(s);
    const re = parseVal(polR[1]);
    const im = sumOrSign(polR[2], polR[3] ? parseVal(polR[3]) : 1);
    const expected = Math.sqrt(re * re + im * im);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'complex_mod' };
  }
  // 'r=R, θ=α° → real = ?' or ': a = ?'  (raw to keep °)
  const ptr = question.match(POLAR_TO_REAL_RE);
  if (ptr) {
    const parseR = (s) => /^√/.test(s) ? Math.sqrt(Number(s.replace('√', ''))) : /^sqrt\(/.test(s) ? Math.sqrt(Number(s.match(/\((\d+)\)/)[1])) : Number(s);
    const R = parseR(ptr[1]), theta = Number(ptr[2]) * Math.PI / 180;
    const expected = R * Math.cos(theta);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'complex_part' };
  }
  // 'r=R, θ=0° → z = ?' → R
  const ptz = question.match(POLAR_TO_Z_RE);
  if (ptz) {
    const R = /^√/.test(ptz[1]) ? Math.sqrt(Number(ptz[1].replace('√', ''))) : Number(ptz[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - R) < 1e-2, computed: `${R}`, kind: 'complex_part' };
  }
  // System solve helpers (raw question — '2x' normalize→'2*x' breaks literals)
  const sxy = question.match(SUM_X_PLUS_Y_RE);
  if (sxy) {
    const expected = Number(sxy[1]) + Number(sxy[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'sys_solve' };
  }
  const sdd = question.match(SIMPLE_DOUBLE_RE);
  if (sdd) {
    const expected = Number(sdd[1]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'sys_solve' };
  }
  const ssub = question.match(SYSTEM_SUBST_RE);
  if (ssub) {
    // x = 2y, x + y = N → 3y = N → y = N/3
    const expected = Number(ssub[1]) / 3;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'sys_solve' };
  }
  if (q.match(SYSTEM_SUM_DIFF_RE)) {
    const m = q.match(SYSTEM_SUM_DIFF_RE);
    const sumN = Number(m[1]), diff = Number(m[2]);
    const xVal = (sumN + diff) / 2, yVal = (sumN - diff) / 2;
    const expected = m[3].toLowerCase() === 'x' ? xVal : yVal;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'sys_solve' };
  }
  if (q.match(SYSTEM_XYZ_SAME_RE)) {
    const m = q.match(SYSTEM_XYZ_SAME_RE);
    const expected = Number(m[1]) / 3;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'sys_solve' };
  }
  // e^(iπ) = -1 (Euler's identity)
  if (/^e\^\(i\s*pi\)\s*=\s*\??\s*$/i.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === -1, computed: '-1', kind: 'complex_part' };
  }
  // E[X] linearity: 'E[X]=A → E[kX±c] = ?' → kA±c.
  const eL = q.match(E_LINEAR_RE);
  if (eL) {
    const EX = Number(eL[1]);
    const k = eL[2] ? Number(eL[2]) : 1;
    const c = eL[4] ? (eL[3] === '-' ? -1 : 1) * Number(eL[4]) : 0;
    const expected = k * EX + c;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'expected' };
  }
  // E[X+Y] = E[X] + E[Y]
  const eXY = q.match(E_X_PLUS_Y_RE);
  if (eXY) {
    const expected = Number(eXY[1]) + Number(eXY[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'expected' };
  }
  // Var(X) = E[X²] − (E[X])²
  const vfe = q.match(VAR_FROM_EX2_RE);
  if (vfe) {
    const EX = Number(vfe[1]), EX2 = Number(vfe[2]);
    const expected = EX2 - EX * EX;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'variance' };
  }
  // E[X²] = Var + (E[X])²
  const ex2v = q.match(EX2_FROM_VAR_RE);
  if (ex2v) {
    const EX = Number(ex2v[1]), V = Number(ex2v[2]);
    const expected = V + EX * EX;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'variance' };
  }
  // Bernoulli(p) → E[X] = p, E[X²] = p
  const bern = q.match(BERNOULLI_E_RE);
  if (bern) {
    const p = /^[\d.]+$/.test(bern[1]) ? Number(bern[1]) : null;
    if (p != null) {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - p) < 1e-6, computed: `${p}`, kind: 'bernoulli' };
    } else {
      // 'Bernoulli(p) → E[X] = ?' literal-symbol 'p' answer
      const ok = String(a).trim().toLowerCase() === 'p';
      return { ok, computed: 'p', kind: 'bernoulli' };
    }
  }
  // Σ=1 completion: '..., P(X=c)=? para Σ=1' → 1 − A − B  (parse fractions too)
  const psum1 = q.match(PROB_SUM_1_RE);
  if (psum1) {
    const parseN = (s) => { const m = s.match(/^(\d+)\/(\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
    const expected = 1 - parseN(psum1[1]) - parseN(psum1[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'prob_value' };
  }
  // 'X com P(X=a)=A, P(X=b)=B, P(X=c)=C → F(k) = ?' — special F-only form
  const probF = q.match(PROB_F_RE);
  if (probF) {
    const probs = {};
    probs[Number(probF[1])] = Number(probF[2]);
    probs[Number(probF[3])] = Number(probF[4]);
    probs[Number(probF[5])] = Number(probF[6]);
    const kVal = Number(probF[7]);
    let expected = 0;
    for (const v in probs) if (Number(v) <= kVal) expected += probs[v];
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'prob_value' };
  }
  // General-purpose form: '..., P(X=c)=C → P(X≥k|≠k|>k|<k|≤k) or F(k) = ?'
  const probEX = q.match(PROB_EXT_RE);
  if (probEX) {
    const probs = {};
    probs[Number(probEX[1])] = Number(probEX[2]);
    probs[Number(probEX[3])] = Number(probEX[4]);
    probs[Number(probEX[5])] = Number(probEX[6]);
    const op = probEX[7];
    const ke = op.match(/(\d+)/), kVal = Number(ke[1]);
    let expected = 0;
    if (op.startsWith('F')) {
      for (const v in probs) if (Number(v) <= kVal) expected += probs[v];
    } else if (op.startsWith('P(X≥')) {
      for (const v in probs) if (Number(v) >= kVal) expected += probs[v];
    } else if (op.startsWith('P(X≠')) {
      expected = 1 - (probs[kVal] || 0);
    } else if (op.startsWith('P(X>')) {
      for (const v in probs) if (Number(v) > kVal) expected += probs[v];
    } else if (op.startsWith('P(X<')) {
      for (const v in probs) if (Number(v) < kVal) expected += probs[v];
    } else if (op.startsWith('P(X≤')) {
      for (const v in probs) if (Number(v) <= kVal) expected += probs[v];
    }
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'prob_value' };
  }
  // Pascal sum: Soma dos coeficientes de (a+b)^N = 2^N
  const psg = q.match(POLY_SUM_GENERIC_RE);
  if (psg) {
    const expected = 2 ** Number(psg[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
  }
  // # of terms in (a+b)^N = N+1
  const pnt = q.match(POLY_NUM_TERMS_RE);
  if (pnt) {
    const expected = Number(pnt[1]) + 1;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
  }
  // Termo k=K de (x+1)^N — coeficiente = ? → C(N, K)
  const ptk = q.match(POLY_TERM_K_RE);
  if (ptk) {
    const K = Number(ptk[1]), N = Number(ptk[2]);
    if (K <= N) {
      const f = (m) => { let r = 1; for (let i = 2; i <= m; i++) r *= i; return r; };
      const expected = f(N) / (f(K) * f(N - K));
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'binomial_coef' };
    }
  }
  // Linha N - segundo coeficiente = N
  const ps2 = q.match(PASCAL_2ND_RE);
  if (ps2) {
    const expected = Number(ps2[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
  }
  // Linha N - coeficiente do meio = C(N, floor(N/2))
  const psm = q.match(PASCAL_MID_RE);
  if (psm) {
    const N = Number(psm[1]), K = Math.floor(N / 2);
    const f = (m) => { let r = 1; for (let i = 2; i <= m; i++) r *= i; return r; };
    const expected = f(N) / (f(K) * f(N - K));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
  }
  // Uniform {a..b} E[X] = (a+b)/2
  const ueU = q.match(UNIFORM_E_RE);
  if (ueU) {
    const expected = (Number(ueU[1]) + Number(ueU[2])) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'die_uniform' };
  }
  // Uniform {a..b} P(X op v)
  const upg = q.match(UNIFORM_PGT_RE);
  if (upg) {
    const a1 = Number(upg[1]), b1 = Number(upg[2]), op = upg[3], v = Number(upg[4]);
    const total = b1 - a1 + 1;
    let count = 0;
    for (let i = a1; i <= b1; i++) {
      if (op === '>' && i > v) count++;
      else if (op === '<' && i < v) count++;
      else if (op === '=' && i === v) count++;
      else if (op === '≥' && i >= v) count++;
      else if (op === '≤' && i <= v) count++;
    }
    const expected = count / total;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'die_uniform' };
  }
  // X ~ Uniforme{set} — P(X=v)
  const uset = q.match(UNIFORM_SET_PEQ_RE);
  if (uset) {
    const set = uset[1].split(/\s*,\s*/).map(Number);
    const v = Number(uset[2]);
    const expected = set.includes(v) ? 1 / set.length : 0;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'die_uniform' };
  }
  // Constants
  if (COIN_PX_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - 0.5) < 1e-9, computed: '0.5', kind: 'prob_value' };
  }
  if (FREQ_REL_SUM_RE.test(q) || ACCUM_REL_TO_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'rel_freq' };
  }
  if (DICE_PAR_OR_IMPAR_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'prob_value' };
  }
  if (DECK_SPACE_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 52, computed: '52', kind: 'prob_value' };
  }
  if (DICE_EVEN_RE.test(q) || DECK_RED_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - 0.5) < 1e-9, computed: '1/2', kind: 'prob_value' };
  }
  const dgt = q.match(DICE_GT_RE);
  if (dgt) {
    const v = Number(dgt[1]);
    const expected = (6 - v) / 6;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'prob_value' };
  }
  // Line slope from y = mx + b
  const lns = question.match(LINE_SLOPE_RE);
  if (lns) {
    const expected = Number(lns[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'slope' };
  }
  // y at x for y = mx + b
  const lya = question.match(LINE_YAT_RE);
  if (lya) {
    const m = lya[1] === '' || lya[1] == null ? 1 : Number(lya[1]);
    const b1 = (lya[2] === '-' ? -1 : 1) * Number(lya[3]);
    const x = Number(lya[4]);
    const expected = m * x + b1;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'y_at_x' };
  }
  // zero of y = mx + b
  const lz = question.match(LINE_ZERO_RE);
  if (lz) {
    const m = lz[1] === '' || lz[1] == null ? 1 : Number(lz[1]);
    const b1 = (lz[2] === '-' ? -1 : 1) * Number(lz[3]);
    if (m !== 0) {
      const expected = -b1 / m;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'y_at_x' };
    }
  }
  // Parallel lines (same slope)
  const lps = question.match(LINES_PARALLEL_RE);
  if (lps) {
    const expected = Number(lps[1]) === Number(lps[2]) ? 1 : 0;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'slope' };
  }
  // Slope product
  const spp = question.match(SLOPE_PRODUCT_RE);
  if (spp) {
    const parse = (s) => { const m = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
    const expected = parse(spp[1]) * parse(spp[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'slope' };
  }
  // Point-to-line distance |ax+by+c|/√(a²+b²)
  const pld = question.match(POINT_LINE_DIST_RE);
  if (pld) {
    const A = Number(pld[1]), bS = pld[2] === '-' ? -1 : 1, B = bS * Number(pld[3]);
    const cS = pld[4] === '-' ? -1 : 1, C = cS * Number(pld[5]);
    const x0 = Number(pld[6]), y0 = Number(pld[7]);
    const expected = Math.abs(A * x0 + B * y0 + C) / Math.sqrt(A * A + B * B);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'distance' };
  }
  const pldNC = question.match(POINT_LINE_DIST_NOCONST_RE);
  if (pldNC) {
    const A = Number(pldNC[1]), bS = pldNC[2] === '-' ? -1 : 1, B = bS * Number(pldNC[3]);
    const x0 = Number(pldNC[4]), y0 = Number(pldNC[5]);
    const expected = Math.abs(A * x0 + B * y0) / Math.sqrt(A * A + B * B);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'distance' };
  }
  // Midpoint dist to origin: √((x1+x2)²/4 + (y1+y2)²/4)
  const m2o = question.match(MID_TO_ORIG_RE);
  if (m2o) {
    const mx = (Number(m2o[1]) + Number(m2o[3])) / 2, my = (Number(m2o[2]) + Number(m2o[4])) / 2;
    const expected = Math.sqrt(mx * mx + my * my);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'distance' };
  }
  // y on line ax+by+c=0 at x = N: y = -(a·N+c)/b
  const pol = question.match(POINT_ON_LINE_RE);
  if (pol) {
    const A = Number(pol[1]), bS = pol[2] === '-' ? -1 : 1, B = bS * (pol[3] ? Number(pol[3]) : 1);
    const cS = pol[4] === '-' ? -1 : 1, C = cS * Number(pol[5]);
    const x = Number(pol[6]);
    if (B !== 0) {
      const expected = -(A * x + C) / B;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'y_at_x' };
    }
  }
  // Conic constants & eccentricity
  if (CONIC_CIRCLE_E_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 0, computed: '0', kind: 'circle_radius' };
  }
  const elE = q.match(ELLIPSE_E_RE) || q.match(HYPER_E_RE);
  if (elE) {
    const expected = Number(elE[2]) / Number(elE[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'circle_radius' };
  }
  const elC = q.match(ELLIPSE_C_FROM_AB_RE);
  if (elC) {
    const A = Number(elC[1]), B = Number(elC[2]);
    const expected = Math.sqrt(A * A - B * B);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'circle_radius' };
  }
  const ellipseCircle = q.match(ELLIPSE_IS_CIRCLE_RE);
  if (ellipseCircle) {
    const expected = Number(ellipseCircle[1]) === Number(ellipseCircle[2]) ? 1 : 0;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'circle_radius' };
  }
  const eqC2 = q.match(ELLIPSE_EQ_C2_RE);
  if (eqC2) {
    const A2 = Number(eqC2[1]), B2 = Number(eqC2[2]);
    const expected = Math.max(A2, B2) - Math.min(A2, B2);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'circle_radius' };
  }
  const eqC = q.match(ELLIPSE_EQ_C_RE);
  if (eqC) {
    const A2 = Number(eqC[1]), B2 = Number(eqC[2]);
    const expected = Math.sqrt(Math.abs(A2 - B2));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'circle_radius' };
  }
  const hC2 = q.match(HYPER_EQ_C2_RE);
  if (hC2) {
    const expected = Number(hC2[1]) + Number(hC2[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'circle_radius' };
  }
  const hC = q.match(HYPER_EQ_C_RE);
  if (hC) {
    const expected = Math.sqrt(Number(hC[1]) + Number(hC[2]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'circle_radius' };
  }
  const hAS = q.match(HYPER_ASYMPTOTE_RE);
  if (hAS) {
    const expected = Math.sqrt(Number(hAS[2])) / Math.sqrt(Number(hAS[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'slope' };
  }
  const cab = q.match(CONIC_AB_RE);
  if (cab) {
    const N = Number(cab[cab[4].toLowerCase() === 'a' ? 1 : 3]);
    const expected = Math.sqrt(N);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'circle_radius' };
  }
  const csem = q.match(CONIC_SEMI_RE);
  if (csem) {
    const A2 = Number(csem[1]), B2 = Number(csem[2]);
    const which = csem[3].toLowerCase() === 'maior' ? Math.max(A2, B2) : Math.min(A2, B2);
    const expected = Math.sqrt(which);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'circle_radius' };
  }
  const chp = q.match(CIRCLE_HAS_POINT_RE);
  if (chp) {
    const R2 = Number(chp[1]), x = Number(chp[2]), y = Number(chp[3]);
    const expected = Math.abs(x * x + y * y - R2) < 1e-9 ? 1 : 0;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'circle_radius' };
  }
  const pz = q.match(PARABOLA_ZEROS_RE);
  if (pz) {
    const expected = Math.sqrt(Number(pz[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'parabola_vertex' };
  }
  // Trig identities
  const csfs = q.match(COS_FROM_SIN_RE);
  if (csfs) {
    const c = Number(csfs[1]);
    if (Math.abs(c) <= 1) {
      const expected = Math.sqrt(1 - c * c);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'trig_meta' };
    }
  }
  const sfcs = q.match(SIN_FROM_COS_RE);
  if (sfcs) {
    const s = Number(sfcs[1]);
    const expected = 1 - s * s;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'trig_meta' };
  }
  const sfg = q.match(SEC_FROM_TG_RE);
  if (sfg) {
    const t = Number(sfg[1]);
    const expected = 1 + t * t;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'trig_meta' };
  }
  // Homothety scaling
  const hl = q.match(HOMOTHETY_LEN_RE);
  if (hl) {
    const expected = Number(hl[1]) * Number(hl[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'homothety' };
  }
  const haR = q.match(HOMOTHETY_AREA_RE);
  if (haR) {
    const expected = Number(haR[1]) ** 2 * Number(haR[2]) ** 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'homothety' };
  }
  // T(a,b) leva (0,0) para: x'/y'
  const tFO = question.match(T_FROM_ORIGIN_RE);
  if (tFO) {
    const expected = tFO[3].toLowerCase() === 'x' ? Number(tFO[1]) : Number(tFO[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'translate' };
  }
  // Undefined trig values
  const tud = q.match(TRIG_UNDEF_RE);
  if (tud) {
    const fn = tud[1].toLowerCase(), deg = Number(tud[2] ?? tud[3]);
    const rad = deg * Math.PI / 180;
    const v = fn === 'tan' ? Math.cos(rad) : fn === 'cot' ? Math.sin(rad) : fn === 'sec' ? Math.cos(rad) : Math.sin(rad);
    if (Math.abs(v) < 1e-9) {
      const ok = String(a).trim().toLowerCase() === 'indefinido' || String(a).trim().toLowerCase() === 'indefinida';
      return { ok, computed: 'indefinido', kind: 'trig_meta' };
    }
  }
  // Parity: sin → ímpar, cos → par, tan → ímpar
  const tpa = q.match(TRIG_PARITY_RE);
  if (tpa) {
    const fn = tpa[1].toLowerCase();
    const expected = fn === 'cos' ? 'par' : 'ímpar';
    return { ok: String(a).trim().toLowerCase() === expected, computed: expected, kind: 'trig_meta' };
  }
  // Max of sin(x): 90°
  if (TRIG_MAX_RE.test(q)) {
    const fn = q.match(TRIG_MAX_RE)[1].toLowerCase();
    if (fn === 'sin') {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, 90), computed: '90°', kind: 'trig_meta' };
    } else if (fn === 'cos') {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, 0), computed: '0°', kind: 'trig_meta' };
    }
  }
  // Period: sin/cos/sec/csc → 360°; tan/cot → 180°
  const tpd = q.match(TRIG_PERIOD_GENERIC_RE);
  if (tpd) {
    const fn = tpd[1].toLowerCase();
    const expected = (fn === 'tan' || fn === 'cot') ? 180 : 360;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
  }
  // Range: tan/cot → ℝ ; sec/csc → "(-∞,-1] ∪ [1,∞)"
  const trg = q.match(TRIG_RANGE_GENERIC_RE);
  if (trg) {
    const fn = trg[1].toLowerCase();
    if (fn === 'tan' || fn === 'cot') {
      const ok = String(a).trim().replace(/\s+/g, '') === 'ℝ' || String(a).trim().toLowerCase() === 'r';
      return { ok, computed: 'ℝ', kind: 'trig_meta' };
    }
    if (fn === 'sec' || fn === 'csc') {
      const norm = String(a).replace(/\s+/g, '');
      const ok = /^\(-∞,-1\]∪\[1,∞\)$/.test(norm) || /^\(-∞,-1\]u\[1,∞\)$/i.test(norm);
      return { ok, computed: '(-∞,-1] ∪ [1,∞)', kind: 'trig_meta' };
    }
  }
  // Próxima assíntota após 90° → 270° (tan asymptotes every 180°)
  const tna = q.match(TRIG_NEXT_ASYMP_RE);
  if (tna) {
    const expected = Number(tna[1] ?? tna[2]) + 180;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
  }
  // tan domain excludes 90° + ?·k → 180°
  if (TAN_DOMAIN_K_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, 180), computed: '180°', kind: 'trig_meta' };
  }
  // Half-angle: cos(x) = N/D (1st quadrant) → cos(x/2) = √((1+N/D)/2); sen(x/2) = √((1-N/D)/2)
  const half = q.match(HALF_ANGLE_Q1_RE);
  if (half) {
    const N = Number(half[1]), D = Number(half[2]);
    if (D !== 0) {
      const c = N / D;
      const v = half[3].toLowerCase() === 'cos' ? Math.sqrt((1 + c) / 2) : Math.sqrt((1 - c) / 2);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - v) < 1e-2, computed: `${v}`, kind: 'half_angle' };
    }
  }
  // 'Se tan(x)=N, tan(2x) numerador' → 2N; denominador → 1 - N²
  const parseTanIn = (s) => /^sqrt\(/.test(s) ? Math.sqrt(Number(s.match(/\((\d+)\)/)[1])) : Number(s);
  const t2n = q.match(TAN2_NUM_RE);
  if (t2n) {
    const N = parseTanIn(t2n[1]);
    const expected = 2 * N;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'tan_sum_part' };
  }
  const t2d = q.match(TAN2_DEN_RE);
  if (t2d) {
    const N = parseTanIn(t2d[1]);
    const expected = 1 - N * N;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'tan_sum_part' };
  }
  // 'Solução geral' k-multipliers (period of tan is 180°; sin/cos = 0 every 180°)
  if (GENERAL_K_TAN_RE.test(q) || GENERAL_K_SC_RE.test(q) || GENERAL_K_COS0_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, 180), computed: '180°', kind: 'trig_meta' };
  }
  // cos(x) = V: principal angle
  const gpm = q.match(GENERAL_PM_RE);
  if (gpm) {
    try {
      const v = toNumber(math.evaluate(normalize(gpm[1].trim())));
      if (v != null && Math.abs(v) <= 1) {
        const expected = Math.acos(v) * 180 / Math.PI;
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
      }
    } catch {}
  }
  // sin(x) = V: other angle = 180 - principal
  const gpa = q.match(GENERAL_PAIR_RE);
  if (gpa) {
    const principal = Number(gpa[2] ?? gpa[3]);
    const expected = 180 - principal;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'trig_meta' };
  }
  // a/sen(A) = b/sen(B) = c/sen(?) → C
  if (LAW_SIN_THIRD_RE.test(q)) {
    return { ok: String(a).trim().toUpperCase() === 'C', computed: 'C', kind: 'law_sin' };
  }
  // a/sen(A) = 2R → '2R' answer
  if (LAW_SIN_2R_RE.test(q)) {
    const an = String(a).trim().replace(/\s+/g, '').toUpperCase();
    return { ok: an === '2R', computed: '2R', kind: 'law_sin' };
  }
  if (LAW_SIN_CIRC_RE.test(q)) {
    return { ok: String(a).trim().toLowerCase() === 'circunscrita', computed: 'circunscrita', kind: 'law_sin' };
  }
  // Law of sines: c from a, A, C
  const lsCq = question.match(LAW_SIN_C_RE);
  if (lsCq) {
    const A = Number(lsCq[1]);
    const aDeg = Number(lsCq[2] ?? lsCq[3]);
    const cDeg = Number(lsCq[4] ?? lsCq[5]);
    if (Math.abs(Math.sin(aDeg * Math.PI / 180)) > 1e-9) {
      const expected = A * Math.sin(cDeg * Math.PI / 180) / Math.sin(aDeg * Math.PI / 180);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'law_sin' };
    }
  }
  // Acute angle from sin(B) = V
  const aaf = q.match(ACUTE_ANGLE_FROM_SIN_RE);
  if (aaf) {
    const V = Number(aaf[1]);
    if (Math.abs(V) <= 1) {
      const expected = Math.asin(V) * 180 / Math.PI;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'law_sin' };
    }
  }
  // sen²(x) + sen(x) = 0 → other root: -1 (factor sin·(sin+1)=0)
  if (QUAD_SIN_FACTOR_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === -1, computed: '-1', kind: 'trig_meta' };
  }
  // 2cos²(x) + cos(x) - 1 = 0 → cos(x) = 1/2 or -1 (Vieta: sum = -1/2, product = -1/2)
  if (QUAD_COS_OTHER_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === -1, computed: '-1', kind: 'trig_meta' };
  }
  // 2sen²(x) - 1 = 0 → sen²(x) = 1/2
  if (SIN2_HALF_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - 0.5) < 1e-9, computed: '1/2', kind: 'trig_meta' };
  }
  // sin(x) - cos(x) = 0 → tan(x) = 1
  if (SIN_MINUS_COS_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'trig_meta' };
  }
  // E[X] from explicit distribution
  const parseVals = (s) => s.split(/\s*,\s*/).map(p => { const m = p.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/); return m ? Number(m[1]) / Number(m[2]) : Number(p); }).filter(Number.isFinite);
  const deD = q.match(DIST_EXPECTED_RE);
  if (deD) {
    const xs = parseVals(deD[1]);
    const ps = parseVals(deD[2]);
    const wantsSquared = /E\[X\^?2\]/.test(deD[0]);
    if (xs.length === ps.length && xs.length) {
      const expected = xs.reduce((s, x, i) => s + (wantsSquared ? x * x : x) * ps[i], 0);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'expected' };
    }
  }
  // Uniform set E[X]
  const deU = q.match(DIST_EXPECTED_UNIF_RE);
  if (deU) {
    const xs = parseVals(deU[1]);
    if (xs.length) {
      const expected = xs.reduce((s, x) => s + x, 0) / xs.length;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'expected' };
    }
  }
  // X={a,b} com P=0.5 cada → E[X²]
  const de2 = q.match(DIST_EX2_PROB_RE);
  if (de2) {
    const xs = parseVals(de2[1]);
    const p = Number(de2[2]);
    if (xs.length) {
      const expected = xs.reduce((s, x) => s + x * x * p, 0);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'expected' };
    }
  }
  // Game E[X]
  const ge = q.match(GAME_EV_RE);
  if (ge) {
    const parseN = (s) => { const m = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
    const G = Number(ge[1]), p = parseN(ge[2]), L = Number(ge[3]), q2 = parseN(ge[4]);
    const expected = G * p - L * q2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'expected' };
  }
  // Game with safe outcome
  const ges = q.match(GAME_EV_SAFE_RE);
  if (ges) {
    const expected = Number(ges[1]) * Number(ges[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'expected' };
  }
  // Lottery profit
  const lot = q.match(LOTTERY_RE);
  if (lot) {
    const expected = Number(lot[1]) * Number(lot[2]) - Number(lot[3]) * (1 - Number(lot[2])) - Number(lot[3]) * Number(lot[2]);
    // Simpler: G*p - cost (paid always)
    const exp2 = Number(lot[1]) * Number(lot[2]) - Number(lot[3]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - exp2) < 1e-2, computed: `${exp2}`, kind: 'expected' };
  }
  // Insurance E[custo líquido] for customer = prêmio − paga·P (premium minus expected benefit).
  const ins = q.match(INSURANCE_RE);
  if (ins) {
    const expected = Number(ins[3]) - Number(ins[1]) * Number(ins[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'expected' };
  }
  // Variance scaling: Var(kX±c) = k²·Var(X); ignored shift c.
  const vScl = q.match(VAR_SCALE_RE);
  if (vScl) {
    const V = Number(vScl[1]);
    const k = vScl[2] ? Number(vScl[2]) : 1;
    const expected = k * k * V;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'variance' };
  }
  // σ(kX) = |k|·σ(X)
  const ss = q.match(SIGMA_SCALE_RE);
  if (ss) {
    const V = Number(ss[1]), k = Number(ss[2]);
    const expected = Math.abs(k) * Math.sqrt(V);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'variance' };
  }
  // Var(X+Y) when independent = Var(X)+Var(Y)
  const vsi = q.match(VAR_SUM_INDEP_RE);
  if (vsi) {
    const expected = Number(vsi[1]) + Number(vsi[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'variance' };
  }
  // CV = 100·s/x̄
  const cv = q.match(CV_RE);
  if (cv) {
    const expected = 100 * Number(cv[1]) / Number(cv[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
  }
  // {N,N,N,...} σ² or s² = 0
  if (VAR_CONST_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 0, computed: '0', kind: 'variance' };
  }
  // Indep arrow form
  const ipd = q.match(INDEP_PROB_DASH_RE);
  if (ipd) {
    const expected = Number(ipd[1]) * Number(ipd[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'indep_prob' };
  }
  // Union arrow form (no "Se")
  const uns = q.match(UNION_NO_SE_RE);
  if (uns) {
    const expected = Number(uns[1]) + Number(uns[2]) - Number(uns[3]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'prob_value' };
  }
  // E[-X] = -E[X]
  const en = q.match(E_NEG_RE);
  if (en) {
    const expected = -Number(en[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'expected' };
  }
  // P(par OU maior que K) em dado — 4 elements union
  const dpg = q.match(DICE_PAR_OR_GT_RE);
  if (dpg) {
    const K = Number(dpg[1]);
    const set = new Set();
    for (const v of [2, 4, 6]) set.add(v);
    for (let v = K + 1; v <= 6; v++) set.add(v);
    const expected = set.size / 6;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'prob_value' };
  }
  // System x+y=A {,e} x-y=B → x or y (flexible phrasing)
  const ssf = q.match(SYSTEM_SUM_DIFF_FLEX_RE);
  if (ssf) {
    const A = Number(ssf[1]), B = Number(ssf[2]);
    const xVal = (A + B) / 2, yVal = (A - B) / 2;
    const expected = ssf[3].toLowerCase() === 'x' ? xVal : yVal;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'sys_solve' };
  }
  // Line intercept: 'Reta y = mx + b — intercepto y = ?' → b (signed)
  const linInt = question.match(LINE_INTERCEPT_RE);
  if (linInt) {
    const sign = linInt[2] === '-' ? -1 : 1;
    const expected = sign * Number(linInt[3]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'line_b' };
  }
  // Line slope variant: 'Reta y = mx + b — coef. angular = ?'
  const linCA = question.match(LINE_COEF_ANG_RE);
  if (linCA) {
    const raw = linCA[1];
    const expected = raw == null || raw === '' ? 1 : raw === '-' ? -1 : Number(raw);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'slope' };
  }
  // 'Reta por (0,b) com m=N: y = ?x + b' → N
  const linTM = question.match(LINE_THROUGH_M_RE);
  if (linTM) {
    const expected = Number(linTM[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'slope' };
  }
  // Slope 'Para (a,b) e (c,d), m = ?'
  const spp2 = question.match(SLOPE_PARA_RE);
  if (spp2) {
    const dx = Number(spp2[3]) - Number(spp2[1]);
    if (dx !== 0) {
      const expected = (Number(spp2[4]) - Number(spp2[2])) / dx;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'slope' };
    }
  }
  // Matrix product dimension (raw answer to preserve '×')
  const mdp = q.match(MAT_DIM_PRODUCT_RE);
  if (mdp) {
    const rows = Number(mdp[1]), cols = Number(mdp[4]);
    const expected = `${rows}×${cols}`;
    const raw = String(answer).trim().replace(/x/i, '×').replace(/\*/g, '×');
    return { ok: raw === expected, computed: expected, kind: 'mat_op' };
  }
  // A · I = A (literal answer)
  if (MAT_A_TIMES_I_RE.test(q)) {
    const ok = String(a).trim().toUpperCase() === 'A';
    return { ok, computed: 'A', kind: 'mat_op' };
  }
  // k · A — string answers (0A=0, 1A=A, -1A=-A, others kA)
  const kA = question.match(MAT_K_TIMES_A_RE);
  if (kA) {
    const k = Number(kA[1]);
    const ansClean = String(a).trim().replace(/\s+/g, '');
    let expected = k === 0 ? '0' : k === 1 ? 'A' : k === -1 ? '-A' : `${k}A`;
    return { ok: ansClean === expected, computed: expected, kind: 'mat_op' };
  }
  // det of identity N×N = 1
  if (DET_ID_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'det_2x2' };
  }
  // det 2×2 of [a b; c d] = ad-bc (string)
  if (DET_2X2_GENERIC_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '');
    return { ok: ans === 'ad-bc' || ans === 'a*d-b*c', computed: 'ad-bc', kind: 'det_2x2' };
  }
  // cis(N°) = value
  const cdr = question.match(CIS_DEG_RE);
  if (cdr) {
    const deg = Number(cdr[1]);
    const wrapped = ((deg % 360) + 360) % 360;
    const known = { 0: '1', 90: 'i', 180: '-1', 270: '-i' };
    const expected = known[wrapped];
    if (expected) {
      const ok = String(a).trim().replace(/\s+/g, '') === expected;
      return { ok, computed: expected, kind: 'complex_part' };
    }
  }
  // Conjugate: a+bi → a-bi (literal string match)
  const cjr = question.match(CONJUGATE_RE);
  if (cjr) {
    const src = cjr[1];
    const conj = src.match(/^(-?\d+)([+\-])(\d*)i$/);
    let expected;
    if (conj) {
      // a±bi → a∓bi
      const a1 = conj[1], sign = conj[2] === '+' ? '-' : '+', b1 = conj[3] || '';
      expected = `${a1}${sign}${b1}i`;
    } else if (/^-?\d+$/.test(src)) {
      // real number → itself
      expected = src;
    } else if (/^(-?)(\d*)i$/.test(src)) {
      // pure imag: bi → -bi
      const m = src.match(/^(-?)(\d*)i$/);
      const sign = m[1] === '-' ? '' : '-';
      expected = `${sign}${m[2]}i`;
    }
    if (expected) {
      const ok = String(a).trim().replace(/\s+/g, '') === expected;
      return { ok, computed: expected, kind: 'complex_part' };
    }
  }
  // (1±i)² = ±2i  (q normalized: '²' → '^2' on adjacent base char)
  const csqi = q.match(COMPLEX_SQUARE_PM_I_RE);
  if (csqi) {
    const expected = csqi[1] === '+' ? '2i' : '-2i';
    const ok = String(a).trim().replace(/\s+/g, '') === expected;
    return { ok, computed: expected, kind: 'complex_part' };
  }
  // 1/cis(N°) = cis(-N°)
  const cinv = question.match(CIS_INV_RE);
  if (cinv) {
    const expected = -Number(cinv[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2 || matchDeg(an, ((expected % 360) + 360) % 360), computed: `${expected}°`, kind: 'complex_arg' };
  }
  // (A·cis α°)(B·cis β°) = (?·cis ...) → A·B
  const cmm = question.match(CIS_MUL_MAG_RE);
  if (cmm) {
    const expected = Number(cmm[1]) * Number(cmm[3]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'complex_mod' };
  }
  // (A·cis α°)/(B·cis β°) = ?·cis ... → A/B
  const cdvm = question.match(CIS_DIV_MAG_RE);
  if (cdvm) {
    const expected = Number(cdvm[1]) / Number(cdvm[3]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'complex_mod' };
  }
  // Polar θ from cartesian a+bi
  const polTh = question.match(POLAR_THETA_NUM_RE);
  if (polTh) {
    const parseVal = (s) => /^√/.test(s) ? Math.sqrt(Number(s.replace('√', ''))) : Number(s);
    const re2 = parseVal(polTh[1]);
    const im2 = (polTh[2] === '-' ? -1 : 1) * (polTh[3] ? parseVal(polTh[3]) : 1);
    let expected = Math.atan2(im2, re2) * 180 / Math.PI;
    if (expected < 0) expected += 360;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'complex_arg' };
  }
  // Polar of pure-imag z=i: θ = 90°
  if (/^Polar\s+de\s+z\s*=\s*i\s*:.*θ\s*=\s*\?°?\s*$/i.test(question)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, 90), computed: '90°', kind: 'complex_arg' };
  }
  // 1/cis(N°) at start of expression like 'X em polar: 1/cis(N°) = cis(?°)' — embedded
  const cinvEmb = question.match(/1\/cis\(?\s*(-?\d+(?:\.\d+)?)°?\)?\s*=\s*cis\(\s*\?°?\s*\)/i);
  if (cinvEmb) {
    const expected = -Number(cinvEmb[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, ((expected % 360) + 360) % 360) || Math.abs(an - expected) < 1e-2, computed: `${expected}°`, kind: 'complex_arg' };
  }
  // (a+b)^N = ... + ? → b^N (string)
  const blt = q.match(BINOM_LAST_TERM_RE);
  if (blt) {
    const N = Number(blt[2]);
    const expected = N === 1 ? 'b' : `b^${N}`;
    const ansClean = String(a).trim().replace(/\s+/g, '').replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4').replace(/⁵/g, '^5').replace(/⁶/g, '^6');
    return { ok: ansClean === expected, computed: expected, kind: 'identity_symbolic' };
  }
  // (a-b)² = a²-2ab+b² (string, hyphen variants)
  if (SQUARE_BINOM_FULL_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '').replace(/²/g, '^2');
    const ok = ans === 'a^2-2ab+b^2';
    return { ok, computed: 'a²-2ab+b²', kind: 'identity_symbolic' };
  }
  // z · z̄ = a² + b²
  if (Z_CONJ_PROD_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '').replace(/²/g, '^2');
    const ok = ans === 'a^2+b^2';
    return { ok, computed: 'a²+b²', kind: 'identity_symbolic' };
  }
  // Taylor series next-term completion
  if (SERIES_EX_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '').replace(/³/g, '^3');
    return { ok: ans === 'x^3/3!', computed: 'x³/3!', kind: 'identity_symbolic' };
  }
  if (SERIES_SIN_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '').replace(/³/g, '^3');
    return { ok: ans === 'x^3/3!', computed: 'x³/3!', kind: 'identity_symbolic' };
  }
  if (SERIES_SIN_NEXT_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '').replace(/⁷/g, '^7');
    return { ok: ans === 'x^7/7!', computed: 'x⁷/7!', kind: 'identity_symbolic' };
  }
  if (SERIES_COS_NEXT_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '').replace(/⁶/g, '^6');
    return { ok: ans === 'x^6/6!', computed: 'x⁶/6!', kind: 'identity_symbolic' };
  }
  if (SERIES_LN_NEXT_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '').replace(/⁴/g, '^4');
    return { ok: ans === 'x^4/4', computed: 'x⁴/4', kind: 'identity_symbolic' };
  }
  if (SERIES_GEO_NEXT_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '').replace(/³/g, '^3');
    return { ok: ans === 'x^3' || ans === 'x³', computed: 'x³', kind: 'identity_symbolic' };
  }
  // 1/(1-1) é definido? → não
  if (ONE_OVER_ZERO_RE.test(q)) {
    return { ok: String(a).trim().toLowerCase() === 'não' || String(a).trim().toLowerCase() === 'nao', computed: 'não', kind: 'identity_symbolic' };
  }
  // Aproximação linear: f(0) + f'(0)·? → x
  if (LINEAR_APPROX_RE.test(q)) {
    return { ok: String(a).trim().toLowerCase() === 'x', computed: 'x', kind: 'identity_symbolic' };
  }
  // Taylor coef denominator → n!
  if (TAYLOR_COEF_DENOM_RE.test(q)) {
    const ans = String(a).trim().replace(/\s+/g, '');
    return { ok: ans === 'n!', computed: 'n!', kind: 'identity_symbolic' };
  }
  // Duas primeiras parcelas de sen(N) = N - N³/6 → N - N³/6
  const s2p = q.match(SEN_2PARCELS_RE);
  if (s2p) {
    const N1 = Number(s2p[2]), N2 = Number(s2p[3]), p = Number(s2p[4]), d = Number(s2p[5]);
    const expected = N1 - Math.pow(N2, p) / d;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-3, computed: `${expected}`, kind: 'expression' };
  }
  // e^N partial Taylor sum (first K terms)
  const exP = q.match(E_X_PARTIAL_RE);
  if (exP) {
    const N = Number(exP[1]), K = Number(exP[2]);
    let expected = 0, fact = 1;
    for (let i = 0; i < K; i++) {
      if (i > 0) fact *= i;
      expected += Math.pow(N, i) / fact;
    }
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'expression' };
  }
  // cos(N) partial Taylor (first K terms)
  const cosP = q.match(COS_X_PARTIAL_RE);
  if (cosP) {
    const N = Number(cosP[1]), K = Number(cosP[2]);
    let expected = 0, fact = 1, sign = 1;
    for (let i = 0; i < K; i++) {
      const exp2 = 2 * i;
      if (exp2 > 0) for (let j = 1; j <= exp2; j++) fact = (i === 0 || j > 2 * (i - 1)) ? fact * j : fact;
      // Simpler: recompute fact each time
    }
    fact = 1;
    expected = 0;
    for (let i = 0; i < K; i++) {
      let f = 1; for (let j = 2; j <= 2 * i; j++) f *= j;
      expected += ((i % 2 === 0) ? 1 : -1) * Math.pow(N, 2 * i) / f;
    }
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'expression' };
  }
  // e^x at x=N partial sum
  const exAt = q.match(EX_AT_X_PARTIAL_RE);
  if (exAt) {
    const N = Number(exAt[1]), K = Number(exAt[2]);
    let expected = 0, fact = 1;
    for (let i = 0; i < K; i++) {
      if (i > 0) fact *= i;
      expected += Math.pow(N, i) / fact;
    }
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'expression' };
  }
  // PG sum formula
  const pgs = q.match(PG_S_FORMULA_RE);
  if (pgs) {
    const a1 = Number(pgs[1]), qv = Number(pgs[2]), N = Number(pgs[3]);
    if (N > 0) {
      const expected = Math.abs(qv - 1) < 1e-9 ? N * a1 : a1 * (Math.pow(qv, N) - 1) / (qv - 1);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'gp_term' };
    }
  }
  // PA word problems: step/savings growing arithmetic
  const pas = question.match(PA_STEPS_RE);
  if (pas) {
    const expected = Number(pas[2]) + Number(pas[1]) * (Number(pas[3]) - 1);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'ap_term' };
  }
  const pav = question.match(PA_SAVINGS_RE);
  if (pav) {
    const expected = Number(pav[1]) + Number(pav[2]) * (Number(pav[3]) - 1);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'ap_term' };
  }
  // 'Em (a+b)^n, T_k = ... = M·...^p·...^q. Coeficiente = ?' → M (extract the number after '=')
  const tkc = q.match(TK_COEF_RE);
  if (tkc) {
    const expected = Number(tkc[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'binomial_coef' };
  }
  // 'Em (c+x)^n, T_k = C(n,k)·c^p·x^q = ? · x^q' → C(n,k)·c^p
  const tkf = q.match(TK_FACTOR_RE);
  if (tkf) {
    const c = Number(tkf[1]), N = Number(tkf[2]), K = Number(tkf[4]), p = Number(tkf[5]);
    const f = (m) => { let r = 1; for (let i = 2; i <= m; i++) r *= i; return r; };
    const expected = f(N) / (f(K) * f(N - K)) * Math.pow(c, p);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'binomial_coef' };
  }
  // Linha 0 do Triângulo: (1 1/1) → 1
  if (PASCAL_LINE_0_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'combine' };
  }
  // Binomial Bin(n,p) — E[X], Var(X), σ, P(X=k), P(X≥k), sum
  const bnm = q.match(BIN_RE);
  if (bnm) {
    const n = Number(bnm[1]), p = Number(bnm[2]);
    const op = bnm[3].toLowerCase();
    const f = (x) => { let r = 1; for (let i = 2; i <= x; i++) r *= i; return r; };
    const pmf = (k) => f(n) / (f(k) * f(n - k)) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    let expected = null;
    let m;
    if ((m = op.match(/^p\(x\s*=\s*(\d+)\)/))) {
      const k = Number(m[1]);
      if (k <= n) expected = pmf(k);
    } else if ((m = op.match(/^p\(x\s*≥\s*(\d+)\)/))) {
      const k = Number(m[1]);
      if (k <= n) { expected = 0; for (let i = k; i <= n; i++) expected += pmf(i); }
    } else if ((m = op.match(/^p\(x\s*≤\s*(\d+)\)/))) {
      const k = Number(m[1]);
      if (k <= n) { expected = 0; for (let i = 0; i <= k; i++) expected += pmf(i); }
    } else if (/^soma\s+p\(x/.test(op)) {
      expected = 1;
    } else if (/var\(x\)/.test(op)) {
      expected = n * p * (1 - p);
    } else if (/(?:^|\s)σ(?:$|\s|=)/.test(op) || /(?:^|\s)s(?:$|\s|=)/.test(op)) {
      expected = Math.sqrt(n * p * (1 - p));
    } else if (/e\[x\]/.test(op)) {
      expected = n * p;
    }
    if (expected != null) {
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'bernoulli' };
    }
  }
  // 'N peças P(def)=p — {E[defeituosas]|Var(X)|σ}'
  const bnp = q.match(BIN_PIECES_RE);
  if (bnp) {
    const n = Number(bnp[1]), p = Number(bnp[2]);
    const lower = q.toLowerCase();
    let expected;
    if (/var\(x\)/i.test(lower)) expected = n * p * (1 - p);
    else if (/σ/.test(q)) expected = Math.sqrt(n * p * (1 - p));
    else expected = n * p;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'bernoulli' };
  }
  // σ from σ² → √N
  const sfs = q.match(SIGMA_FROM_SQ_RE);
  if (sfs) {
    const expected = Math.sqrt(Number(sfs[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stddev' };
  }
  const sfvl = q.match(SIGMA_FROM_VAR_LIST_RE);
  if (sfvl) {
    const expected = Math.sqrt(Number(sfvl[1]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stddev' };
  }
  // Sample variance: 'x̄=N; s²/σ² = [expr] = ?'
  const svf = q.match(SAMPLE_VAR_FORMULA_RE);
  if (svf) {
    try {
      // Strip leading/trailing brackets that may remain, eval the inner expression.
      let expr = svf[1].replace(/\s+/g, '');
      // Remove enclosing brackets if present.
      while (expr.startsWith('[') && expr.endsWith(']')) expr = expr.slice(1, -1);
      // The formula may already be the numerator; check if it ends with /(n-1) etc.
      const trailMatch = q.match(/\]\s*\/\s*\((\d+)\)\s*=/);
      const divisor = trailMatch ? Number(trailMatch[1]) : (q.match(/\]\s*\/\s*(\d+)\s*=/) ? Number(q.match(/\]\s*\/\s*(\d+)\s*=/)[1]) : null);
      const num = toNumber(math.evaluate(expr));
      if (num != null) {
        const expected = divisor ? num / divisor : num;
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'variance' };
      }
    } catch {}
  }
  // IC midpoint
  const ic = q.match(IC_CENTER_RE);
  if (ic) {
    const expected = (Number(ic[1]) + Number(ic[2])) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
  }
  const icp = q.match(IC_PCT_RE);
  if (icp) {
    const expected = Number(icp[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'stat' };
  }
  // Dobrar ME → fator = 0.25
  if (DOUBLE_ME_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - 0.25) < 1e-9, computed: '0.25', kind: 'stat' };
  }
  // Senhas de K dígitos distintos usando {set} → P(|set|, K)
  const pwd = q.match(PASSWORD_DISTINCT_RE);
  if (pwd) {
    const K = Number(pwd[1]);
    const setSize = pwd[2].split(/\s*,\s*/).length;
    if (setSize >= K) {
      let expected = 1;
      for (let i = 0; i < K; i++) expected *= (setSize - i);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'arrange' };
    }
  }
  // A(n,k)/C(n,k) = k! (literal)
  if (A_OVER_C_RE.test(q)) {
    return { ok: String(a).trim().replace(/\s+/g, '') === 'k!', computed: 'k!', kind: 'identity_symbolic' };
  }
  // Cateto N, hipotenusa = N√2 (literal)
  const cathH = q.match(CATHETUS_HYP_RE);
  if (cathH) {
    const N = Number(cathH[1]);
    const expected = N === 1 ? '√2' : `${N}√2`;
    const ansClean = String(answer).trim().replace(/\s+/g, '');
    return { ok: ansClean === expected, computed: expected, kind: 'tri_special' };
  }
  // Hipotenusa √N, catetos = ?  → √(N/2)  (raw — √ stays)
  const hypC = question.match(HYP_TO_CATHETI_RE);
  if (hypC) {
    const N = Number(hypC[1]);
    const expected = Math.sqrt(N / 2);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'tri_special' };
  }
  // Equilateral triangle area: L²/4 coefficient of √3
  const eqArea = question.match(EQ_TRI_AREA_DASH_RE);
  if (eqArea) {
    const L = Number(eqArea[1]);
    const expected = L * L / 4;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'equi_tri_area' };
  }
  // Equilateral circumradius R = L/√3 = L√3/3 (numeric or literal '2√3' for L=6)
  const eqR = q.match(EQ_TRI_CIRC_R_RE);
  if (eqR) {
    const L = Number(eqR[1]);
    const expected = L / Math.sqrt(3);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'tri_special' };
  }
  // Hexagon R = side
  const hexR = q.match(HEX_CIRC_R_RE);
  if (hexR) {
    const expected = Number(hexR[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'tri_special' };
  }
  // Hexagon inradius coef of √3 = side/2
  const hexIn = question.match(HEX_INRADIUS_RE);
  if (hexIn) {
    const expected = Number(hexIn[1]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'hex_area' };
  }
  // Square circumradius coef of √2 = side/2
  const sqC = question.match(SQUARE_CIRC_R_RE);
  if (sqC) {
    const expected = Number(sqC[1]) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'square_diag' };
  }
  // Square from R=N√2/2: side = N
  const sqF = question.match(SQUARE_FROM_R_RE);
  if (sqF) {
    const expected = Number(sqF[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'square_area' };
  }
  // Equilateral area full numeric: L²·√3/4
  const eqFull = q.match(EQ_TRI_AREA_DASH_FULL_RE);
  if (eqFull) {
    const L = Number(eqFull[1]);
    const expected = L * L * Math.sqrt(3) / 4;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'equi_tri_area' };
  }
  // 'Reta por (a,b) e (c,d): m = ?' → slope
  const slpL = question.match(SLOPE_FROM_LINE_THROUGH_RE);
  if (slpL) {
    const dx = Number(slpL[3]) - Number(slpL[1]);
    if (dx !== 0) {
      const expected = (Number(slpL[4]) - Number(slpL[2])) / dx;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'slope' };
    }
  }
  // '(x-h)²+(y-k)² = N — centro = ?' → (h, -k) literal
  const ceL = q.match(CIRCLE_EQ_CENTER_LIT_RE);
  if (ceL) {
    const h = (ceL[1] === '+' ? -1 : 1) * Number(ceL[2]);
    const k = (ceL[3] === '+' ? -1 : 1) * Number(ceL[4]);
    const expected = `(${h}, ${k})`;
    const ansClean = String(answer).trim().replace(/\s+/g, '');
    return { ok: ansClean === expected.replace(/\s/g, ''), computed: expected, kind: 'circle_radius' };
  }
  // cosC numerator: a²+b²-c²
  const csn = q.match(COSC_NUMER_RE);
  if (csn) {
    const A = Number(csn[1]), B = Number(csn[2]), C = Number(csn[3]);
    const expected = A * A + B * B - C * C;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'law_cos' };
  }
  // Isoceles: a=A, A=α°, b=A → B=α
  const iso = question.match(ISOCELES_B_RE);
  if (iso) {
    const expected = Number(iso[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: matchDeg(an, expected), computed: `${expected}°`, kind: 'law_sin' };
  }
  // a=b=c (equilátero, a=N): c² = N²
  const eqCsq = q.match(EQUILAT_CSQ_RE);
  if (eqCsq) {
    const expected = Math.pow(Number(eqCsq[1]), 2);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'law_cos' };
  }
  // Double reflection x→x or y→y: returns original
  const refD = question.match(REFLECT_DOUBLE_RE);
  if (refD) {
    const px = Number(refD[2]), py = Number(refD[3]);
    const expected = refD[4].toLowerCase() === 'x' ? px : py;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'reflect' };
  }
  // T(a,b) then T(-a,-b) cancels — returns original
  const tCan = question.match(T_CANCEL_RE);
  if (tCan) {
    const a1 = Number(tCan[1]), b1 = Number(tCan[2]), c1 = Number(tCan[3]), d1 = Number(tCan[4]);
    if (a1 + c1 === 0 && b1 + d1 === 0) {
      const px = Number(tCan[5]), py = Number(tCan[6]);
      const expected = tCan[7].toLowerCase() === 'x' ? px : py;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'translate' };
    }
  }
  // Homotetia k de P, seguida T(c,d): (k·px+c, k·py+d)
  const hmT = question.match(HOM_TRANSLATE_RE);
  if (hmT) {
    const k = Number(hmT[1]), px = Number(hmT[2]), py = Number(hmT[3]);
    const dx = Number(hmT[4]), dy = Number(hmT[5]);
    const expected = hmT[6].toLowerCase() === 'x' ? k * px + dx : k * py + dy;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'homothety' };
  }
  // Distance between parallel y=x+a, y=x-b: |a+b|/√2 — coef of /√2 = a+b
  const pdL = question.match(PARALLEL_DIST_RE);
  if (pdL) {
    const expected = Math.abs(Number(pdL[1]) + Number(pdL[2]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'distance' };
  }
  // 'Reta x-y±c=0; ponto (x0,y0): d = ?√2' → |x0-y0±c|/2
  const xyd = question.match(X_MINUS_Y_DIST_RE);
  if (xyd) {
    const c = (xyd[1] === '-' ? -1 : 1) * Number(xyd[2]);
    const x0 = Number(xyd[3]), y0 = Number(xyd[4]);
    const expected = Math.abs(x0 - y0 + c) / 2;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'distance' };
  }
  // Sample variance formula extraction: '{set} — μ=N; σ² = [expr]/D = ?'
  const svfL = q.match(SAMPLE_VAR_FULL_RE);
  if (svfL) {
    try {
      // Find structure: 'expr_or_[expr] / D' or just 'expr_or_[expr]'.
      let body = svfL[1];
      let divisor = null;
      const divMatch = body.match(/^(.+)\/\(?\s*(\d+(?:\.\d+)?(?:\s*-\s*\d+)?)\s*\)?\s*$/);
      if (divMatch) {
        body = divMatch[1].trim();
        const dStr = divMatch[2];
        divisor = /-/.test(dStr) ? eval(dStr) : Number(dStr);
      }
      // Strip outer brackets if present
      body = body.trim();
      while (body.startsWith('[') && body.endsWith(']')) body = body.slice(1, -1);
      const num = toNumber(math.evaluate(body));
      if (num != null) {
        const expected = divisor != null ? num / divisor : num;
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'variance' };
      }
    } catch {}
  }
  // SE = σ/√n
  const sef = q.match(SE_FORMULA_RE);
  if (sef) {
    const expected = Number(sef[1]) / Math.sqrt(Number(sef[2]));
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
  }
  // n from σ, ME, z = (z·σ/ME)²
  const nfm = q.match(N_FROM_ME_RE);
  if (nfm) {
    const sig = Number(nfm[1]), ME = Number(nfm[2]), z = Number(nfm[3]);
    if (ME !== 0) {
      const expected = Math.pow(z * sig / ME, 2);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
    }
  }
  // IC = [x̄-ME, x̄+ME]
  const icr = q.match(IC_RIGHT_RE);
  if (icr) {
    const expected = Number(icr[1]) + Number(icr[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
  }
  const icL = q.match(IC_LOWER_RE);
  if (icL) {
    const expected = Number(icL[1]) - 1.96 * Number(icL[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
  }
  const icU = q.match(IC_UPPER_RE);
  if (icU) {
    const expected = Number(icU[1]) + 1.96 * Number(icU[2]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
  }
  const icCh = q.match(IC_INF_CHAIN_RE);
  if (icCh) {
    const SE = Number(icCh[2]) / Math.sqrt(Number(icCh[3]));
    const expected = Number(icCh[1]) - 1.96 * SE;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
  }
  // Margem de erro = 1.96 · SE
  const mfs = q.match(ME_FROM_SE_RE);
  if (mfs) {
    const expected = 1.96 * Number(mfs[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'stat' };
  }
  if (QUAD_N_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - 0.5) < 1e-9, computed: '0.5', kind: 'stat' };
  }
  if (Z_99_RE.test(q)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - 2.58) < 1e-2, computed: '2.58', kind: 'stat' };
  }
  // Symbol questions
  if (SYMBOL_S_RE.test(q)) {
    return { ok: String(answer).trim() === 's', computed: 's', kind: 'stat' };
  }
  if (SYMBOL_XBAR_RE.test(q)) {
    return { ok: String(answer).trim() === 'x̄', computed: 'x̄', kind: 'stat' };
  }
  if (SYMBOL_MU_RE.test(q)) {
    return { ok: String(answer).trim() === 'μ', computed: 'μ', kind: 'stat' };
  }
  // r → R² = r²
  const rsqR = q.match(R_SQUARED_RE);
  if (rsqR) {
    const expected = Math.pow(Number(rsqR[1]), 2);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'r_squared' };
  }
  // b = r·sy/sx
  const breg = q.match(B_REG_RE);
  if (breg) {
    const expected = Number(breg[1]) * Number(breg[2]) / Number(breg[3]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-2, computed: `${expected}`, kind: 'r_squared' };
  }
  // Calculus-type pure-arithmetic series sums: '<arith> ≈ ?' / '<arith> = ?'.
  if (type === 'calculus') {
    const m = question.match(/(?:[:—,]|primeiros\s+\d+\s+termos[^:]*=|com\s+\d+\s+termos[^:]*:)\s*([0-9+\-*/.()\s!^]+?)\s*[≈=]\s*\?\s*(?:\([^)]*\))?\s*$/i);
    if (m) {
      let expr = m[1].replace(/(\d+)!/g, (_, d) => {
        let r = 1; for (let i = 2; i <= Number(d); i++) r *= i; return String(r);
      });
      if (/^[0-9+\-*/.()\s^]+$/.test(expr) && /[+\-*/]/.test(expr)) {
        try {
          const val = toNumber(math.evaluate(expr));
          const an = toNumber(tryEval(a));
          if (val != null && an != null && Math.abs(an - val) < 0.01) {
            return { ok: true, computed: `${val}`, kind: 'expression' };
          }
        } catch {}
      }
    }
  }
  // 'kFN(x) = E → FN(x) = ?' → E/k (simple algebra divide)
  const tdv = question.match(TRIG_DIVIDE_RE);
  if (tdv) {
    const k = Number(tdv[1]);
    if (k !== 0) {
      try {
        const rhs = toNumber(math.evaluate(normalize(tdv[3].trim())));
        if (rhs != null) {
          const expected = rhs / k;
          const an = toNumber(tryEval(a));
          if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'trig_meta' };
        }
      } catch {}
    }
  }
  // Inline A(n,k) / C(n,k) — embedded in larger phrase like 'Pódio ... — A(5,3) = ?'
  // Skip if exact P(...) / C(...) plain forms (handled earlier).
  if (!/^A\(/.test(q) && !/^C\(/.test(q)) {
    const ai = question.match(ARRANGE_INLINE_RE);
    if (ai) {
      const N = Number(ai[1]), K = Number(ai[2]);
      const f = (m) => { let r = 1; for (let k = 2; k <= m; k++) r *= k; return r; };
      if (N >= K) {
        const expected = f(N) / f(N - K);
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'arrange' };
      }
    }
    const cmi = question.match(COMBINE_INLINE_RE);
    if (cmi) {
      const N = Number(cmi[1]), K = Number(cmi[2]);
      const f = (m) => { let r = 1; for (let k = 2; k <= m; k++) r *= k; return r; };
      if (N >= K) {
        const expected = f(N) / (f(K) * f(N - K));
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'combine' };
      }
    }
  }
  // '... soma ângulos internos de quadrilátero ... = ?°' → 360 constant
  if (/soma\s+[âa]ngulos\s+internos\s+de\s+quadril[áa]tero[\s\S]*=\s*\?°?\s*$/i.test(q)) {
    const an = toNumber(tryEval(a));
    if (an === 360) return { ok: true, computed: '360', kind: 'poly_sum_angle' };
    if (an != null) return { ok: false, computed: '360', kind: 'poly_sum_angle' };
  }
  // 3D dot product
  const vd3 = question.match(VEC3_DOT_RE);
  if (vd3) {
    const expected = evalFrac(vd3[1]) * evalFrac(vd3[4]) + evalFrac(vd3[2]) * evalFrac(vd3[5]) + evalFrac(vd3[3]) * evalFrac(vd3[6]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'vec_dot' };
  }
  // Parallelogram area = ||u × v||.
  const computeAreaUV = (u, v) => {
    const cx = u[1] * v[2] - u[2] * v[1];
    const cy = u[2] * v[0] - u[0] * v[2];
    const cz = u[0] * v[1] - u[1] * v[0];
    return Math.sqrt(cx * cx + cy * cy + cz * cz);
  };
  const pga3 = question.match(PARALLELOGRAM_3D_RE);
  if (pga3) {
    const u = [pga3[1], pga3[2], pga3[3]].map(evalFrac);
    const v = [pga3[4], pga3[5], pga3[6]].map(evalFrac);
    const expected = computeAreaUV(u, v);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'parallelogram_area' };
  }
  const pga2 = question.match(PARALLELOGRAM_2D_RE);
  if (pga2) {
    const u = [evalFrac(pga2[1]), evalFrac(pga2[2]), 0];
    const v = [evalFrac(pga2[3]), evalFrac(pga2[4]), 0];
    const expected = computeAreaUV(u, v);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-6, computed: `${expected}`, kind: 'parallelogram_area' };
  }
  // Cross product z-component for u=(a,b,c), v=(d,e,f) → ae - bd
  const cz = question.match(CROSS_Z_RE);
  if (cz) {
    const a1 = evalFrac(cz[1]), b1 = evalFrac(cz[2]);
    const d1 = evalFrac(cz[4]), e1 = evalFrac(cz[5]);
    const expected = a1 * e1 - b1 * d1;
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'cross_z' };
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
  // 'Conte:' prefix or 'X a mais/menos de Y:' tail) — skip comparison/word
  // forms.
  if (type === 'count' && !/qual\s+tem|maior\s+que|menor\s+que|igual\s+a/i.test(question)) {
    // Strip leading words like 'Conte:' or 'Dois a menos de 10:' / 'Três a mais de 5:'.
    const stripped = question.replace(/^[a-zçãâêíóôõ\d\s,]*:\s*/i, '').trim();
    if (/^[\s●▲◆★■♦♥♣♠○△□◇☆▢☀☼☾♫♪]+$/.test(stripped)) {
      const shapes = stripped.match(/[●▲◆★■♦♥♣♠○△□◇☆▢☀☼☾♫♪]/g);
      if (shapes) {
        const expected = shapes.length;
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'count' };
      }
    }
  }
  // 'Qual tem mais/menos: <glyphs1> ou <glyphs2>? (N1 ou N2)'
  if (type === 'count') {
    const cmp = question.match(/^qual\s+tem\s+(mais|menos):\s+([●▲◆★■♦♥♣♠○△□◇☆▢☀☼☾♫♪]+)\s+ou\s+([●▲◆★■♦♥♣♠○△□◇☆▢☀☼☾♫♪]+)\?/i);
    if (cmp) {
      const c1 = cmp[2].length, c2 = cmp[3].length;
      const expected = cmp[1].toLowerCase() === 'mais' ? Math.max(c1, c2) : Math.min(c1, c2);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'count' };
    }
    // 'Igual a N: (group1/group2)' or 'Maior/Menor que N: …' — answer is a glyph string
    const choice = question.match(/^(igual\s+a|maior\s+que|menor\s+que)\s+(\d+):\s*\(([^/]+)\/([^)]+)\)/i);
    if (choice) {
      const target = Number(choice[2]);
      const g1 = (choice[3].match(/[●▲◆★■♦♥♣♠○△□◇☆▢☀☼☾♫♪]/g) || []).length;
      const g2 = (choice[4].match(/[●▲◆★■♦♥♣♠○△□◇☆▢☀☼☾♫♪]/g) || []).length;
      const cmp1 = choice[1].toLowerCase();
      const matches = (n) => cmp1.startsWith('igual') ? n === target : cmp1.startsWith('maior') ? n > target : n < target;
      const correctOpt = matches(g1) ? choice[3].trim() : matches(g2) ? choice[4].trim() : null;
      if (correctOpt) return { ok: a.trim() === correctOpt, computed: correctOpt, kind: 'count' };
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
  // PA: 'a₁=N, r=R, qual n tem aₙ=M?' → 1 + (M - N) / R
  const apn = q.match(AP_FIND_N_RE);
  if (apn) {
    const a1 = Number(apn[1]), r = Number(apn[2]), aN = Number(apn[3]);
    if (r !== 0) {
      const expected = 1 + (aN - a1) / r;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'ap_find_n' };
    }
  }
  // 'a₁=N, aₙ=M, r=R, n = ?' → 1 + (M-N)/R
  const an_n = q.match(AP_N_FROM_VAL_RE);
  if (an_n) {
    const a1 = Number(an_n[1]), aN = Number(an_n[2]), r = Number(an_n[3]);
    if (r !== 0) {
      const expected = 1 + (aN - a1) / r;
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'ap_find_n' };
    }
  }
  // 'a₁=N, aK=M, r = (M-N)/(K-1) = ?' (explicit-fraction form)
  const aRE = q.match(AP_RATIO_EXPLICIT_RE);
  if (aRE) {
    const expected = (Number(aRE[4]) - Number(aRE[5])) / Number(aRE[6]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'pa_ratio' };
  }
  // 'Se aN = V, aM = W, r = ?' → (W - V) / (M - N)
  const apr = q.match(AP_RATIO_TWO_RE);
  if (apr) {
    const n1 = Number(apr[1]), v1 = Number(apr[2]), n2 = Number(apr[3]), v2 = Number(apr[4]);
    if (n2 !== n1) {
      const expected = (v2 - v1) / (n2 - n1);
      const an = toNumber(tryEval(a));
      if (an != null) return { ok: Math.abs(an - expected) < 1e-9, computed: `${expected}`, kind: 'pa_ratio' };
    }
  }
  // 'Soma ... = formula. Para n=N: ?' — apply formula at N
  const sf = q.match(SUM_FORMULA_RE);
  if (sf) {
    const fmla = sf[1].toLowerCase(), N = Number(sf[2]);
    const expected = fmla === 'n²' || fmla === 'n2' ? N * N : N * (N + 1);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'sum_formula' };
  }
  // Σ q^n from n=0 to ∞ = 1/(1-q). Only fire when the rest of the question
  // is a closed-form '= ?' (not a 'converge' yes/no).
  if (question.startsWith('Σ') && /=\s*\?\s*$/.test(question) && !/converge|diverge|V\/F/i.test(question)) {
    const gm = question.match(GEOM_INF_SUM_RE);
    if (gm) {
      const evF = (s) => { const m = s.match(/^(-?\d+)\/(\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
      const r = evF(gm[1]);
      if (Math.abs(r) < 1) {
        const expected = 1 / (1 - r);
        const an = toNumber(tryEval(a));
        if (an != null) return { ok: Math.abs(an - expected) < 1e-3, computed: `${expected}`, kind: 'geom_inf' };
      }
    }
  }
  // 'Converge apenas se |q| < ?' / 'Diverge se |q| ≥ ?' → 1
  if (CONVERGE_DIV_RE.test(question)) {
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === 1, computed: '1', kind: 'pg_converge' };
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
  // Linear inequality: '<ax+b> <op> <c>' — boundary closest-integer answer.
  if (type === 'inequality') {
    const m = q.match(/^(-?\d+)\s*\*?\s*x\s*\+\s*(-?\d+)\s*(<=|>=|<|>)\s*(-?\d+)\s*$/);
    if (m) {
      const A = Number(m[1]), B = Number(m[2]), op = m[3], C = Number(m[4]);
      if (A !== 0) {
        const bound = (C - B) / A;
        const flipped = A < 0 ? (op === '<' ? '>' : op === '>' ? '<' : op) : op;
        const isInt = Number.isInteger(bound);
        let expected;
        if (flipped === '<') expected = isInt ? bound - 1 : Math.floor(bound);
        else if (flipped === '>') expected = isInt ? bound + 1 : Math.ceil(bound);
        if (expected != null) {
          const an = toNumber(tryEval(a));
          if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'inequality' };
        }
      }
    }
  }
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
  // 'V/F' identity questions: 'A = B (V/F)?' → answer 'V' iff A and B
  // are equivalent over their shared free variables.
  const vf = q.match(/^(.+?)\s*=\s*(.+?)\s*\(V\/F\)\??\s*$/i);
  if (vf && /^[VF]$/i.test(a.trim())) {
    const lhsExpr = vf[1].trim(), rhsExpr = vf[2].trim();
    const lvars = [...new Set([...lhsExpr.matchAll(/\b([a-z])\b/g)].map(m => m[1]))]
      .filter(v => v !== 'e' && v !== 'i');
    const rvars = [...new Set([...rhsExpr.matchAll(/\b([a-z])\b/g)].map(m => m[1]))]
      .filter(v => v !== 'e' && v !== 'i');
    const shared = lvars.filter(v => rvars.includes(v));
    if (shared.length) {
      const result = probeEquivalent(lhsExpr, rhsExpr, shared);
      if (result !== null) {
        const expected = result ? 'V' : 'F';
        return { ok: a.trim().toUpperCase() === expected, computed: expected, kind: 'identity_vf' };
      }
    }
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
      // Fall back to probe-equivalence if direct eval fails (likely
      // because the question has a free variable, e.g. 'cos(2x) = 1 - ?·sen²(x)').
      if (/[a-z]/i.test(lhsExpr + rhsExpr)) {
        // Auto-pick free vars shared by both sides (single letters,
        // excluding mathjs constants).
        const lvars = [...new Set([...lhsExpr.matchAll(/\b([a-z])\b/g)].map(m => m[1]))];
        const rvars = [...new Set([...rhsExpr.matchAll(/\b([a-z])\b/g)].map(m => m[1]))];
        const sharedVars = lvars.filter(v => v !== 'e' && v !== 'i' && rvars.includes(v));
        if (sharedVars.length) {
          const result = probeEquivalent(lhsExpr, rhsExpr, sharedVars);
          if (result === true) return { ok: true, computed: 'identity', kind: 'fill_blank' };
          if (result === false) return { ok: false, computed: 'identity disagrees', kind: 'fill_blank' };
        }
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
  // For chained '<a> = <b> = ?' forms (original ended in '?'), evaluate
  // only the expression immediately before '= ?'.
  if (/^[A-Za-z]$/.test(a.trim())) return null;
  const trailingEqQ = /=\s*\?\s*$/.test(q);
  let lhs = q.replace(/\s*\?\s*$/, '').replace(/\s*=\s*$/, '').trim();
  // Strip 'via <hint>' / 'pela série' phrases — they describe how, not what.
  lhs = lhs.replace(/\s+via\s+.+$/i, '').replace(/\s+pela\s+s[ée]rie\s*$/i, '').trim();
  // Chained '<a> = <b> = ?': take the last segment only when the question
  // starts with a math symbol/digit (so 'cos(60°) = cos²(30°) - sen²(30°)
  // = ?' chains but 'Se 2R=10, a com sen(A)=1 = ?' word problems don't).
  let chained = false;
  // Only chain when the captured tail looks like an arithmetic expression
  // (has operator or function call), not a bare number or variable.
  if (trailingEqQ && /^[a-z\d\√(∫lim]/i.test(question)
      && !/^(?:amplitude|m[áa]ximo|m[íi]nimo|per[íi]odo|linha\s+central|se\s+|b\s+\(agudo\)|h[₁-₉]\b|H\d|P\(X=|reta\s+por)/i.test(question)) {
    const lastEq = lhs.lastIndexOf('=');
    if (lastEq > 0) { lhs = lhs.slice(lastEq + 1).trim(); chained = true; }
  }
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
  // Chained expressions are often presented with 3-4 decimal places of
  // rounding (e.g. '0.286' for 2/7), so loosen tolerance there.
  const tol = chained ? 1e-2 : 1e-6;
  return { ok: Math.abs(ln - an) < tol, computed: `${ln}`, kind: identity ? 'identity' : 'expression' };
}

async function main() {
  const files = await fg('src/levels/math/**/set_*.yaml');
  let checked = 0, byKind = { equation: 0, expression: 0, function: 0, limit: 0, 'limit∞': 0, identity: 0, successor: 0, predecessor: 0, mental_hint: 0, sqrt_eq: 0, area_rect: 0, perim_rect: 0, factoring: 0, seq3: 0, count: 0, alg_subst: 0, comparison: 0, even_odd: 0, place_value: 0, skip_count: 0, fill_blank: 0, graph_point: 0, slope: 0, system_eq: 0, quad_roots: 0, inequality: 0, stat: 0, sq_hint: 0, integral: 0, compose: 0, shape_count: 0, parallelogram: 0, trapezium: 0, circle_area: 0, inverse: 0, limit_indet: 0, triangle_area: 0, box_vol: 0, cylinder_vol: 0, cone_vol: 0, sphere_vol: 0, rect_altura: 0, ap_term: 0, gp_term: 0, ap_find_n: 0, sum_formula: 0, pg_converge: 0, geom_inf: 0, deviation: 0, dev_sq: 0, var_to_std: 0, variance: 0, stddev: 0, identity_symbolic: 0, identity_vf: 0, cube_vol: 0, sphere_surf: 0, hypotenuse: 0, circle_approx: 0, pa_ratio: 0, pa_sum: 0, word_problem: 0, sum_sq_dev: 0, sum_dev: 0, prob_count: 0, prob_value: 0, trig_given: 0, frac_to_dec: 0, power_eq: 0, double_angle: 0, half_angle: 0, tan_sum_part: 0, frequency: 0, rel_freq: 0, interval_amp: 0, sum_1_to_n: 0, other_leg: 0, vec_norm: 0, vec_add: 0, vec_sub: 0, vec_dot: 0, vec_scal: 0, vec_partial: 0, parallelogram_area: 0, cross_z: 0, tri_special: 0, cube_solve: 0, circumference: 0, circle_radius: 0, poly_perim: 0, poly_int_angle: 0, poly_sum_angle: 0, square_area: 0, square_diag: 0, hex_area: 0, equi_tri_area: 0, arrange: 0, permute: 0, combine: 0, pair_product: 0, det_2x2: 0, mat_add: 0, mat_scale: 0, mat_op: 0, matrix_dim: 0, eigenvalue: 0, diag_eig: 0, scalar_I: 0, matvec: 0, dim_r: 0, lin_indep: 0, law_cos: 0, law_sin: 0, amplitude: 0, trig_meta: 0, tri_area_sas: 0, translate: 0, reflect: 0, homothety: 0, distance: 0, midpoint: 0, line_b: 0, absolute_value: 0, normal_dist: 0, z_score: 0, anagram: 0, binomial_coef: 0, bernoulli: 0, die_uniform: 0, cond_prob: 0, indep_prob: 0, expected: 0, r_squared: 0, sys_solve: 0, y_at_x: 0, parabola_vertex: 0, i_power: 0, complex_part: 0, complex_mod: 0, complex_arg: 0, linear_T: 0 };
  const byType = { verified: {}, total: {} };
  const byLevel = { verified: {}, total: {} };
  const mismatches = [];
  for (const f of files) {
    const level = f.match(/math\/([^/]+)\//)?.[1] ?? '?';
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const t = e.type || 'unknown';
        byType.total[t] = (byType.total[t] || 0) + 1;
        byLevel.total[level] = (byLevel.total[level] || 0) + 1;
        // (No per-file skips currently — see CORRECTNESS.md / memory for
        // skipped types like inequality.)
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
        byLevel.verified[level] = (byLevel.verified[level] || 0) + 1;
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
  if (process.argv.includes('--by-level')) {
    // Sort with numeric prefixes (1A, 2A, ...) before letter levels A-Q.
    const cmp = (a, b) => {
      const na = /^\d/.test(a) ? 0 : 1, nb = /^\d/.test(b) ? 0 : 1;
      return na !== nb ? na - nb : a.localeCompare(b);
    };
    const levels = Object.keys(byLevel.total).sort(cmp);
    console.log('  Per-level coverage:');
    for (const l of levels) {
      const tot = byLevel.total[l], ver = byLevel.verified[l] || 0;
      const pct = tot ? Math.round(100 * ver / tot) : 0;
      console.log(`    math/${l.padEnd(4)} ${String(ver).padStart(5)} / ${String(tot).padStart(5)}  (${pct}%)`);
    }
  }
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
