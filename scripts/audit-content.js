#!/usr/bin/env node
// Pedagogical quality audit for all lesson content.
// Checks: choice-answer alignment, rationale quality, spelling, capitalization.
// Usage: node scripts/audit-content.js [--fix] [--subject math|portuguese|english]

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const FIX = args.includes('--fix');
const SUBJECT_FILTER = args.find((_, i, a) => a[i - 1] === '--subject') || null;
const SUBJECTS = SUBJECT_FILTER
  ? [SUBJECT_FILTER]
  : ['math', 'portuguese', 'english'];

// ── Shared helpers ──────────────────────────────────────────────────────────

function normalizeAnswer(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^[\u2018\u2019\u201c\u201d'"`*]+|[\u2018\u2019\u201c\u201d'"`*.]+$/g, '')
    .replace(/\s+/g, '').replace(/,/, '.').toLowerCase();
}

const CHOICE_RE = /\(([^)]+\/[^)]+)\)\s*$/;
// Inline parens act as real choices only when introduced by `:` or `—`.
// Without that lead they are L1-translation hints, IPA marks, or sequence
// glosses — see scripts/eval-answer-in-choices.js for rationale.
const REAL_CHOICE_RE = /[:—]\s*\([^)]+\/[^)]+\)\s*$/;

function parseChoices(question) {
  if (!REAL_CHOICE_RE.test(question)) return null;
  const m = question.match(CHOICE_RE);
  if (!m) return null;
  return m[1].split('/').map(s => s.trim());
}

function loadAll() {
  const root = process.cwd();
  const sets = [];
  for (const subject of SUBJECTS) {
    const dir = path.join(root, 'src', 'levels', subject);
    if (!fs.existsSync(dir)) continue;
    for (const level of fs.readdirSync(dir).sort()) {
      const ld = path.join(dir, level);
      if (!fs.statSync(ld).isDirectory()) continue;
      for (const file of fs.readdirSync(ld).filter(f => /\.ya?ml$/.test(f)).sort()) {
        const fp = path.join(ld, file);
        try {
          const raw = parse(fs.readFileSync(fp, 'utf8'));
          sets.push({ ...raw, subject, level, _file: file, _path: fp });
        } catch { /* validate-sets handles parse errors */ }
      }
    }
  }
  return sets;
}

function relPath(fp) { return fp.replace(process.cwd() + '/', ''); }

function forEachExercise(sets, fn) {
  for (const set of sets)
    for (const page of set.pages || [])
      for (const ex of page.exercises || [])
        fn(ex, page, set);
}

// ── Check 1: Choice-answer alignment ────────────────────────────────────────
// Simulates SetProcessor.parseChoices() + normalizeAnswer() to ensure the
// correctAnswer matches at least one parsed choice.

// Math formulas often end with (x/2) or (a/b) — not choices.
// Heuristic: if subject is math and choices look like formula fragments, skip.
const MATH_FORMULA_RE = /^[a-z0-9√πn²³⁴⁵⁶⁷⁸⁹⁰?∞Σ·.+\-^_₊ₙ()]+$/i;
function looksLikeMathFormula(choices, subject) {
  if (subject !== 'math') return false;
  // If any choice contains spaces → likely real text choices (not formulas)
  if (choices.some(ch => ch.trim().includes(' '))) return false;
  // All short, symbol-like fragments → formula
  return choices.every(ch => MATH_FORMULA_RE.test(ch.trim()));
}

function checkChoices(sets) {
  const issues = [];
  forEachExercise(sets, (ex, page, set) => {
    if (ex.choices || ex.type === 'choice') return;
    const choices = parseChoices(ex.question);
    if (!choices) return;
    if (looksLikeMathFormula(choices, set.subject)) return;

    const norm = normalizeAnswer(ex.correctAnswer);
    const match = choices.some(ch => normalizeAnswer(ch) === norm);
    if (!match) {
      issues.push({
        file: relPath(set._path),
        page: page.pageNumber,
        question: ex.question.slice(0, 60),
        answer: String(ex.correctAnswer),
        choices: choices.join(' | '),
        severity: 'error',
      });
    }

    // Check duplicate choices (all normalize to same value). normalizeAnswer
    // strips accents, so accent-distinction drills like (medicô/médico/medico)
    // legitimately collapse — that's the whole point of the exercise. Skip
    // when the *raw* choices are distinct (the drill is testing punctuation
    // or accent rather than spelling).
    const rawDistinct = new Set(choices.map(c => c.trim())).size;
    const unique = new Set(choices.map(normalizeAnswer));
    if (unique.size < choices.length && unique.size === 1 && rawDistinct === choices.length) {
      // raw-distinct + accent-normalized collapse → accent drill, skip
    } else if (unique.size < choices.length && unique.size === 1) {
      issues.push({
        file: relPath(set._path),
        page: page.pageNumber,
        question: ex.question.slice(0, 60),
        answer: String(ex.correctAnswer),
        choices: choices.join(' | '),
        severity: 'warn',
        note: 'all choices identical',
      });
    }
  });
  return issues;
}

// ── Check 2: Rationale quality ──────────────────────────────────────────────

const PLACEHOLDER_RE = /^(Analise a frase|Aplique a regra|Releia a informa|Reveja o trecho|Resposta:)/i;

const TOPIC_KEYWORDS = {
  punctuation: /pontuação|ponto final|ponto de interrogação|ponto de exclamação|vírgula|dois[- ]pontos|reticências/i,
  verb:        /\bverbo\b|conjuga[çr]|tempo verbal|pretérito|imperativo|subjuntivo|indicativo/i,
  agreement:   /concordância|gênero e número|masculino plural|feminino plural|singular.*plural/i,
};

function detectTopic(text) {
  for (const [topic, re] of Object.entries(TOPIC_KEYWORDS))
    if (re.test(text)) return topic;
  return null;
}

function checkRationales(sets) {
  const issues = [];
  forEachExercise(sets, (ex, page, set) => {
    if (!ex.rationale) return;
    const r = ex.rationale;

    // Placeholder rationale
    if (PLACEHOLDER_RE.test(r)) {
      issues.push({
        file: relPath(set._path),
        page: page.pageNumber,
        question: ex.question.slice(0, 50),
        rationale: r.slice(0, 60),
        severity: 'warn',
        note: 'placeholder rationale',
      });
      return;
    }

    // Topic mismatch: question about punctuation, rationale about verbs
    if (set.subject !== 'portuguese') return;
    // Only flag if question has a clear single topic AND rationale has a
    // DIFFERENT single topic with NO overlap. Many rationales validly mention
    // related topics (e.g., explaining concordância by referencing the verb).
    const qTopics = Object.entries(TOPIC_KEYWORDS).filter(([, re]) => re.test(ex.question)).map(([t]) => t);
    const rTopics = Object.entries(TOPIC_KEYWORDS).filter(([, re]) => re.test(r)).map(([t]) => t);
    if (qTopics.length === 1 && rTopics.length === 1 && qTopics[0] !== rTopics[0]) {
      issues.push({
        file: relPath(set._path),
        page: page.pageNumber,
        question: ex.question.slice(0, 50),
        rationale: r.slice(0, 60),
        severity: 'error',
        note: `question=${qTopics[0]} rationale=${rTopics[0]}`,
      });
    }
  });
  return issues;
}

// ── Check 3: Portuguese spelling ────────────────────────────────────────────

const PT_ACCENT_FIXES = [
  [/\bAgua\b/, 'Água'], [/\bagua\b/, 'água'],
  [/\bCafe\b/, 'Café'], [/\bcafe\b/, 'café'],
  [/\bVoce\b/, 'Você'], [/\bvoce\b/, 'você'],
  [/\bAte\b(?!\s+[a-z])/, 'Até'], // "Ate" at start could be English
];

const PT_GENDER_ERRORS = [
  [/\bo cor\b/i, 'a cor'],
  [/\bo flor\b/i, 'a flor'],
  [/\ba livro\b/i, 'o livro'],
];

function checkSpelling(sets) {
  const issues = [];
  const ptSets = sets.filter(s => s.subject === 'portuguese');
  forEachExercise(ptSets, (ex, page, set) => {
    const texts = [ex.question, String(ex.correctAnswer), ex.rationale].filter(Boolean);
    for (const text of texts) {
      // Double parentheses
      if (/\)\)/.test(text)) {
        issues.push({
          file: relPath(set._path), page: page.pageNumber,
          text: text.slice(0, 60), severity: 'error', note: 'double ))',
        });
      }
      // Double spaces (skip if in fill-blank patterns)
      if (/[^ ]  [^ ]/.test(text) && !/___/.test(text)) {
        issues.push({
          file: relPath(set._path), page: page.pageNumber,
          text: text.slice(0, 60), severity: 'warn', note: 'double space',
        });
      }
      // Missing accents (skip if inside choice options — the wrong form may be a distractor)
      const isQuestion = text === ex.question;
      const choicePart = isQuestion && CHOICE_RE.test(text) ? text.match(CHOICE_RE)[1] : '';
      const textToCheck = isQuestion ? text.replace(CHOICE_RE, '') : text;
      for (const [re, fix] of PT_ACCENT_FIXES) {
        if (re.test(textToCheck)) {
          issues.push({
            file: relPath(set._path), page: page.pageNumber,
            text: textToCheck.slice(0, 60), severity: 'warn', note: `accent: ${fix}`,
          });
        }
      }
      // Gender errors
      for (const [re, fix] of PT_GENDER_ERRORS) {
        if (re.test(text)) {
          issues.push({
            file: relPath(set._path), page: page.pageNumber,
            text: text.slice(0, 60), severity: 'error', note: `gender: ${fix}`,
          });
        }
      }
    }
  });
  return issues;
}

// ── Check 4: English capitalization ─────────────────────────────────────────

// "may" excluded — modal verb false positive overwhelms the month sense
const EN_PROPER_NOUNS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|june|july|august|september|october|november|december|english|french|spanish|japanese|portuguese|chinese|german|korean|italian|brazil|são paulo|tokyo|paris|london|england)\b/;

function checkEnglishCaps(sets) {
  const issues = [];
  const enSets = sets.filter(s => s.subject === 'english');
  forEachExercise(enSets, (ex, page, set) => {
    const ans = String(ex.correctAnswer);
    if (!ans.includes(' ')) return; // single word, skip

    // Sentence starting lowercase. Only flag when the answer is a
    // proper sentence (terminal . ? !) — grammar-fragment answers
    // like 'before consonant sounds' or 'a big cat' legitimately
    // start lowercase.
    if (/^[a-z]/.test(ans) && /[.?!]\s*$/.test(ans)) {
      issues.push({
        file: relPath(set._path), page: page.pageNumber,
        answer: ans.slice(0, 50), severity: 'warn', note: 'starts lowercase',
      });
    }
    // Pronoun "i" not capitalized. Skip when 'i' refers to the letter
    // (phonics rationales mention IPA /ɪ/ /aɪ/, 'long i', 'short i',
    // 'silent e', 'I i' pairing, or 'letter i' / 'letra i').
    if (/\/[ɪaɪɛoʊuʊɔɑæə]/.test(ans) || /\b(?:long|short|silent|letra|letter)\s+i\b/i.test(ans) || /\bi\s+(?:long|short)\b/i.test(ans) || /\bI\s+i\b/.test(ans)) return;
    if (/\bi\b/.test(ans) && !/\bi\b/.test(ans.replace(/\bI\b/g, ''))) return; // already uppercase
    if (/\bi[' ]/.test(ans) || / i /.test(ans) || / i$/.test(ans)) {
      issues.push({
        file: relPath(set._path), page: page.pageNumber,
        answer: ans.slice(0, 50), severity: 'warn', note: 'lowercase "i" pronoun',
      });
    }
    // Proper nouns
    if (EN_PROPER_NOUNS.test(ans)) {
      const match = ans.match(EN_PROPER_NOUNS);
      issues.push({
        file: relPath(set._path), page: page.pageNumber,
        answer: ans.slice(0, 50), severity: 'warn', note: `lowercase: ${match[1]}`,
      });
    }
  });
  return issues;
}

// ── Check 5: Target vs actual exercise count ────────────────────────────────

function checkTargets(sets) {
  const issues = [];
  for (const set of sets) {
    const actual = (set.pages || []).reduce((n, p) => n + (p.exercises || []).length, 0);
    if (set.target && set.target !== actual) {
      issues.push({
        file: relPath(set._path),
        target: set.target, actual,
        severity: 'error',
        note: `target=${set.target} actual=${actual}`,
      });
    }
  }
  return issues;
}

// ── Check 6: Cross-set duplicate questions within a level ───────────────────
// Students progress through sets within a level sequentially. If the same
// question appears in two different sets, they'll see it twice.

function checkCrossSetDuplicates(sets) {
  const issues = [];
  // Group sets by subject+level
  const byLevel = {};
  for (const set of sets) {
    const key = `${set.subject}/${set.level}`;
    (byLevel[key] ??= []).push(set);
  }

  for (const [level, levelSets] of Object.entries(byLevel)) {
    // Skip math — Kumon drills are intentionally repeated across sets
    if (level.startsWith('math/')) continue;

    // Revision/review sets (typically set_19/set_20 with 'Revisão'/'Review'
    // in the title) are designed to re-test earlier content — duplication
    // is the feature, not a bug.
    const isRevisionSet = (set) => {
      const title = typeof set.title === 'object' ? (set.title?.pt ?? set.title?.en ?? '') : String(set.title || '');
      return /revis(ão|ao|ão geral|ion|iew|ón)|review|mixed|cumulative/i.test(title);
    };
    const seen = new Map();
    for (const set of levelSets) {
      if (isRevisionSet(set)) continue;
      for (const page of set.pages || []) {
        for (const ex of page.exercises || []) {
          const q = normalizeAnswer(ex.question);
          if (q.length < 20) continue; // skip very short questions
          const prev = seen.get(q);
          if (prev && prev.file !== set._file) {
            issues.push({
              file: `${relPath(set._path)} ↔ ${prev.file}`,
              severity: 'warn',
              note: `duplicate across sets in ${level}`,
              question: (ex.question || '').slice(0, 55),
            });
          } else if (!prev) {
            seen.set(q, { file: set._file, question: ex.question });
          }
        }
      }
    }
  }
  return issues;
}

// ── Main ────────────────────────────────────────────────────────────────────

const sets = loadAll();
const checks = [
  { name: 'Choice-answer alignment', fn: checkChoices },
  { name: 'Rationale quality',       fn: checkRationales },
  { name: 'Portuguese spelling',     fn: checkSpelling },
  { name: 'English capitalization',  fn: checkEnglishCaps },
  { name: 'Target vs exercise count', fn: checkTargets },
  { name: 'Cross-set duplicates',    fn: checkCrossSetDuplicates },
];

let totalErrors = 0, totalWarns = 0;

for (const { name, fn } of checks) {
  const issues = fn(sets);
  const errors = issues.filter(i => i.severity === 'error');
  const warns = issues.filter(i => i.severity === 'warn');
  totalErrors += errors.length;
  totalWarns += warns.length;

  if (!issues.length) {
    console.log(`${c('✅', GREEN)} ${name}: clean`);
    continue;
  }

  console.log(`\n${c('─'.repeat(70), CYAN)}`);
  console.log(`${c(name, BOLD)} — ${c(errors.length + ' errors', errors.length ? RED : GREEN)}, ${c(warns.length + ' warnings', warns.length ? YELLOW : GREEN)}`);
  console.log(c('─'.repeat(70), CYAN));

  // Show all errors first, then warnings up to 30 total
  const sorted = [...errors, ...warns];
  for (const i of sorted.slice(0, 50)) {
    const sev = i.severity === 'error' ? c('ERR', RED) : c('WRN', YELLOW);
    const loc = `${i.file}${i.page ? ':p' + i.page : ''}`;
    const detail = i.note || '';
    const ctx = i.answer || i.question || i.text || '';
    console.log(`  ${sev} ${loc}  ${detail}  ${ctx.slice(0, 55)}`);
  }
  if (sorted.length > 50) console.log(`  ... and ${sorted.length - 50} more`);
}

console.log(`\n${'═'.repeat(70)}`);
const ok = totalErrors === 0;
console.log(`${c(ok ? '✅ PASSED' : '❌ FAILED', ok ? GREEN : RED)} (${totalErrors} errors, ${totalWarns} warnings)`);
process.exit(ok ? 0 : 1);
