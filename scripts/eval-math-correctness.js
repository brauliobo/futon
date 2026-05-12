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
const POLY_PERIM_RE = /^(?:tri[âa]ngulo|quadrado|pent[áa]gono|hex[áa]gono|hept[áa]gono|oct[óo]gono|pol[íi]gono\s+regular\s+de\s+(\d+)\s+lados)\s*(?:regular\s+)?(?:[—-]+\s*)?lado\s*=\s*(\d+(?:\.\d+)?)\s*:?\s*per[íi]metro\s*=\s*\??\s*$/i;
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
const FREQ_OF_RE = /^em\s+\{([^}]+)\}\s*,\s*frequ[êe]ncia\s+de\s+([^=]+?)\s*=\s*\??\s*$/i;
const REL_FREQ_RE = /^em\s+(?:conjunto\s+com\s+)?n\s*=\s*(\d+)\s+com\s+f\s*=\s*(\d+)\s*,\s*fr?\s*=\s*\??\s*$/i;
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
  // i^N — powers of imaginary unit cycle 1, i, -1, -i.
  const ip = question.match(I_POWER_RE);
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
  // Binomial coefficient: 'Coeficiente de aⁱbʲ em (a+b)^n' → C(n, j)
  const bc = question.match(/^coeficiente\s+de\s+(?:([a-z])(?:\^?(\d+))?\s*([a-z])(?:\^?(\d+))?|([a-z])(?:\^?(\d+))?)\s+em\s+\(\s*[a-z\d]+\s*\+\s*[a-z\d]+\s*\)\^(\d+)\s*=\s*\??\s*$/i);
  if (bc) {
    const n = Number(bc[7]);
    // Variable indices give exponents; missing exponents default to 1 (single var) or 0.
    let i, j;
    if (bc[1]) {
      i = bc[2] ? Number(bc[2]) : 1;
      j = bc[4] ? Number(bc[4]) : 1;
    } else {
      // Single variable form like 'x^k' in '(1+x)^n' → k for the variable, n-k for the constant.
      j = bc[6] ? Number(bc[6]) : 1;
      i = n - j;
    }
    if (i + j === n) {
      const f = (m) => { let r = 1; for (let k = 2; k <= m; k++) r *= k; return r; };
      const expected = f(n) / (f(i) * f(j));
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
  // Circumference: 'Comprimento da circunferência r=R = ?π' → 2R
  const cr = q.match(CIRCUM_R_RE);
  if (cr) {
    const expected = 2 * Number(cr[1]);
    const an = toNumber(tryEval(a));
    if (an != null) return { ok: an === expected, computed: `${expected}`, kind: 'circumference' };
  }
  const cd = q.match(CIRCUM_D_RE);
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
    const word = q.toLowerCase().match(/^(\w+)/)[1];
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
  let checked = 0, byKind = { equation: 0, expression: 0, function: 0, limit: 0, 'limit∞': 0, identity: 0, successor: 0, predecessor: 0, mental_hint: 0, sqrt_eq: 0, area_rect: 0, perim_rect: 0, factoring: 0, seq3: 0, count: 0, alg_subst: 0, comparison: 0, even_odd: 0, place_value: 0, skip_count: 0, fill_blank: 0, graph_point: 0, slope: 0, system_eq: 0, quad_roots: 0, inequality: 0, stat: 0, sq_hint: 0, integral: 0, compose: 0, shape_count: 0, parallelogram: 0, trapezium: 0, circle_area: 0, inverse: 0, limit_indet: 0, triangle_area: 0, box_vol: 0, cylinder_vol: 0, cone_vol: 0, sphere_vol: 0, rect_altura: 0, ap_term: 0, gp_term: 0, ap_find_n: 0, sum_formula: 0, pg_converge: 0, geom_inf: 0, deviation: 0, dev_sq: 0, var_to_std: 0, variance: 0, stddev: 0, identity_symbolic: 0, identity_vf: 0, cube_vol: 0, sphere_surf: 0, hypotenuse: 0, circle_approx: 0, pa_ratio: 0, pa_sum: 0, word_problem: 0, sum_sq_dev: 0, sum_dev: 0, prob_count: 0, prob_value: 0, trig_given: 0, frac_to_dec: 0, power_eq: 0, double_angle: 0, half_angle: 0, tan_sum_part: 0, frequency: 0, rel_freq: 0, interval_amp: 0, sum_1_to_n: 0, other_leg: 0, vec_norm: 0, vec_add: 0, vec_sub: 0, vec_dot: 0, vec_scal: 0, vec_partial: 0, parallelogram_area: 0, cross_z: 0, tri_special: 0, cube_solve: 0, circumference: 0, circle_radius: 0, poly_perim: 0, poly_int_angle: 0, poly_sum_angle: 0, square_area: 0, square_diag: 0, hex_area: 0, equi_tri_area: 0, arrange: 0, permute: 0, combine: 0, pair_product: 0, det_2x2: 0, mat_add: 0, mat_scale: 0, mat_op: 0, matrix_dim: 0, eigenvalue: 0, matvec: 0, dim_r: 0, lin_indep: 0, law_cos: 0, law_sin: 0, amplitude: 0, trig_meta: 0, tri_area_sas: 0, translate: 0, reflect: 0, homothety: 0, distance: 0, midpoint: 0, line_b: 0, absolute_value: 0, normal_dist: 0, z_score: 0, anagram: 0, binomial_coef: 0, bernoulli: 0, die_uniform: 0, cond_prob: 0, indep_prob: 0, expected: 0, r_squared: 0, sys_solve: 0, y_at_x: 0, parabola_vertex: 0, i_power: 0, complex_part: 0 };
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
