#!/usr/bin/env node
// Portuguese grammar-category mismatch detector. Classifies correctAnswer
// into a category (pronome pessoal, artigo, substantivo, verbo, adjetivo,
// advérbio, preposição/contração) and flags rationales that invoke a
// DIFFERENT category by name.
//
// Example caught: answer "Eu" (pronome pessoal) with rationale
// "Artigo concorda em gênero e número com o substantivo" → mismatch.
//
// Only triggers when the rationale uses a category term AS the core
// explanation (not merely referencing it in passing). Advisory — exit 0.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

// Answer-token → category classifier. Returns a category label or null.
const PERSONAL_PRONOUNS = new Set(['eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas', 'você', 'vocês']);
const ARTICLES = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas']);
const POSSESSIVE_PRONOUNS = new Set([
  'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
  'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas',
]);
const PREPOSITIONS = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'à', 'às', 'ao', 'aos', 'por', 'com', 'para', 'entre']);

function classify(ans) {
  const a = String(ans || '').trim().toLowerCase();
  if (!a) return null;
  if (PERSONAL_PRONOUNS.has(a)) return 'pronome pessoal';
  if (POSSESSIVE_PRONOUNS.has(a)) return 'pronome possessivo';
  if (ARTICLES.has(a)) return 'artigo';
  if (PREPOSITIONS.has(a)) return 'preposição';
  if (/mente$/.test(a) && a.length > 4) return 'advérbio';
  return null;
}

// Rationale → claimed-category detector. Only matches when the rationale
// PRIMARILY explains using that category (assertive phrasing).
const RATIONALE_RULES = [
  { cat: 'pronome pessoal',     re: /pronome pessoal/i },
  { cat: 'pronome possessivo',  re: /pronome possessivo/i },
  { cat: 'artigo',              re: /^[Aa]rtigo (definido|indefinido|concord)|artigo (definido|indefinido) \(/ },
  { cat: 'advérbio',            re: /^[Aa]dvérbio (modifica|indica)/ },
  { cat: 'substantivo',         re: /^[Ss]ubstantivo (nomeia|é|designa)/ },
];

// Compatible pairs — a rationale may invoke multiple categories without
// contradicting the answer's category.
function compatible(answerCat, rationaleCat) {
  if (answerCat === rationaleCat) return true;
  if (answerCat === 'pronome pessoal' && rationaleCat === 'pronome possessivo') return false;
  if (answerCat === 'pronome possessivo' && rationaleCat === 'pronome pessoal') return false;
  return false;
}

async function main() {
  const files = await fg('src/levels/portuguese/**/set_*.yaml');
  const hits = [];
  let checked = 0;

  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const ex of p.exercises || []) {
        checked++;
        const ansCat = classify(ex.correctAnswer);
        if (!ansCat) continue;
        const r = String(ex.rationale || '');
        for (const rule of RATIONALE_RULES) {
          if (rule.re.test(r) && !compatible(ansCat, rule.cat)) {
            hits.push({
              f: f.replace('src/levels/', ''),
              q: String(ex.question || '').slice(0, 60),
              a: ex.correctAnswer,
              ansCat,
              claimedCat: rule.cat,
              r: r.slice(0, 70),
            });
            break;
          }
        }
      }
    }
  }

  console.log(c('\n🏷  PT CATEGORY-MISMATCH', BOLD));
  console.log(`  Checked ${checked} portuguese exercises.\n`);

  if (!hits.length) {
    console.log(c('  ✅ No rationale-category mismatches.', GREEN));
    process.exit(0);
  }

  console.log(c(`  ⚠️  ${hits.length} mismatch(es):`, YELLOW));
  const byFile = {};
  for (const h of hits) (byFile[h.f] ||= []).push(h);
  for (const [f, list] of Object.entries(byFile)) {
    console.log(c(`\n  ${f}`, BOLD) + c(` (${list.length})`, GRAY));
    for (const h of list.slice(0, 5)) {
      console.log(`    "${h.q}"`);
      console.log(`      answer=${h.a} ${c('(' + h.ansCat + ')', GREEN)}  vs.  rationale ${c('(' + h.claimedCat + ')', RED)}`);
      console.log(c(`      "${h.r}..."`, GRAY));
    }
    if (list.length > 5) console.log(c(`    … and ${list.length - 5} more`, GRAY));
  }

  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix options:', YELLOW));
  console.log(`  - Rewrite rationale to describe the answer's actual category`);
  console.log(`  - Advisory: exit 0 regardless.`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
