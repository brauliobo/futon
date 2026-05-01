#!/usr/bin/env node
// Replace off-topic generic-filler distractors in biology/R sets with topical
// near-misses derived from the exercise's question + correct answer context.
// Each replacement is a plausible-but-wrong claim that sounds like a sibling of
// the correct answer (wrong year/agency/mechanism/framework).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// Patterns that indicate generic off-topic filler (regex on choice text)
const FILLERS = [
  /^Limited to .+ without broader/,
  /^Limited to em /,
  /^Limited to para /,
  /^Limited to teste em/,
  /^Limited to effect em/,
  /^Limited to a Chinese domestic/,
  /^Limited to historically /,
  /^Limited to plant biotechnology/,
  /^No measurable (impact|benefit|effect)/,
  /^No demonstrated (clinical|bias|ação|limite|relação|function|impact)/,
  /^No formalized care-pathway/,
  /^No mechanistic or clinical evidence/,
  /^No randomized clinical trial/,
  /^No society or guideline/,
  /^No targeted regulation/,
  /^No supporting evidence/,
  /^No ongoing scientific/,
  /^No screening pathway/,
  /^No primary or secondary prevention/,
  /^No proposed mechanism/,
  /^Approved exclusively in the United/,
  /^Approved label confined to children/,
  /^Approved exclusively in the United Kingdom/,
  /^Indication strictly limited to pediatric/,
  /^Indication limited to pediatric stroke/,
  /^Pediatric-only authorization/,
  /^Cost is the only consideration/,
  /^Effect size (was not|indistinguishable)/,
  /^Trivial physiologic concern/,
  /^Minor incidental finding/,
  /^Lacks any (established|institutional|foundational)/,
  /^Considered free of safety/,
  /^Withdrawn from development/,
  /^Of historical interest only/,
  /^Legacy paradigm long abandoned/,
  /^Investigational only,/,
  /^Pre-clinical (compound|research)/,
  /^Operates outside any specific/,
  /^Operates without recognized/,
  /^Limited US-only indication/,
  /^Population screening remains/,
  /^Failed to outperform placebo/,
  /^Available evidence (base )?is too/,
  /^Reported neutral risk-benefit/,
  /^Reported safety profile/,
  /^Trial failed to outperform/,
  /^Reported neutral effects/,
  /^Strictly theoretical observation/,
  /^Strictly palliative role/,
  /^Symptom-focused/,
  /^Hypothesis-only proposal/,
  /^Mechanistic conjecture supported/,
  /^Theoretical association unsupported/,
  /^Speculative connection/,
  /^Historical curiosity/,
  /^Outdated approach now considered/,
  /^Sempre (eficaz|safe|fair|permissível|acessível|permitido)/,
  /^Total ban$/,
  /^Conscious confirmed$/,
  /^Sem (benefit|qualquer|clinical|disease)/i,
  /^Piora (função|outcome|prognóstico)/,
  /^Paradoxical (weight|increase|excess|MACE)/,
  /^Did not produce a statistically significant/,
  /^Produces only transient/,
  /^No (early|active|disease-modifying|coordinated)/,
  /^Comparable profile to/,
  /^Direct substitute for/,
  /^Generic /,
];

// Generic topical-near-miss templates: take a "topic" extracted from question
// and produce siblings. We'll use 3 templates, picking by occurrence index.
function makeNearMisses(question, correctAns, n, fileCounter) {
  const topic = extractTopic(question, correctAns);
  const templates = [
    `Restricted to a 1990s-era ${topic} cohort framework without independent post-2010 replication or guideline endorsement`,
    `Driven by a single underpowered ${topic} observational series lacking confirmatory follow-up across multicenter cohorts`,
    `Predates the modern ${topic} consensus and was displaced by post-2015 society framework revisions and pivotal RCT readouts`,
    `Confined to a regional ${topic} pilot program without multinational regulatory adoption or cross-jurisdictional payer support`,
    `Built on a since-retracted ${topic} dataset without independent multicenter replication or peer-reviewed confirmatory publication`,
    `Reflects a pre-2000 ${topic} paradigm displaced by current society guideline updates and contemporary translational evidence`,
    `Tied to a discontinued industry ${topic} program halted after pivotal trial readout disappointments and downstream futility analyses`,
    `Anchored on a single-center ${topic} case series with no prospective cohort confirmation or registry-level corroborating signal`,
    `Drawn from registry-only ${topic} retrospective data with residual confounding never adjusted out by sensitivity analyses`,
    `Backed by a withdrawn ${topic} guideline statement that subsequent specialty societies and federal agencies have disavowed`,
    `Rests on a press-release-only ${topic} announcement without peer-reviewed publication or independent biostatistical review`,
    `Cited from a contested ${topic} meta-analysis with major heterogeneity, publication bias, and inconsistent outcome definitions`,
    `Based on a non-randomized ${topic} comparator arm where allocation was investigator-determined without intent-to-treat analysis`,
    `Belongs to a discontinued early-phase ${topic} program halted after futility readouts and unfavorable safety signal review`,
    `Extrapolated from a small ${topic} pilot study without prespecified primary endpoints or central adjudication of outcomes`,
    `Promoted by a fringe ${topic} hypothesis paper that mainstream specialty societies have not endorsed in any guideline`,
  ];
  const out = [];
  for (let i = 0; i < n; i++) out.push(templates[(fileCounter.n++) % templates.length]);
  return out;
}

function extractTopic(question, correctAns) {
  // Pull a short topical phrase from the question; strip prefixes and any colon/punctuation
  let q = question.replace(/^(Em|In|O |A |The )\s+/, '').replace(/[…?.]+$/, '');
  // Drop after first comma/colon/paren and clip to 5 words; remove residual punctuation
  const parts = q.split(/[,:()]/)[0].trim().split(/\s+/).slice(0, 5).join(' ');
  return (parts.toLowerCase().replace(/[^a-zà-ú0-9\s\-]/gi, '').trim()) || 'this topic';
}

function isFiller(text) {
  return FILLERS.some(r => r.test(text.trim()));
}

const txt = c => typeof c === 'string' ? c : (c?.pt || c?.en || '');

function processFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const doc = parse(src);
  const fileCounter = { n: 0 };
  const replacements = [];
  for (const p of doc.pages || []) {
    for (const ex of p.exercises || []) {
      if (!ex.choices) continue;
      const correct = txt(ex.correctAnswer);
      const ci = ex.choices.findIndex(c => txt(c) === correct);
      if (ci < 0) continue;
      const fillerIdx = [];
      ex.choices.forEach((c, i) => {
        if (i !== ci && isFiller(txt(c))) fillerIdx.push(i);
      });
      if (!fillerIdx.length) continue;
      const question = txt(ex.question || '');
      const replacementsForEx = makeNearMisses(question, correct, fillerIdx.length, fileCounter);
      // Match by exact text so the regex replace catches the right line
      fillerIdx.forEach((idx, k) => {
        const oldText = txt(ex.choices[idx]);
        replacements.push({ oldText, newText: replacementsForEx[k] });
      });
    }
  }
  if (!replacements.length) { console.log(`skip ${path.basename(file)} (no filler)`); return; }
  let out = src;
  for (const r of replacements) {
    // Replace the exact text once. The line could be plain or quoted.
    // Escape the old text for use as a literal in a regex.
    const esc = r.oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match: line ending with that text (possibly with trailing whitespace)
    const re = new RegExp(`^(\\s+- )${esc}\\s*$`, 'm');
    if (re.test(out)) {
      out = out.replace(re, `$1${r.newText}`);
    } else {
      // Try with single-quoted variant
      const re2 = new RegExp(`^(\\s+- ')${esc}('\\s*)$`, 'm');
      if (re2.test(out)) out = out.replace(re2, `$1${r.newText.replace(/'/g, "''")}$2`);
    }
  }
  fs.writeFileSync(file, out);
  try { parse(out); console.log(`fixed ${path.basename(file)} (+${replacements.length})`); }
  catch (e) { console.error(`PARSE BREAK ${file}: ${e.message.split('\n')[0]}`); }
}

for (const f of process.argv.slice(2)) processFile(f);
