#!/usr/bin/env node
// Bilingual coverage gate. If a set is *mostly* bilingual (≥50% of fields
// authored as {pt, en}), then EVERY learner-facing field must be bilingual —
// otherwise a few stragglers leave EN learners reading PT (or vice versa)
// for those specific fields, the "half-translated" bug.
//
// Sets below 50% bilingual are considered "monolingual-with-some-bilingual-
// extras" (typical of advanced biology levels Q-S where only question and
// rationale got bilingual upgrade) — flagged in advisory mode but not failed.
//
// Fields checked: title, page.title, page.description,
// example.question/rationale/correctAnswer/choices,
// exercise.question/rationale/correctAnswer/choices.

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import fg from 'fast-glob';

const isBi = v => v && typeof v === 'object' && !Array.isArray(v) && 'pt' in v && 'en' in v;
const isPlainStr = v => typeof v === 'string';

function checkField(label, val, state) {
  if (val == null) return;
  if (isBi(val)) state.bi++;
  else if (isPlainStr(val)) state.plain.push(label);
}

function checkChoices(label, choices, state) {
  if (!Array.isArray(choices)) return;
  choices.forEach((c, i) => checkField(`${label}[${i}]`, c, state));
}

function audit(set) {
  const state = { bi: 0, plain: [] };
  checkField('title', set.title, state);
  if (set.example) {
    checkField('example.question', set.example.question, state);
    checkField('example.rationale', set.example.rationale, state);
    checkField('example.correctAnswer', set.example.correctAnswer, state);
    checkChoices('example.choices', set.example.choices, state);
  }
  (set.pages || []).forEach((p, pi) => {
    checkField(`pages[${pi}].title`, p.title, state);
    checkField(`pages[${pi}].description`, p.description, state);
    (p.exercises || []).forEach((ex, ei) => {
      const tag = `pages[${pi}].exercises[${ei}]`;
      checkField(`${tag}.question`, ex.question, state);
      checkField(`${tag}.rationale`, ex.rationale, state);
      checkField(`${tag}.correctAnswer`, ex.correctAnswer, state);
      checkChoices(`${tag}.choices`, ex.choices, state);
    });
  });
  return state;
}

const files = await fg('src/levels/**/set_*.yaml');
const failures = [];
const advisories = [];
for (const f of files) {
  let set;
  try { set = parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  if (!set) continue;
  const { bi, plain } = audit(set);
  const total = bi + plain.length;
  if (total === 0 || bi === 0 || plain.length === 0) continue;
  const biRatio = bi / total;
  // Hard fail only when the set is *mostly* bilingual — a few monolingual
  // stragglers in a translated set are the half-translated bug we care
  // about. Sets where bilingualism is a minority addition (biology Q-S)
  // are still on a long-tail upgrade path; report as advisory only.
  if (biRatio >= 0.5) failures.push({ f, bi, plain, ratio: biRatio });
  else advisories.push({ f, bi, plain, ratio: biRatio });
}

if (advisories.length > 0) {
  console.log(`⚠️  ${advisories.length} set(s) partially bilingual (<50% bilingual fields, treated as advisory):`);
  for (const { f, bi, plain } of advisories.slice(0, 5)) {
    console.log(`  ${path.relative(process.cwd(), f)}  (${bi} bilingual, ${plain.length} plain)`);
  }
  if (advisories.length > 5) console.log(`  … +${advisories.length - 5} more advisories`);
}

if (failures.length === 0) {
  console.log(`✅ Bilingual coverage clean (${files.length} sets checked, ${advisories.length} advisories)`);
  process.exit(0);
}

console.log(`\n❌ ${failures.length} set(s) ≥50% bilingual with stragglers (half-translated):`);
for (const { f, bi, plain } of failures.slice(0, 30)) {
  console.log(`  ${path.relative(process.cwd(), f)}  (${bi} bilingual, ${plain.length} plain)`);
  for (const p of plain.slice(0, 5)) console.log(`     - ${p}`);
  if (plain.length > 5) console.log(`     … +${plain.length - 5} more`);
}
if (failures.length > 30) console.log(`  … +${failures.length - 30} more sets`);
process.exit(1);
