#!/usr/bin/env node
// Structural fix: in biology bilingual sets, several exercises have a
// correctAnswer whose text doesn't exactly match any choice. Causes:
//   (A) translation typo on en side (e.g. 'depolarização' for 'depolarization')
//   (B) filler appended to choice but not correctAnswer ('Coração' vs 'Coração (mediated…)')
//   (C) different filler on correctAnswer vs its matching choice
//
// Strategy: for each exercise, compute the 'stem' of the correctAnswer by
// stripping appended parentheticals, find the choice with a matching stem on
// either pt or en, and replace correctAnswer with that choice's full text.
//
// Operates as an in-place text edit on the YAML file (preserves formatting).

import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';
import YAML from 'yaml';

// Strip trailing parentheticals: "Heart (mediated by inactive Schwann cells)" → "Heart"
const stem = (s) => String(s ?? '').replace(/\s*\(.*$/, '').trim().toLowerCase();

const apply = process.argv.includes('--apply');
const files = await fg('src/levels/biology/**/set_*.yaml');
let grandTotal = 0;
const replacements = [];

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const doc = YAML.parse(src);
  let touched = 0;
  for (const p of doc?.pages ?? []) {
    for (const e of p.exercises ?? []) {
      const ans = e.correctAnswer;
      if (!ans || typeof ans !== 'object' || !('pt' in ans && 'en' in ans)) continue;
      if (!Array.isArray(e.choices)) continue;
      // Skip when correctAnswer already exactly matches any choice (both halves).
      const alreadyOk = e.choices.some(c =>
        typeof c === 'object' && c.pt === ans.pt && c.en === ans.en,
      );
      if (alreadyOk) continue;
      // Find a choice whose pt-stem OR en-stem matches the answer's stems.
      const ansPtStem = stem(ans.pt), ansEnStem = stem(ans.en);
      const cand = e.choices.find(c => {
        if (typeof c !== 'object' || !('pt' in c) || !('en' in c)) return false;
        return stem(c.pt) === ansPtStem || stem(c.en) === ansEnStem;
      });
      if (!cand) continue;
      // Record so we can do a text-based replacement that preserves formatting.
      replacements.push({ file: f, oldPt: ans.pt, oldEn: ans.en, newPt: cand.pt, newEn: cand.en });
      touched++;
    }
  }
  if (touched > 0) {
    grandTotal += touched;
    console.log(`${f}: ${touched} mismatched`);
  }
}

// Apply replacements as in-place text edits.
if (apply) {
  const byFile = new Map();
  for (const r of replacements) {
    if (!byFile.has(r.file)) byFile.set(r.file, []);
    byFile.get(r.file).push(r);
  }
  for (const [file, edits] of byFile) {
    let text = readFileSync(file, 'utf8');
    for (const e of edits) {
      // Replace the correctAnswer line's pt/en values.
      // YAML formats: 'correctAnswer: {pt: "X", en: "Y"}' or block form.
      const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const ptEsc = escape(e.oldPt), enEsc = escape(e.oldEn);
      // Try flow-style: {pt: "OLD", en: "OLD"}
      const flowRe = new RegExp(
        `(correctAnswer:\\s*\\{\\s*pt:\\s*)(["'])${ptEsc}\\2(\\s*,\\s*en:\\s*)(["'])${enEsc}\\4(\\s*\\})`,
      );
      let replaced = false;
      text = text.replace(flowRe, (m, h1, q1, mid, q2, tail) => {
        replaced = true;
        return `${h1}${q1}${e.newPt.replace(/"/g, '\\"')}${q1}${mid}${q2}${e.newEn.replace(/"/g, '\\"')}${q2}${tail}`;
      });
      if (!replaced) console.warn(`  ⚠️  could not locate correctAnswer line in ${file} for "${e.oldPt}"`);
    }
    writeFileSync(file, text);
  }
}

console.log(`\nTotal: ${grandTotal} ${apply ? '(written)' : '(dry-run, use --apply)'}`);
