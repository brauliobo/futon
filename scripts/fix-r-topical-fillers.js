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
  /^Limited to [\p{L}\d]+(\s\p{L}+)? without broader/u,
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
];

// Generic topical-near-miss templates: take a "topic" extracted from question
// and produce siblings. We'll use 3 templates, picking by occurrence index.
function makeNearMisses(question, correctAns, n, fileCounter) {
  const topic = extractTopic(question, correctAns);
  const templates = [
    `Restricted to a 1990s-era ${topic} cohort framework without independent post-2010 replication`,
    `Driven by a single underpowered ${topic} observational series lacking confirmatory follow-up`,
    `Predates the modern ${topic} consensus and was superseded by post-2015 framework revisions`,
    `Confined to a regional ${topic} pilot program without multinational regulatory adoption`,
    `Built on a since-retracted ${topic} dataset without independent multicenter replication`,
    `Reflects a pre-2000 ${topic} paradigm displaced by current society guideline updates`,
    `Tied to a discontinued industry ${topic} program after pivotal trial readout disappointments`,
    `Limited to a single-center ${topic} case series with no prospective cohort confirmation`,
    `Drawn from registry-only ${topic} retrospective data with confounding never adjusted out`,
    `Anchored on a withdrawn ${topic} guideline statement that subsequent societies disavowed`,
    `Rests on a press-release-only ${topic} announcement without peer-reviewed publication`,
    `Cited from a contested ${topic} meta-analysis with major heterogeneity and publication bias`,
    `Based on a non-randomized ${topic} comparator arm where allocation was investigator-determined`,
    `Belongs to a discontinued early-phase ${topic} program halted after futility readouts`,
  ];
  const out = [];
  for (let i = 0; i < n; i++) out.push(templates[(fileCounter.n++) % templates.length]);
  return out;
}

function extractTopic(question, correctAns) {
  // Pull a short topical phrase from the question by stripping common prefixes
  let q = question.replace(/^(Em|In|O |A |The )\s+/, '').replace(/[…?:.]+$/, '');
  // Take up to first comma or 5 words
  const parts = q.split(/[,(]/)[0].trim().split(/\s+/).slice(0, 5).join(' ');
  return parts.toLowerCase() || 'this topic';
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
