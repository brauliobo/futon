#!/usr/bin/env node
// Generates method-teaching rationales for japanese/ sets that currently
// ship with no rationales (per-exercise inline-YAML style). Handles the
// six families visible in the content:
//   kana-reading, romaji-reading, hiragana↔katakana mapping,
//   kanji→meaning, kanji→reading, number↔kanji.
//
// Rewrites only exercises that:
//   (a) live in japanese/
//   (b) have type in {japanese_vocab, kana_reading, kana_writing,
//       japanese_phrases, translation}
//   (c) have no rationale field
//   (d) match a supported question shape with an answer we can justify.
//
// Inline YAML is preserved: "  - { ... }" lines get a rationale field
// inserted before the closing brace.
//
// Usage: node scripts/fix-japanese-rationales.js [--apply]

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

const HIRA_RE = /^[\u3040-\u309f]+$/;
const KATA_RE = /^[\u30a0-\u30ff]+$/;
const KANJI_RE = /[\u4e00-\u9faf]/;
const ROMAJI_RE = /^[a-zA-Z]+$/;
const DIGIT_RE = /^-?\d+$/;

function kindOf(s) {
  const str = String(s || '').trim();
  if (!str) return 'empty';
  if (DIGIT_RE.test(str)) return 'digit';
  if (HIRA_RE.test(str)) return 'hiragana';
  if (KATA_RE.test(str)) return 'katakana';
  if (ROMAJI_RE.test(str) && str.length <= 4) return 'romaji';
  if (KANJI_RE.test(str)) return 'kanji';
  return 'text';
}

const CHOICE_RE = /\(([^)]+\/[^)]+)\)\s*$/;

function stripChoices(q) { return q.replace(CHOICE_RE, '').trim(); }

export function generateRationale(type, question, answer) {
  const q = stripChoices(String(question || ''));
  const a = String(answer ?? '').trim();
  if (!q || !a) return null;

  const qKind = kindOf(q);
  const aKind = kindOf(a);

  // Number → Kanji (e.g. question "1", answer "一")
  if (qKind === 'digit' && aKind === 'kanji') {
    return `${q} em kanji escreve-se ${a}. Memorize o traço único.`;
  }

  // Kanji → Number (e.g. question "一", answer "1")
  if (qKind === 'kanji' && aKind === 'digit') {
    return `O kanji ${q} representa o número ${a}.`;
  }

  // Kanji → Reading (e.g. question "一", answer "いち")
  if (qKind === 'kanji' && (aKind === 'hiragana' || aKind === 'katakana')) {
    return `${q} lê-se ${a}. Pratique associar o traço ao som.`;
  }

  // Kanji → Meaning in Portuguese (e.g. question "犬", answer "cachorro")
  // Also catches short PT words like "ir", "vir" that kindOf labels 'romaji'
  // because they're ≤4 Latin chars; when paired with a kanji question
  // they're clearly Portuguese translations.
  if (qKind === 'kanji' && (aKind === 'text' || aKind === 'romaji')) {
    return `O kanji ${q} significa "${a}". Observe o desenho como pista visual.`;
  }

  // Katakana → Portuguese (loanword/country/person name)
  if (qKind === 'katakana' && aKind === 'text') {
    return `${q} (katakana) significa "${a}". Katakana é usado para palavras estrangeiras.`;
  }

  // Hiragana → Portuguese (Japanese word)
  if (qKind === 'hiragana' && aKind === 'text') {
    return `${q} (hiragana) significa "${a}" em português.`;
  }

  // Hiragana → Katakana (e.g. question "あ", answer "ア")
  if (qKind === 'hiragana' && aKind === 'katakana') {
    return `${q} (hiragana) corresponde a ${a} em katakana — mesmo som, escrita diferente.`;
  }

  // Katakana → Hiragana
  if (qKind === 'katakana' && aKind === 'hiragana') {
    return `${q} (katakana) corresponde a ${a} em hiragana — mesmo som.`;
  }

  // Kana → Romaji (e.g. "あ" → "a")
  if ((qKind === 'hiragana' || qKind === 'katakana') && aKind === 'romaji') {
    return `${q} lê-se "${a}" (romaji).`;
  }

  // Kana number-reading → digit (e.g. "いち" → 1)
  if ((qKind === 'hiragana' || qKind === 'katakana') && aKind === 'digit') {
    return `${q} é a leitura do número ${a}.`;
  }

  // Digit → kana reading (e.g. 1 → "いち")
  if (qKind === 'digit' && (aKind === 'hiragana' || aKind === 'katakana')) {
    return `O número ${q} lê-se "${a}".`;
  }

  // Romaji → Kana (e.g. "a" → "あ" or "ア")
  if (qKind === 'romaji' && (aKind === 'hiragana' || aKind === 'katakana')) {
    const script = aKind === 'hiragana' ? 'hiragana' : 'katakana';
    return `O som "${q}" em ${script} escreve-se ${a}.`;
  }

  // Text (Portuguese) → Kanji/Kana (translation direction)
  if (qKind === 'text' && (aKind === 'kanji' || aKind === 'hiragana' || aKind === 'katakana')) {
    return `"${q}" em japonês escreve-se ${a}.`;
  }

  // Mixed-script Japanese sentence → Portuguese translation. Falls here
  // when the question mixes kanji+kana+punctuation so kindOf returns 'text'.
  const hasJp = /[\u3040-\u30ff\u4e00-\u9faf]/.test(q);
  if (hasJp && aKind === 'text') {
    return `A frase "${q}" traduz-se como "${a}". Identifique partículas e palavras-chave.`;
  }

  // Japanese question + Japanese answer — typically a PT-prompt→JP
  // translation drill where the question embeds a PT hint after →
  // or inside quotes. Generic practice rationale.
  const aHasJp = /[\u3040-\u30ff\u4e00-\u9faf]/.test(a);
  if (hasJp && aHasJp && q !== a) {
    return `Forma japonesa: "${a}". Observe partículas (は/を/が) e a terminação です/ます.`;
  }

  return null;
}

// Detects inline "  - { type: X, question: "Y", correctAnswer: Z }" and
// inserts a rationale field before the closing brace. Skips lines that
// already have rationale.
function rewriteLine(line) {
  const m = /^(\s*- \{ )(.*?)( \})\s*$/.exec(line);
  if (!m) return null;
  const [, prefix, inside, suffix] = m;
  if (/rationale:/.test(inside)) return null;

  const fields = {};
  // Splits on top-level commas — treats () [] {} as depth brackets and
  // quotes as a toggle state (so embedded parens inside quoted strings
  // don't throw off depth).
  let depth = 0, inQuote = false, start = 0;
  const parts = [];
  for (let i = 0; i < inside.length; i++) {
    const c = inside[i];
    if (c === '"') inQuote = !inQuote;
    else if (inQuote) continue;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(inside.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(inside.slice(start));
  for (const p of parts) {
    const km = /^\s*(\w+):\s*(.*?)\s*$/.exec(p);
    if (!km) continue;
    fields[km[1]] = km[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }

  const rationale = generateRationale(fields.type, fields.question, fields.correctAnswer);
  if (!rationale) return null;
  const escaped = rationale.replace(/"/g, '\\"');
  return `${prefix}${inside}, rationale: "${escaped}"${suffix}`;
}

function processFile(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  const lines = raw.split('\n');
  let changes = 0;
  for (let i = 0; i < lines.length; i++) {
    const rewritten = rewriteLine(lines[i]);
    if (rewritten) { lines[i] = rewritten; changes++; }
  }
  if (changes && APPLY) fs.writeFileSync(fp, lines.join('\n'), 'utf8');
  return changes;
}

function walk() {
  const files = [];
  const dir = path.join(process.cwd(), 'src', 'levels', 'japanese');
  if (!fs.existsSync(dir)) return files;
  for (const level of fs.readdirSync(dir).sort()) {
    const ld = path.join(dir, level);
    if (!fs.statSync(ld).isDirectory()) continue;
    for (const file of fs.readdirSync(ld).filter(f => /\.ya?ml$/.test(f)).sort()) {
      files.push(path.join(ld, file));
    }
  }
  return files;
}

// Only walk+rewrite when invoked as a script; importers (tests) just get
// the exports without triggering file I/O.
if (import.meta.url === `file://${process.argv[1]}`) {
  const RESET = '\x1b[0m', BOLD = '\x1b[1m';
  const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
  const c = (t, col) => `${col}${t}${RESET}`;

  let total = 0, filesChanged = 0;
  for (const f of walk()) {
    const ch = processFile(f);
    if (ch) {
      filesChanged++;
      total += ch;
      console.log(c(`  ${f.replace(process.cwd() + '/', '')}`, CYAN), c(`${ch} rationale(s)`, ch > 20 ? YELLOW : GREEN));
    }
  }
  console.log('\n' + '═'.repeat(60));
  if (!total) { console.log(c('No Japanese rationales to add.', GREEN)); process.exit(0); }
  const verb = APPLY ? 'added' : 'would add';
  console.log(c(`${verb} ${total} rationale(s) in ${filesChanged} file(s)`, BOLD + (APPLY ? GREEN : YELLOW)));
  if (!APPLY) console.log(c('Re-run with --apply to write changes.', GRAY));
}
