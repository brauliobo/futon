#!/usr/bin/env node
// Rationale-question relevance check. A rationale that is classified as
// "method" by the lexicon categorizer should ALSO be topically relevant
// to its question — otherwise it may be a copy-paste leftover from another
// exercise.
//
// Heuristic for math/numeric questions: if the question has numeric operands
// (5, 3 in "5 + 3 = ?"), the rationale should mention at least one of them
// OR the numeric answer. Otherwise the rationale is disconnected from its
// question — a real content bug.
//
// Exit code 0 on clean, 1 on any disconnected rationale.

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { categorize } from './lib/rationale.js';
import { asText } from './lib/i18n.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m';
const c = (t, col) => `${col}${t}${RESET}`;

const NUM = /-?\d+(?:[.,]\d+)?/g;

// Portuguese cardinal words → digits. Covers 0-20 which is what arithmetic
// drills use in the rationale bodies (not full number names). English too.
const WORD2NUM = {
  zero: '0', um: '1', uma: '1', one: '1', dois: '2', duas: '2', two: '2',
  três: '3', tres: '3', three: '3', quatro: '4', four: '4', cinco: '5', five: '5',
  seis: '6', six: '6', sete: '7', seven: '7', oito: '8', eight: '8',
  nove: '9', nine: '9', dez: '10', ten: '10', onze: '11', eleven: '11',
  doze: '12', twelve: '12', treze: '13', catorze: '14', quatorze: '14',
  quinze: '15', dezesseis: '16', dezessete: '17', dezoito: '18', dezenove: '19',
  vinte: '20',
};

function numsFrom(text) {
  const out = new Set(String(text).match(NUM) || []);
  for (const w of String(text).toLowerCase().match(/[a-zàáâãçéêíóôõúü]+/g) || []) {
    if (WORD2NUM[w]) out.add(WORD2NUM[w]);
  }
  return out;
}

// Only check pure-arithmetic questions (N op N form), where a disconnected
// rationale is unambiguously a bug (copy-paste leftover). For word problems,
// portuguese grammar, or vocab, the rationale routinely teaches concepts
// without restating specific numbers, so this heuristic would false-fire.
const PURE_ARITH = /^\s*-?\d+\s*[+\-×÷*\/]\s*-?\d+\s*=?\s*$/;

function isDisconnected(ex) {
  const q = asText(ex.question).trim();
  const r = asText(ex.rationale);
  const a = asText(ex.correctAnswer);
  if (!r.trim() || !q) return false;
  if (!PURE_ARITH.test(q)) return false;
  const qNums = q.match(NUM) || [];
  if (qNums.length < 2) return false;
  // Accept full-operand matches (e.g. "11") OR any constituent-digit match
  // (e.g. rationale contains "1" for operand "11"). Column-addition teaching
  // legitimately decomposes operands into digits.
  const allQChars = new Set([...qNums.join(''), ...String(a)]);
  const rDigitTokens = new Set([...(r.match(/\d/g) || [])]);
  // Also check word-form numbers (zero, um, dois…)
  const rNumTokens = numsFrom(r);
  const shared = [...allQChars].some(ch => rDigitTokens.has(ch)) ||
                 qNums.some(n => rNumTokens.has(n)) ||
                 rNumTokens.has(String(a));
  return !shared;
}

async function main() {
  const files = await fg('src/levels/**/set_*.yaml');
  let checked = 0;
  const disconnected = [];
  for (const f of files) {
    const s = YAML.parse(readFileSync(f, 'utf8'));
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        if (categorize(asText(e.rationale)) !== 'method') continue;
        checked++;
        if (isDisconnected(e)) {
          disconnected.push({
            file: f.replace('src/levels/', ''),
            q: asText(e.question).slice(0, 60),
            a: e.correctAnswer,
            r: asText(e.rationale).slice(0, 80),
          });
        }
      }
    }
  }

  console.log(c('\n🔗 RATIONALE-QUESTION RELEVANCE CHECK', BOLD));
  console.log(`  ${checked} method-rationales inspected on numeric-operand questions.\n`);
  if (!disconnected.length) {
    console.log(c('✅ All numeric-question rationales reference at least one operand or answer.', GREEN));
    process.exit(0);
  }
  console.log(c(`❌ ${disconnected.length} disconnected rationale(s):`, RED));
  for (const d of disconnected.slice(0, 30)) {
    console.log(`  ${c(d.file, BOLD)}  Q: ${d.q} → ${d.a}`);
    console.log(c(`    R: ${d.r}`, YELLOW));
  }
  if (disconnected.length > 30) console.log(c(`  … and ${disconnected.length - 30} more`, '\x1b[90m'));
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
