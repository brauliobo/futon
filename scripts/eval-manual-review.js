#!/usr/bin/env node
// Manual-review checklist generator. For a given level (e.g. "math/D") or
// set (e.g. "math/D/set_12"), produces a markdown checklist a human reviewer
// can walk through to catch issues the automated rubric can't see:
//
//   - Pedagogical clarity: does the example show HOW to solve?
//   - Cognitive load: are questions unambiguous?
//   - Cultural/age fit: is content appropriate for the target grade?
//   - Rationale coherence: does the rationale actually teach, or just repeat?
//   - Distractor quality: are wrong options teaching common misconceptions?
//
// Usage:  pnpm eval:review math/D
//         pnpm eval:review math/D/set_12
//         pnpm eval:review         # all levels, summary only

import { readFileSync } from 'fs';
import YAML from 'yaml';
import fg from 'fast-glob';
import { categorize } from './lib/rationale.js';

const target = process.argv[2] || '';

async function main() {
  const pattern = target.includes('/set_')
    ? `src/levels/${target}.yaml`
    : target
      ? `src/levels/${target}/set_*.yaml`
      : 'src/levels/**/set_*.yaml';
  const files = await fg(pattern);
  if (!files.length) {
    console.error(`No sets matched "${target}". Try: math/D or math/D/set_12`);
    process.exit(1);
  }

  const out = [];
  out.push(`# Manual Pedagogy Review — ${target || 'all levels'}`);
  out.push('');
  out.push(`Generated from ${files.length} set(s). Walk through each checklist`);
  out.push(`to catch issues the automated rubric can't see.`);
  out.push('');
  out.push('---');
  out.push('');

  // Group files by level for the per-level sections
  const byLevel = {};
  for (const f of files) {
    const m = f.match(/src\/levels\/([^/]+)\/([^/]+)\//);
    const key = m ? `${m[1]}/${m[2]}` : 'unknown';
    (byLevel[key] ||= []).push(f);
  }

  for (const [level, lvlFiles] of Object.entries(byLevel).sort()) {
    out.push(`## ${level}`);
    out.push('');
    // Level-level checks
    const sets = lvlFiles.map(f => {
      const s = YAML.parse(readFileSync(f, 'utf8'));
      const all = (s.pages || []).flatMap(p => p.exercises || []);
      return { file: f, name: f.split('/').pop(), s, all };
    });
    const totalExs = sets.reduce((a, x) => a + x.all.length, 0);
    const totalGeneric = sets.reduce((a, x) =>
      a + x.all.filter(e => categorize(e.rationale) === 'generic').length, 0);
    const uniqueObjectives = new Set(
      sets.flatMap(x => x.all.flatMap(e => e.objectives || []))
    );
    out.push(`**Level stats:** ${sets.length} sets · ${totalExs} exercises · ${uniqueObjectives.size} objectives · ${totalGeneric} generic rationales`);
    out.push('');
    out.push('### Level-wide checks');
    out.push('- [ ] **Progression readability** — Can a new student start at set_01 and feel each set building on the prior?');
    out.push('- [ ] **Example-exercise alignment** — Does each set\'s `example` use the same operation/structure as its exercises?');
    out.push('- [ ] **Cultural fit** — Are names, places, contexts appropriate for the age group?');
    out.push('- [ ] **Objective coverage** — Are all objectives listed also reached in exercises (no dangling/orphan tags)?');
    out.push('');
    // Per-set block
    for (const x of sets) {
      const firstEx = x.all[0];
      const lastEx = x.all[x.all.length - 1];
      const genericCount = x.all.filter(e => categorize(e.rationale) === 'generic').length;
      out.push(`### ${x.name}`);
      out.push(`**Title:** ${x.s.title || '(untitled)'}`);
      out.push(`**Example:** ${(x.s.example || '').slice(0, 100)}`);
      out.push(`**First exercise:** ${String(firstEx?.question || '').slice(0, 80)} → \`${firstEx?.correctAnswer}\``);
      out.push(`**Last exercise:** ${String(lastEx?.question || '').slice(0, 80)} → \`${lastEx?.correctAnswer}\``);
      out.push('');
      out.push('- [ ] The example shows the METHOD, not just the answer.');
      out.push('- [ ] First exercise is clearly achievable with the example alone.');
      out.push('- [ ] Last exercise genuinely extends the skill (not just a harder instance).');
      out.push(`- [ ] Rationales teach the *why* — sample ${Math.min(3, x.all.length)} random ones and verify.`);
      if (genericCount) out.push(`- [ ] **${genericCount}** rationale(s) flagged as "generic" — spot-check they really do teach.`);
      out.push('- [ ] No unintended distractor patterns (e.g. always pick the longest / always pick "b").');
      out.push('- [ ] Subject-matter accuracy — a domain expert would sign off.');
      out.push('');
    }
    out.push('---');
    out.push('');
  }

  process.stdout.write(out.join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
