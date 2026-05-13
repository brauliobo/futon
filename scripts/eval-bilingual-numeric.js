#!/usr/bin/env node
// Bilingual consistency: for every {pt, en} object in question/choices/
// correctAnswer/rationale, the set of numbers extracted from each side must
// match. Catches translation drift like:
//   pt: "Dose de 25 mg cada 8 horas"  en: "25 mg dose every 6 hours"
// where the 8 vs 6 mismatch is invisible to monolingual review.
//
// Also flags when one half is empty / missing while the other has content.
//
// Skips identical numeric content (most cases) and dates / years that fall
// into 19xx/20xx (common shared dates), unless explicitly diverging.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', DIM = '\x1b[2m';
const c = (t, col) => `${col}${t}${RESET}`;

// Extract every unsigned numeric token (decimal allowed). We deliberately
// ignore leading '-' because hyphenated narrative phrases like '3-by-3' or
// 'near-100%' would otherwise produce phantom negative numbers and cause
// false positives without revealing real translation drift.
// Convert 'século XX' / 'XIX' Roman numerals to their Arabic value so that
// pt 'século XX' and en '20th century' compare equal.
const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
function roman(s) {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]], next = ROMAN[s[i + 1]];
    total += (next && cur < next) ? -cur : cur;
  }
  return total;
}

function numbers(s) {
  if (!s) return [];
  // Only convert Roman numerals in century context, to avoid false matches
  // on medical acronyms (CML, DII, MI all look Roman). Common pt/en pattern:
  //   'século XX' / 'XX century' / 'XIXth century' / 'do século XIX'
  let text = String(s).replace(
    /(?:s[eé]culo\s+)([IVXLCDM]{1,4})\b|\b([IVXLCDM]{1,4})(?:th)?\s+(?:century|séc)/gi,
    (m, p1, p2) => {
      const tok = (p1 || p2 || '').toUpperCase();
      const v = roman(tok);
      return v > 0 && v < 4000 ? m.replace(tok, ` ${v} `) : m;
    },
  );
  // English 'ND-dimensional' shorthand: '2D'/'3D' (rarely 4D) where PT typically
  // spells out 'bidimensional'/'tridimensional'. Strip the digit so it doesn't
  // create asymmetric numeric content.
  text = text.replace(/(?<![\d.])([234])D\b/g, ' ');
  // Embryo/biopsy day-range notation: PT 'D5-6' vs EN 'Day 5-6' / 'day 5-6'.
  // Strip both forms — the day range is a unit, not arithmetic content.
  text = text.replace(/\bD\d+-\d+\b/g, ' ');
  text = text.replace(/\bDay\s+\d+-\d+\b/gi, ' ');
  // PT medical dosing shorthand 'N/N semanas' = 'every N weeks'. Collapse
  // the duplicated digit so the EN 'every 2 weeks' translation matches.
  text = text.replace(/(\d+)\/\1(?=\s*(?:semanas?|weeks?|días?|horas?|hours?))/g, '$1');
  // Strip ordinal-labeled noun phrases on BOTH sides:
  //   PT '1ª geração' / 'Nº geração' / 'Nº grau' / 'Nª+Mª geração'
  //   EN 'first-gen' / 'first generation' / 'first-degree' (only with gen/deg suffix)
  // The ordinal here labels a category, not arithmetic content.
  text = text.replace(/\d+\s*[ºª°]\s*[+e]?\s*\d*\s*[ºª°]?\s*gera[çc][ãa]o\b/gi, ' ');
  text = text.replace(/\d+\s*[ºª°]\s*grau\b/gi, ' ');
  text = text.replace(/\b\d+(?:st|nd|rd|th)?\s*[+&-]?\s*\d*(?:st|nd|rd|th)?[-\s](?:gen(?:eration)?|degree)\b/gi, ' ');
  text = text.replace(/\b(?:first|second|third|fourth|fifth)[-\s](?:gen(?:eration)?|degree)\b/gi, ' ');
  // Thousand separator: '1,000' / '10,000' / '1.000' (European). A separator
  // followed by exactly 3 digits (no more) → strip the separator so '1,000'
  // and '1000' compare equal.
  text = text.replace(/(\d{1,3})[,.](\d{3})(?!\d)/g, '$1$2');
  // 'N mil' (PT) / 'N thousand' (EN) — N may have a decimal comma/dot ('3,7 mil').
  const mul = (factor) => (_, n) => ` ${Number(n.replace(',', '.')) * factor} `;
  // Negative lookbehind: skip when the digit is the trailing part of an
  // identifier like 'mRNA-1273' / 'COVID-19'. Pattern: letter immediately
  // before a hyphen (then the digit). Digit-hyphen-digit ranges like '2-3'
  // are preserved.
  // (?<![\d.]) prevents starting in the middle of a longer digit run;
  // (?<![A-Za-z]-) prevents matching when the digit is the version suffix of
  // a 'WORD-NUMBER' identifier like 'mRNA-1273' / 'COVID-19'.
  const NLI = '(?<![\\d.])(?<![A-Za-z]-)';
  text = text.replace(new RegExp(`${NLI}(\\d+(?:[,.]\\d+)?)\\s+(?:mil|thousand)\\b`, 'gi'), mul(1000));
  // English shorthand '200k'/'200 k', '1.5M'/'1.5 M', '2B'/'2 B'.
  text = text.replace(new RegExp(`${NLI}(\\d+(?:[,.]\\d+)?)\\s*k\\b`, 'g'), mul(1000));
  text = text.replace(new RegExp(`${NLI}(\\d+(?:[,.]\\d+)?)\\s*M\\b`, 'g'), mul(1_000_000));
  text = text.replace(new RegExp(`${NLI}(\\d+(?:[,.]\\d+)?)\\s*B\\b`, 'g'), mul(1_000_000_000));
  // 'Ma'/'Mya'/'Myr'/'Mb' = mega-annum or mega-bases (million);
  // 'Ga'/'Gya'/'Bya'/'by'/'Gb' = giga (billion);
  // 'ka'/'kya'/'kb' = kilo (thousand).
  text = text.replace(new RegExp(`${NLI}(\\d+(?:[,.]\\d+)?)\\s+(?:milh[ãa]o|milh[õo]es|million)\\b`, 'gi'), mul(1_000_000));
  text = text.replace(new RegExp(`${NLI}(\\d+(?:[,.]\\d+)?)\\s+(?:mya|ma|myr|mb)\\b`, 'gi'), mul(1_000_000));
  text = text.replace(new RegExp(`${NLI}(\\d+(?:[,.]\\d+)?)\\s+(?:bilh[ãa]o|bilh[õo]es|billion|bi)\\b`, 'gi'), mul(1_000_000_000));
  text = text.replace(new RegExp(`${NLI}(\\d+(?:[,.]\\d+)?)\\s+(?:gya|bya|ga|gb)\\b`, 'gi'), mul(1_000_000_000));
  // 'by'/'ka' are too short — require leading word boundary and following
  // 'ago' / end / punctuation (including em-dash and en-dash separators).
  const BOUND = String.raw`(?=\s+ago|\s*[,;:.)–—]|$)`;
  text = text.replace(new RegExp(`(?<![a-zA-Z])(\\d+(?:[,.]\\d+)?)\\s+by${BOUND}`, 'gi'), mul(1_000_000_000));
  text = text.replace(/(?<![a-zA-Z])(\d+(?:[,.]\d+)?)\s+(?:kya|kb)\b/gi, mul(1000));
  text = text.replace(new RegExp(`(?<![a-zA-Z])(\\d+(?:[,.]\\d+)?)\\s+ka${BOUND}`, 'gi'), mul(1000));
  // PT ordinals '1º grau' / '2ª' / '3°' → strip the marker so it matches
  // English ordinals (which often spell out 'first/second/third').
  text = text.replace(/(\d+)[ºª°]/g, '$1');
  // Exclude digits directly embedded in identifiers (G3P, Cas9, H2O, PM2.5).
  return [...text.matchAll(/(?<![.,\dA-Za-z])\d+(?:[.,]\d+)?/g)]
    .map(m => Number(m[0].replace(',', '.')))
    .filter(Number.isFinite);
}

function multisetEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

function* bilingualNodes(value, path) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* bilingualNodes(value[i], `${path}[${i}]`);
    return;
  }
  if ('pt' in value && 'en' in value && typeof value.pt !== 'object') {
    yield { path, pt: value.pt, en: value.en };
    return;
  }
  for (const [k, v] of Object.entries(value)) yield* bilingualNodes(v, path ? `${path}.${k}` : k);
}

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let checked = 0;
  const violations = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const [pidx, p] of (s.pages || []).entries()) {
      for (const [eidx, e] of (p.exercises || []).entries()) {
        for (const node of bilingualNodes(e, `pages[${pidx}].exercises[${eidx}]`)) {
          checked++;
          const ptN = numbers(node.pt);
          const enN = numbers(node.en);
          // Empty-side violation: one side has content, the other doesn't.
          if (!node.pt && node.en) {
            violations.push({ file: f.replace('src/levels/', ''), path: node.path, kind: 'missing pt', pt: '', en: String(node.en).slice(0, 80) });
            continue;
          }
          if (!node.en && node.pt) {
            violations.push({ file: f.replace('src/levels/', ''), path: node.path, kind: 'missing en', pt: String(node.pt).slice(0, 80), en: '' });
            continue;
          }
          if (!multisetEqual(ptN, enN)) {
            violations.push({
              file: f.replace('src/levels/', ''),
              path: node.path,
              kind: 'number mismatch',
              ptNums: JSON.stringify(ptN),
              enNums: JSON.stringify(enN),
              pt: String(node.pt).slice(0, 80),
              en: String(node.en).slice(0, 80),
            });
          }
        }
      }
    }
  }
  console.log(c('\n🌐 BILINGUAL NUMERIC CONSISTENCY', BOLD));
  console.log(`  ${checked} bilingual {pt,en} nodes scanned.\n`);
  if (!violations.length) {
    console.log(c('✅ Every pt/en pair has identical numeric content.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${violations.length} bilingual inconsistencies:`, RED));
  for (const v of violations.slice(0, 60)) {
    console.log(`  ${c(v.file, BOLD)} ${v.kind}  ${c(v.path, DIM)}`);
    if (v.kind === 'number mismatch') {
      console.log(`    pt nums=${c(v.ptNums, RED)} · en nums=${c(v.enNums, GREEN)}`);
    }
    console.log(`    ${c('pt: ' + v.pt, DIM)}`);
    console.log(`    ${c('en: ' + v.en, DIM)}`);
  }
  if (violations.length > 60) console.log(`  … and ${violations.length - 60} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
