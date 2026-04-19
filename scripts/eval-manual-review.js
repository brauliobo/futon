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
    // Rationale diversity: low unique-rationale count hints at bucket-misroute
    // bugs (iter 82-92 found 594+ across math/J, 5A, I, O, M).
    const totalUniqueRats = new Set(
      sets.flatMap(x => x.all.map(e => String(e.rationale || '').trim()).filter(Boolean))
    );
    const diversityRatio = totalExs ? totalUniqueRats.size / totalExs : 0;
    out.push(`**Level stats:** ${sets.length} sets · ${totalExs} exercises · ${uniqueObjectives.size} objectives · ${totalGeneric} generic rationales · ${totalUniqueRats.size} unique rationales (${Math.round(diversityRatio * 100)}%)`);
    out.push('');
    out.push('### Level-wide checks');
    out.push('- [ ] **Progression readability** — Can a new student start at set_01 and feel each set building on the prior?');
    out.push('- [ ] **Example-exercise alignment** — Does each set\'s `example` use the same operation/structure as its exercises?');
    out.push('- [ ] **Cultural fit** — Are names, places, contexts appropriate for the age group?');
    out.push('- [ ] **Objective coverage** — Are all objectives listed also reached in exercises (no dangling/orphan tags)?');
    if (diversityRatio < 0.15) {
      out.push(`- [ ] ⚠️ **Rationale diversity low** (${Math.round(diversityRatio*100)}%) — spot-check whether the same rationale is misapplied across unrelated exercise shapes. Run \`pnpm eval:diversity\`.`);
    }
    if (totalGeneric > totalExs * 0.1) {
      out.push(`- [ ] ⚠️ **${totalGeneric} generic rationales** — check these against their exercises; they may need domain-specific rewrites (see scripts/fix-*-rationales.js templates).`);
    }
    out.push('');
    // Per-set block
    for (const x of sets) {
      const firstEx = x.all[0];
      const lastEx = x.all[x.all.length - 1];
      const genericCount = x.all.filter(e => categorize(e.rationale) === 'generic').length;
      // Tautological rationales: patterns that echo the answer without teaching
      const tautPats = [
        /^Observe as opções e escolha/,
        /^(A resposta [eé]|Resposta:)/i,
        /pertence à categoria:/,
      ];
      const tautCount = x.all.filter(e => {
        const r = String(e.rationale || '');
        if (!r) return false;
        if (tautPats.some(p => p.test(r))) return true;
        const a = String(e.correctAnswer || '').trim();
        const m = /:\s*['"“”‘’]([^'"“”‘’]+)['"“”‘’]\.?$/.exec(r);
        return m && a && m[1].trim().toLowerCase() === a.toLowerCase();
      }).length;
      // Inline (a/b/c/d) choice questions where correct is THE longest option
      let choiceQs = 0, correctLongest = 0;
      for (const e of x.all) {
        const m = /\(([^()]*\/[^()]*)\)\s*$/.exec(String(e.question || ''));
        if (!m) continue;
        const parts = m[1].split('/').map(z => z.trim()).filter(Boolean);
        if (parts.length < 3) continue;
        const ans = String(e.correctAnswer || '').trim();
        if (!parts.includes(ans)) continue;
        choiceQs++;
        const lens = parts.map(z => z.length);
        const maxLen = Math.max(...lens);
        if (ans.length === maxLen && lens.filter(z => z === maxLen).length === 1) correctLongest++;
      }
      const lengthBiasFrac = choiceQs ? correctLongest / choiceQs : 0;
      // Per-page difficulty progression: flag if last page easier than first
      // OR ≥3 page-to-page regressions (excluding tight interleaved-drill).
      const pageMedians = (x.s.pages || [])
        .filter(p => (p.exercises || []).length)
        .map(p => {
          const ds = p.exercises.map(e => e.difficulty || x.s.difficulty || 3).sort((a, b) => a - b);
          const m = Math.floor(ds.length / 2);
          return ds.length % 2 ? ds[m] : (ds[m - 1] + ds[m]) / 2;
        });
      const pmRange = pageMedians.length ? Math.max(...pageMedians) - Math.min(...pageMedians) : 0;
      let pmRegCount = 0, pmAdvCount = 0;
      for (let i = 1; i < pageMedians.length; i++) {
        if (pageMedians[i] < pageMedians[i - 1]) pmRegCount++;
        else if (pageMedians[i] > pageMedians[i - 1]) pmAdvCount++;
      }
      const pmInterleaved = pmRange <= 1.0 && Math.abs(pmRegCount - pmAdvCount) <= 1;
      const pmRegressive = pageMedians.length >= 5 && pmRange > 0 &&
        pageMedians[pageMedians.length - 1] - pageMedians[0] <= -1.0;
      const pmNoisy = pageMedians.length >= 5 && pmRange > 0 && pmRegCount >= 3 && !pmInterleaved;
      out.push(`### ${x.name}`);
      out.push(`**Title:** ${x.s.title || '(untitled)'}`);
      out.push(`**Example:** ${(x.s.example || '').slice(0, 100)}`);
      out.push(`**First exercise:** ${String(firstEx?.question || '').slice(0, 80)} → \`${firstEx?.correctAnswer}\``);
      out.push(`**Last exercise:** ${String(lastEx?.question || '').slice(0, 80)} → \`${lastEx?.correctAnswer}\``);
      out.push('');
      // Per-set rationale diversity to surface bucket-misroutings
      const setRats = new Set(x.all.map(e => String(e.rationale || '').trim()).filter(Boolean));
      const setAns = new Set(x.all.map(e => String(e.correctAnswer ?? '').trim()).filter(Boolean));
      const setDiversity = setAns.size ? setRats.size / Math.min(setAns.size, x.all.length) : 1;
      out.push(`**Unique rationales / answers:** ${setRats.size} / ${setAns.size}`);
      out.push('');
      out.push('- [ ] The example shows the METHOD, not just the answer.');
      out.push('- [ ] First exercise is clearly achievable with the example alone.');
      out.push('- [ ] Last exercise genuinely extends the skill (not just a harder instance).');
      out.push(`- [ ] Rationales teach the *why* — sample ${Math.min(3, x.all.length)} random ones and verify.`);
      if (genericCount) out.push(`- [ ] **${genericCount}** rationale(s) flagged as "generic" — spot-check they really do teach.`);
      if (tautCount >= 3) out.push(`- [ ] ⚠️ **${tautCount} tautological rationale(s)** — echo answer without teaching. Rewrite per PEDAGOGY.md "Manual rewrite guide" (story-ref / property-contrast / ordering / grammar-category).`);
      if (setDiversity < 0.3 && x.all.length >= 10 && setAns.size >= 5) {
        out.push(`- [ ] ⚠️ **${Math.round(setDiversity*100)}% rationale diversity** — one rationale covers many distinct answers. Check every bucket's exercises match its rationale's topic (see iter 82 math/J binomial bug).`);
      }
      out.push('- [ ] No unintended distractor patterns (e.g. always pick the longest / always pick "b").');
      if (choiceQs >= 4 && lengthBiasFrac > 0.4) {
        out.push(`- [ ] ⚠️ **${correctLongest}/${choiceQs} (${Math.round(lengthBiasFrac*100)}%) of choice questions: correct is THE longest option** — rewrite distractors with equivalent specificity so length isn't a tell.`);
      }
      if (pmRegressive) {
        out.push(`- [ ] ⚠️ **Regressive progression** — last page median difficulty (${pageMedians[pageMedians.length-1]}) < first page (${pageMedians[0]}). Reorder pages or adjust difficulties so the set climbs.`);
      }
      if (pmNoisy) {
        out.push(`- [ ] ⚠️ **Noisy progression** (${pmRegCount} page-to-page regressions) — sequence [${pageMedians.join(',')}]. Smooth so each page ≥ previous.`);
      }
      out.push('- [ ] Subject-matter accuracy — a domain expert would sign off.');
      out.push('- [ ] `passCriteria.maxAvgSecondsPerExercise` × exerciseCount lands inside the level\'s Kumon time band (see `pnpm eval:time`).');
      out.push('');
    }
    out.push('---');
    out.push('');
  }

  process.stdout.write(out.join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
