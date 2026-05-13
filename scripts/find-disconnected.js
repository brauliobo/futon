#!/usr/bin/env node
// Find rationales that don't share any content word with their own question
// or correctAnswer. Catches copy-paste-gone-wrong bugs like the ones in
// portuguese/A/set_04.yaml (now fixed) where rationales described a different
// topic than what was asked. Complements audit-content.js which only checks
// a few hard-coded topic pairs.
//
// Usage:
//   node scripts/find-disconnected.js                             # all subjects
//   node scripts/find-disconnected.js --subject portuguese        # filter
//   node scripts/find-disconnected.js --level C --min-overlap 2   # stricter
//   node scripts/find-disconnected.js --json

import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { parse } from 'yaml';
import { categorize } from './lib/rationale.js';
import { asText } from './lib/i18n.js';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SUBJECT = argVal('--subject');
const LEVEL = argVal('--level');
const MIN_OVERLAP = parseInt(argVal('--min-overlap') || '1', 10);
const JSON_OUT = args.includes('--json');
const SUBJECTS = SUBJECT ? [SUBJECT] : ['math', 'portuguese', 'english', 'japanese'];

// Stopwords stored in normalized (NFD-stripped) form to match contentWords output.
const STOPWORDS = new Set([
  // PT (normalized — no accents)
  'para', 'como', 'onde', 'isso', 'essa', 'esse', 'este', 'esta', 'isto',
  'aqui', 'entre', 'mais', 'menos', 'pelo', 'pela', 'pelos', 'pelas',
  'seus', 'suas', 'meus', 'minhas', 'qual', 'quais', 'sobre', 'quem',
  'quando', 'outro', 'outra', 'entao', 'depois', 'antes', 'entre',
  'quantas', 'quantos', 'quanto', 'porque', 'pois', 'logo', 'assim',
  'sempre', 'nunca', 'dentro', 'fora', 'tanto', 'todos', 'todas',
  'voce', 'voces', 'nosso', 'nossa', 'nossos', 'nossas', 'ainda',
  // Tiny connecting verbs
  'havia', 'tenho', 'temos', 'estao', 'estava', 'estamos', 'serao',
  // EN
  'what', 'when', 'where', 'which', 'whose', 'whom', 'this', 'that',
  'these', 'those', 'with', 'from', 'they', 'them', 'their', 'your',
  'some', 'have', 'been', 'about', 'into', 'just', 'than', 'then',
  'very', 'also', 'each', 'every', 'here', 'there',
]);

const CHOICE_RE = /\(([^)]+\/[^)]+)\)\s*$/;

function contentWords(text) {
  const s = asText(text).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = s.match(/[a-z]{4,}/g) || [];
  return new Set(words.filter(w => !STOPWORDS.has(w)));
}

function overlap(a, b) {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

function loadAll() {
  const sets = [];
  for (const subject of SUBJECTS) {
    const dir = path.join(process.cwd(), 'src', 'levels', subject);
    if (!fs.existsSync(dir)) continue;
    for (const level of fs.readdirSync(dir).sort()) {
      if (LEVEL && level !== LEVEL) continue;
      const ld = path.join(dir, level);
      if (!fs.statSync(ld).isDirectory()) continue;
      for (const file of fs.readdirSync(ld).filter(f => /\.ya?ml$/.test(f)).sort()) {
        try {
          const raw = parse(fs.readFileSync(path.join(ld, file), 'utf8'));
          sets.push({ ...raw, subject, level, _file: file });
        } catch { /* validate-sets reports parse errors */ }
      }
    }
  }
  return sets;
}

function findDisconnected(sets) {
  const rows = [];
  for (const set of sets) {
    for (const p of set.pages || []) {
      for (const ex of p.exercises || []) {
        const rText = asText(ex.rationale);
        if (!rText) continue;

        const qClean = asText(ex.question).replace(CHOICE_RE, '');
        const qWords = contentWords(qClean);
        const aWords = contentWords(asText(ex.correctAnswer));
        const ref = new Set([...qWords, ...aWords]);
        if (qWords.size + aWords.size < 2) continue;

        const rLower = rText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const ansNorm = asText(ex.correctAnswer).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (ansNorm && rLower.includes(ansNorm)) continue; // answer appears verbatim
        const rWords = contentWords(rText);
        const shared = overlap(ref, rWords);
        if (shared < MIN_OVERLAP) {
          rows.push({
            file: `${set.subject}/${set.level}/${set._file}`,
            page: p.pageNumber,
            question: asText(ex.question).slice(0, 50),
            answer: asText(ex.correctAnswer).slice(0, 20),
            rationale: rText.slice(0, 80),
            shared,
          });
        }
      }
    }
  }
  return rows;
}

// Placeholder template: same rationale string used for N+ different questions
// inside one set AND the rationale shares no content word with ANY of those
// questions. Drill repetition with a correct shared principle (e.g. "Somar 0
// não muda o número" across all X+0) is excluded because the rationale's
// words overlap with its questions' answers/numbers. Pure placeholders like
// "Responda conforme a pergunta" match nothing → flagged.
function findPlaceholderTemplates(sets, threshold = 3) {
  const hits = [];
  for (const set of sets) {
    const groups = new Map();
    for (const p of set.pages || []) {
      for (const ex of p.exercises || []) {
        if (!ex.rationale || typeof ex.rationale !== 'string') continue;
        const key = ex.rationale.trim();
        if (key.length < 20) continue;
        const g = groups.get(key) || { exercises: [] };
        g.exercises.push(ex);
        groups.set(key, g);
      }
    }
    for (const [rationale, { exercises }] of groups) {
      if (exercises.length < threshold) continue;
      // A rationale that teaches a method is valid drill pedagogy even if
      // repeated (e.g. "Conte cada símbolo uma vez, seguindo a ordem.").
      if (categorize(rationale) === 'method') continue;
      const rLower = rationale.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const rWords = contentWords(rationale);
      // Consider a rationale *connected* to an exercise if:
      //   (a) it shares a 4+ char content word with the question/answer, OR
      //   (b) it literally contains the correctAnswer substring
      //      (covers short-answer drills like "par"/"ímpar"/single digits).
      const withWords = exercises
        .map(ex => {
          const qClean = asText(ex.question).replace(CHOICE_RE, '');
          const ans = asText(ex.correctAnswer).trim();
          const ansNorm = ans.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const ref = new Set([...contentWords(qClean), ...contentWords(ans)]);
          const hasSubstring = ansNorm.length >= 1 && rLower.includes(ansNorm);
          return { ex, ref, hasSubstring };
        })
        .filter(r => r.ref.size > 0 || r.hasSubstring);
      if (withWords.length < threshold) continue;
      const overlapCount = withWords.filter(r => r.hasSubstring || overlap(r.ref, rWords) >= 1).length;
      if (overlapCount / withWords.length >= 0.2) continue;
      hits.push({
        file: `${set.subject}/${set.level}/${set._file}`,
        count: exercises.length,
        rationale: rationale.slice(0, 80),
        sampleQuestion: String(exercises[0].question || '').slice(0, 50),
      });
    }
  }
  return hits.sort((a, b) => b.count - a.count);
}

function main() {
  const sets = loadAll();
  const disconnected = findDisconnected(sets);
  const templates = findPlaceholderTemplates(sets);

  if (JSON_OUT) { console.log(JSON.stringify({ disconnected, templates }, null, 2)); return; }

  console.log(c(`\n🔁 PLACEHOLDER TEMPLATES (same rationale ≥3× in one set, no overlap with any of its questions)`, BOLD + CYAN));
  if (!templates.length) {
    console.log(c('  ✅ None.', '\x1b[32m'));
  } else {
    const tt = new Table({
      head: ['FILE', 'USES', 'RATIONALE', 'SAMPLE Q'].map(h => c(h, BOLD)),
      style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
      colWidths: [30, 6, 72, 40], wordWrap: true,
    });
    for (const t of templates.slice(0, 25)) {
      tt.push([t.file, c(t.count, t.count >= 10 ? RED : YELLOW), t.rationale, t.sampleQuestion]);
    }
    console.log(tt.toString());
    if (templates.length > 25) console.log(c(`  ... and ${templates.length - 25} more`, GRAY));
  }

  console.log(c(`\n🔎 DISCONNECTED RATIONALES (no content-word overlap, overlap < ${MIN_OVERLAP})`, BOLD + CYAN));
  console.log(c(`Scanned ${sets.length} sets · found ${disconnected.length} suspects (many may be fine — this is a triage list)\n`, GRAY));

  const byFile = {};
  for (const r of disconnected) (byFile[r.file] = byFile[r.file] || []).push(r);
  const sorted = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length).slice(0, 15);
  if (!sorted.length) {
    console.log(c('  ✅ None.', '\x1b[32m'));
  } else {
    const t = new Table({
      head: ['FILE', 'COUNT', 'SAMPLE QUESTION', 'SAMPLE RATIONALE'].map(h => c(h, BOLD)),
      style: { head: [], border: [], compact: true, 'padding-left': 1, 'padding-right': 1 },
      colWidths: [30, 7, 40, 70], wordWrap: true,
    });
    for (const [file, rows] of sorted) {
      t.push([file, c(rows.length, rows.length > 10 ? RED : YELLOW), rows[0].question, rows[0].rationale]);
    }
    console.log(t.toString());
  }
  console.log(c(`\n  Tune with --min-overlap 2, scope with --subject/--level.`, GRAY));
  console.log(c(`  Drill into one file: node scripts/rationale-review.js <file>`, GRAY));

  // Exit nonzero when any templates are found (high-confidence bug)
  process.exit(templates.length ? 1 : 0);
}

main();
