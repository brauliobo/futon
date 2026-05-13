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
// Use `u` flag so `\b` recognizes accented capitals like 'Á'/'Â' as word
// characters — without it, 'Área' / 'Ângulo' / 'Único' wouldn't match.
const NAME_RE = /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,})?\b/u;
const MECH_RE = /\b(mecanismo|processo|reação|reacao|enzima|catalis|síntese|sintese|transcri|tradu[çc][ãa]o|replica[çc][ãa]o|mitose|meiose|fotoss[íi]ntese|respira[çc][ãa]o|fermenta[çc][ãa]o|hidrólise|hidrolise|fosforila|metila|acetila|ubiquitina|apoptose|autofagia|endocitose|exocitose|difus[ãa]o|osmose|gradiente|membrana|receptor|ligante|antic|ant[íi]geno|ribossomo|mitocôndr|mitocondr|cloroplasto|n[úu]cleo|cromossomo|gene|alelo|mutação|mutacao|sele[çc][ãa]o|evolu[çc][ãa]o|filogen|hom[óo]log|ortolog|paralog|sintenia|epistasia|fen[óo]tipo|gen[óo]tipo)\b/i;

// Math-substance: short rationales that nonetheless teach (formulas, named
// properties, operations). E.g., "Quadrado de 8 = 64." or "5×7+7 = 42."
// Includes set/sequence notation '{1,2,1}' and bare 'name = N' assignments
// (common in Pascal/binomial drills).
const MATH_NUM_OP_RE = /\d+\s*[×÷*\/+\-−]\s*\d+|\{[\d,\s.]+\}|=\s*-?\d+/;
const MATH_PROP_RE = /\b(dobro|dobre|dobrar|metade|quadrado|cubo|tabuada|identidade|comutativ|distributiv|associativ|fatorar?|fatora|primo|m[úu]ltiplo|divis[íi]vel|resto|quociente|frac[çc][ãa]o|decimal|equa[çc][ãa]o|raiz|radical|expoente|pot[êe]ncia|polin[ôo]mio|coeficiente|(?:é|s[ãa]o)\s+(?:maior|menor|igua(?:l|is))|antecessor|sucessor|metad|terça|integral|derivada|limite|constante|sen[oa]?|cos(?:seno|eno)?|tang|trigon|logarit|exponencial|matriz|vetor|determinante|multiplica[çc][ãa]o|divis[ãa]o|adi[çc][ãa]o|subtra[çc][ãa]o|soma|diferen[çc]a|produto|grupos?\s+×|reagrup|emprest|reser[v]a|vai\s+um|sobra|tri[âa]ngulo|ret[âa]ngulo|pent[áa]gono|hex[áa]gono|hept[áa]gono|oct[óo]gono|c[íi]rculo|losang|trap[ée]zio|paralelogramo|lados|cantos|v[ée]rtices|arestas|faces|[íi]mpar|[íi]mpares|d[íi]gito|d[íi]gitos|\bpar\b|pares|conte\s+(?:ao|os|as)|termina\s+em|hipótese|hip[óo]tese|s[ée]rie|harm[ôo]nica|permuta[çc][ãa]o|combina[çc][ãa]o|circunscrita|inscrita|hipotenusa|cateto|m[ée]dia|mediana|moda|vari[âa]ncia|desvio|amostra|popula[çc][ãa]o|m[íi]nimos\s+quadrados|aceptor|el[ée]trons|dispers[ãa]o|estima|imagen?|imaginária|real|complex|cis|polar|reta|equilátero|equilatero)\b/i;
const MATH_STEP_RE = /=.*=|→|⇒|[<>≤≥∫∑∏]/;              // multi-step deduction, comparison, or calculus symbol

// Formula shape: a variable assignment with an operator on the RHS. Catches
// "A = base × altura", "P(n) = n!", "C(n,1) = n", "L = a + b·h". The LHS may
// be a single letter or letter(arg). The RHS must contain at least one math
// operator or function-call pattern.
const FORMULA_RE = /\b[A-Za-zα-ωΑ-Ω]+(?:[₀-₉]|_\w+)?(?:\([^)]+\))?\s*=\s*[^=]*[+\-×÷·*\/^!√()πρθλμσΩΣℝℕℤℚ]/;

// PT grammar rationales — short but pedagogically substantive (these ARE the
// lesson: which question word maps to which clause type, agreement rules).
const PT_GRAMMAR_RE = /\b(sujeito|verbo|predicado|adjetivo|adv[ée]rbio|substantivo|artigo|pronome|preposi[çc][ãa]o|conjun[çc][ãa]o|interjei[çc][ãa]o|reg[êe]ncia|conc[oô]rd[âa]ncia|g[êe]nero|n[úu]mero|pessoa|plural|singular|masculino|feminino|tempo|modo|lugar|causa|quantidade|intensidade|companhia|instrumento|finalidade|condi[çc][ãa]o|concess[ãa]o|conformidade|afirma[çc][ãa]o|nega[çc][ãa]o|d[úu]vida|sintagma|or[ãa]o|frase|locu[çc][ãa]o)\b/i;

// Foreign-language usage/pronunciation rationale — short by design. Either
// quotes a token ('X', "X") or names a phonetic/usage rule (soa, pronuncia,
// silab, acento, forma, usa-se).
const LANG_LESSON_RE = /^['"`'']|['"`'']\s*(?:soa|som|pronuncia|forma|usa|indica|antes|depois|aparece|significa|em|para|na?\s)|(?:\bsoa|\bsom\s+(?:longo|curto)|\bpronuncia[a-z]*|\bs[íi]laba|\bacento|\bditong|\btritong|\bmudo|\bsurdo|\bsonor[oa])\b/i;

// Reading-comprehension citation rationale — "El texto: '…'." / "O texto: …"
// The lesson IS the evidence pointer back to the passage. Substantive by design.
const TEXT_CITATION_RE = /^(?:O|El|The|La|Il)\s+texto\b|\btexto\s*:\s*['"`'']/i;

function isMathSubstantive(s) {
  return MATH_NUM_OP_RE.test(s) || MATH_PROP_RE.test(s) || MATH_STEP_RE.test(s) || FORMULA_RE.test(s);
}

function isWeak(pt) {
  const s = pt.trim();
  if (!s) return false;
  if (s.length >= 60) return false;
  if (YEAR_RE.test(s)) return false;
  if (NAME_RE.test(s)) return false;
  if (MECH_RE.test(s)) return false;
  if (PT_GRAMMAR_RE.test(s)) return false;
  if (LANG_LESSON_RE.test(s)) return false;
  if (TEXT_CITATION_RE.test(s)) return false;
  if (isMathSubstantive(s)) return false;
  return true;
}

// Pre-reader / kana-drill levels intentionally have short rationales (single-
// character/syllable recognition is the pedagogy — no need for mechanism or
// citation). These levels are exempt from the depth check.
const DRILL_SKIP = [
  /\/japanese\/(?:4A|3A|2A|1A|A)\//,         // kana + intro kanji
  /\/portuguese\/(?:7A|6A|5A|4A|3A|2A|1A)\//, // letter/word recognition
  /\/english\/(?:7A|6A|5A|4A|3A|2A|1A)\//,    // pre-listening + first-words
  /\/spanish\/(?:7A|6A|5A|4A|3A|2A|1A)\//,    // pre-reading
  /\/math\/(?:7A|6A|5A|4A|3A|2A|1A)\//,       // arithmetic drill levels
];

const files = await fg('src/levels/**/set_*.yaml');
const perSet = [];
let totalHits = 0;

for (const f of files) {
  if (DRILL_SKIP.some(rx => rx.test(f))) continue;
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
