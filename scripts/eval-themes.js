#!/usr/bin/env node
// Validates that every level in levels.js is covered by a SkillTree node,
// and that every topic key used in levels.js has a matching i18n entry.

import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { Levels } from '../src/domain/levels.js';
import { SkillTree } from '../src/domain/SkillTree.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m';
const c = (t, col) => `${col}${t}${RESET}`;

const SUBJECTS = ['math', 'portuguese', 'english', 'japanese', 'spanish', 'biology'];

const en = parse(readFileSync('src/i18n/en.yaml', 'utf8'));
const pt = parse(readFileSync('src/i18n/pt.yaml', 'utf8'));

let errors = 0, warnings = 0;

for (const subject of SUBJECTS) {
  const levels = Levels[subject.toUpperCase()] || [];
  const tree = SkillTree.forSubject(subject);
  const coveredLevels = new Set(tree.flatMap(n => n.levels));

  for (const { id, topic } of levels) {
    const hasCoverage = coveredLevels.has(id);
    if (!hasCoverage) {
      console.log(c(`❌ ${subject}/${id}: no SkillTree node covers this level`, RED));
      errors++;
    }

    if (topic) {
      const key = `level_name_${topic}`;
      if (!en[key]) { console.log(c(`❌ ${subject}/${id}: missing en.yaml key "${key}"`, RED)); errors++; }
      if (!pt[key]) { console.log(c(`❌ ${subject}/${id}: missing pt.yaml key "${key}"`, RED)); errors++; }
    }
  }

  // Check every SkillTree node has an i18n name
  for (const node of tree) {
    const key = `skill_${node.id}`;
    if (!en[key]) { console.log(c(`⚠️  skill-tree: missing en.yaml key "${key}"`, YELLOW)); warnings++; }
    if (!pt[key]) { console.log(c(`⚠️  skill-tree: missing pt.yaml key "${key}"`, YELLOW)); warnings++; }
  }
}

if (errors === 0 && warnings === 0) {
  console.log(c('✅ All levels have SkillTree coverage and i18n keys', BOLD + GREEN));
} else {
  if (errors) console.log(c(`\n❌ ${errors} error(s)`, BOLD + RED));
  if (warnings) console.log(c(`⚠️  ${warnings} warning(s)`, BOLD + YELLOW));
  if (errors) process.exit(1);
}
