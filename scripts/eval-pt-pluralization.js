#!/usr/bin/env node
// Portuguese pluralization bug detector. Flags rationales and set-level
// fields that use English-style "-s" plural on Portuguese nouns whose
// correct plurals are -ções / -ais / -eis / -is:
//
//   animal → animais         (not animals)
//   hospital → hospitais     (not hospitals)
//   lição → lições           (not liçãos)
//   coração → corações       (not coraçãos)
//   fácil → fáceis           (not fácils)
//
// Scans rationale + authorNotes + example (not question/correctAnswer —
// questions often use the wrong plural as an intentional distractor, e.g.
// "Plural de 'animal': (animals/animales/animais)" is legitimate).
//
// Hard-fail: exits 1 on any hit. Iter 199 cleared 13 real bugs in
// 7A/set_01 and 7A/set_03; this prevents regression.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

// Pull out the PT-side of a bilingual {pt,en} object (or pass-through string).
const ptText = v => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.pt ?? '';
  return String(v);
};

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

// PT nouns ending -ção/-al/-el/-il with an English-style -s plural.
// Uses Unicode letter class to match accented forms.
export const BAD_PLURAL = /\b([\p{L}]*(?:ção|al|el|il))s\b/giu;

// Whitelist: short words that end with those suffixes but aren't PT nouns
// being mispluralized (mas, pais, mais, mes, mil, til, vil, etc.) and
// some common real singulars/plurals we don't want to flag.
const WHITELIST = new Set([
  'mas', 'mais', 'pais', 'mes', 'mil', 'pil', 'til', 'vil', 'luz',
  'sis', 'lis', 'íris', 'ris',
]);

export function detectBadPlurals(text) {
  const matches = String(text || '').match(BAD_PLURAL) || [];
  return matches.filter(m => !WHITELIST.has(m.toLowerCase()));
}

async function main() {
  // Restricted to portuguese subject: biology PT-side carries English loanwords
  // (pixels, TILs, biofuels) that legitimately end in -als/-els/-ils. Without
  // a real PT-noun dictionary, broadening to biology produces too much noise.
  const files = await fg('src/levels/portuguese/**/set_*.yaml');
  const hits = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    const setText = [ptText(s.authorNotes), ptText(s.example)].filter(Boolean).join(' ');
    for (const m of detectBadPlurals(setText)) {
      hits.push({ f: f.replace('src/levels/', ''), where: 'set-level', match: m, sample: setText.slice(0, 80) });
    }
    for (const p of s.pages || []) {
      for (const ex of p.exercises || []) {
        for (const field of ['rationale']) {
          const txt = ptText(ex[field]);
          for (const m of detectBadPlurals(txt)) {
            hits.push({ f: f.replace('src/levels/', ''), where: field, match: m, sample: txt.slice(0, 80) });
          }
        }
      }
    }
  }

  console.log(c('\n🇧🇷 PT PLURALIZATION CHECK', BOLD));
  console.log(`  Scanned ${files.length} PT sets (rationale + set-level fields).\n`);

  if (!hits.length) {
    console.log(c('  ✅ No English-style plurals on PT -ção/-al/-el/-il nouns.', GREEN));
    process.exit(0);
  }

  console.log(c(`  ⚠️  ${hits.length} bad plural(s):`, YELLOW));
  const byFile = {};
  for (const h of hits) (byFile[h.f] ||= []).push(h);
  for (const [f, list] of Object.entries(byFile)) {
    console.log(c(`\n  ${f}`, BOLD));
    for (const h of list) {
      console.log(`    ${c(h.match, RED)}  (${h.where})  ${c(h.sample, GRAY)}`);
    }
  }
  console.log('\n' + '─'.repeat(60));
  console.log(c('Fix patterns:', YELLOW));
  console.log(`  -ção → -ções (lição → lições, coração → corações)`);
  console.log(`  -al → -ais  (animal → animais, hospital → hospitais)`);
  console.log(`  -el → -eis  (pincel → pincéis)`);
  console.log(`  -il → -is   (fácil → fáceis — variable)`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
