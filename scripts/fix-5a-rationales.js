#!/usr/bin/env node
// Fixes placeholder/mismatched rationales in math/5A. Seven sets contain
// exercises whose rationales are either generic filler ("Responda conforme
// a pergunta.") or copy-pasted from an unrelated concept.
//
// Strategy: detect each exercise's QUESTION pattern and generate a
// question-specific rationale. Patterns handled:
//   "Depois de N vem:"    → successor teaching
//   "Antes de N vem:"     → predecessor teaching
//   "a, b, c, ?"          → arithmetic-sequence teaching (shows step)
//   "N ? M" (< > =)       → comparison teaching
//   "A + ? = B"           → inverse-addition teaching
//   "? + A = B"           → inverse-addition teaching
//
// Skips exercises whose rationale is already meaningful (not in the known
// placeholder set).
//
// Dry-run by default; --apply writes.

import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';

const APPLY = process.argv.includes('--apply');

const PLACEHOLDERS = new Set([
  'Responda conforme a pergunta.',
  'Leia com atenção e escolha a operação adequada.',
  'Analise os dados e aplique a operação pedida.',
]);

// Extra mismatch patterns — rationales that clearly don't match fill-in-blank
// exercises (they teach carry-over, doubles, etc. which are unrelated).
const MISMATCH_FOR_FILLIN = new Set([
  'Se soma > 10, escreve a unidade e vai 1.',
  'Fecha dezena: 8+5 = 8+2+3 = 13.',
  'Pense em dobros: 4+4=8 então 4+5=9.',
]);

const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function generateRationale(e) {
  const q = String(e.question || '').trim();
  const a = String(e.correctAnswer ?? '').trim();
  let m;
  // "Depois de N vem:" → successor
  if ((m = q.match(/^Depois de (-?\d+)\s*vem:?$/))) {
    const n = Number(m[1]);
    return `Sucessor de ${n} = ${n}+1 = ${n + 1}.`;
  }
  // "Antes de N vem:" → predecessor
  if ((m = q.match(/^Antes de (-?\d+)\s*vem:?$/))) {
    const n = Number(m[1]);
    return `Antecessor de ${n} = ${n}-1 = ${n - 1}.`;
  }
  // "a, b, c, ?" — arithmetic sequence
  if ((m = q.match(/^(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*\?$/))) {
    const [x, y, z] = m.slice(1).map(Number);
    const step = y - x;
    return `Sequência de +${step} em +${step}: ${z} + ${step} = ${z + step}.`;
  }
  // "a, b, c, d, ?" — 4-term arithmetic sequence
  if ((m = q.match(/^(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*\?$/))) {
    const [x, , , w] = m.slice(1).map(Number);
    const step = Number(m[2]) - x;
    return `Sequência de +${step} em +${step}: ${w} + ${step} = ${w + step}.`;
  }
  // "N ? M" comparison
  if ((m = q.match(/^(-?\d+)\s*\?\s*(-?\d+)$/))) {
    const [x, y] = m.slice(1).map(Number);
    if (x < y) return `${x} é menor que ${y}, então ${x} < ${y}.`;
    if (x > y) return `${x} é maior que ${y}, então ${x} > ${y}.`;
    return `${x} e ${y} são iguais, então ${x} = ${y}.`;
  }
  // "A + ? = B" or "? + A = B" — inverse addition
  if ((m = q.match(/^(-?\d+)\s*\+\s*\?\s*=\s*(-?\d+)$/))) {
    const [x, y] = m.slice(1).map(Number);
    return `Inverso da adição: ${y} − ${x} = ${y - x}.`;
  }
  if ((m = q.match(/^\?\s*\+\s*(-?\d+)\s*=\s*(-?\d+)$/))) {
    const [x, y] = m.slice(1).map(Number);
    return `Inverso da adição: ${y} − ${x} = ${y - x}.`;
  }
  // "A - ? = B" or "? - A = B" — inverse subtraction
  if ((m = q.match(/^(-?\d+)\s*-\s*\?\s*=\s*(-?\d+)$/))) {
    const [x, y] = m.slice(1).map(Number);
    return `Inverso da subtração: ${x} − ${y} = ${x - y}.`;
  }
  if ((m = q.match(/^\?\s*-\s*(-?\d+)\s*=\s*(-?\d+)$/))) {
    const [x, y] = m.slice(1).map(Number);
    return `Inverso da subtração: ${y} + ${x} = ${y + x}.`;
  }
  // Word problems: "<Name> tinha/achou/coletou/viu N <symbol>. <verb> M <symbol>. Quantas ..."
  // Addition frames (tinha + ganhou / achou + mais / viu + mais / coletou + coletou / juntou + juntou)
  if (/Quant[ao]s? .*\?$/.test(q) || /Quant[ao] .*\?$/.test(q)) {
    const nums = q.match(/\d+/g) || [];
    if (nums.length >= 2) {
      const [n, k] = nums.map(Number);
      const ans = Number(a);
      if (ans === n + k) return `${n} + ${k} = ${ans}.`;
      if (ans === n - k) return `${n} − ${k} = ${ans}.`;
      if (ans === Math.floor(n / 2) && /metade/i.test(q)) return `Metade de ${n} é ${ans}.`;
      if (ans === n * k) return `${n} × ${k} = ${ans}.`;
    }
  }
  // "Quantas unidades tem N?" → place value
  if ((m = q.match(/^Quantas\s+unidades\s+tem\s+(-?\d+)\?$/))) {
    const n = Number(m[1]);
    return `${n} tem ${n % 10} unidade${n % 10 === 1 ? '' : 's'} (dígito à direita).`;
  }
  // "Quantas dezenas tem N?" → place value
  if ((m = q.match(/^Quantas\s+dezenas\s+tem\s+(-?\d+)\?$/))) {
    const n = Number(m[1]);
    return `${n} tem ${Math.floor(n / 10)} dezena${Math.floor(n / 10) === 1 ? '' : 's'} (dígito à esquerda).`;
  }
  return null;
}

async function main() {
  const files = await fg('src/levels/math/5A/set_*.yaml');
  let totalChanged = 0;
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    const s = YAML.parse(raw);
    let changed = 0;
    for (const p of s.pages || []) {
      for (const e of p.exercises || []) {
        const r = String(e.rationale || '').trim();
        const needsFix = PLACEHOLDERS.has(r) || MISMATCH_FOR_FILLIN.has(r);
        if (!needsFix) continue;
        const newR = generateRationale(e);
        if (!newR) continue;
        // Anchor end-of-question with newline so "A + ? = 5" can't match
        // inside "A + ? = 50"; use 'g' flag so ALL repeats of this
        // question (across pages) get the same rationale.
        const q = rx(String(e.question));
        const blockRe = new RegExp(
          `(question:\\s*(?:"${q}"|'${q}'|${q})[ \\t]*\\r?\\n[\\s\\S]*?rationale:\\s*)("[^"\\n]*"|'[^'\\n]*'|[^\\n]*)`,
          'g',
        );
        let hit = false;
        raw = raw.replace(blockRe, (m, prefix) => { hit = true; return `${prefix}"${newR}"`; });
        if (hit) changed++;
      }
    }
    if (changed) {
      totalChanged += changed;
      console.log(APPLY ? '[apply]' : '[dry]', f.replace('src/levels/', ''), `- ${changed} rationales rewritten`);
      if (APPLY) writeFileSync(f, raw);
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${totalChanged} rewrite(s).`);
  if (!APPLY && totalChanged) console.log('Re-run with --apply to write.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
