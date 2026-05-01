#!/usr/bin/env node
// Bilingual coverage gate. If a set authors ANY learner-facing field as
// {pt, en}, EVERY learner-facing field in that set must also be bilingual.
// Catches half-translated sets where e.g. the question is bilingual but
// choices are plain English/Portuguese strings.
//
// Skips legacy monolingual sets (no {pt, en} anywhere).
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
for (const f of files) {
  let set;
  try { set = parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  if (!set) continue;
  const { bi, plain } = audit(set);
  if (bi > 0 && plain.length > 0) failures.push({ f, bi, plain });
}

if (failures.length === 0) {
  console.log(`✅ Bilingual coverage clean (${files.length} sets checked)`);
  process.exit(0);
}

console.log(`❌ ${failures.length} set(s) with mixed bilingual/monolingual fields:`);
for (const { f, bi, plain } of failures.slice(0, 30)) {
  console.log(`  ${path.relative(process.cwd(), f)}  (${bi} bilingual, ${plain.length} plain)`);
  for (const p of plain.slice(0, 5)) console.log(`     - ${p}`);
  if (plain.length > 5) console.log(`     … +${plain.length - 5} more`);
}
if (failures.length > 30) console.log(`  … +${failures.length - 30} more sets`);
process.exit(1);
