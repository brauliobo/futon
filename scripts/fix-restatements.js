#!/usr/bin/env node
// Rewrites "A resposta correta é 'X'." restatement rationales into
// method-teaching form derived from the question shape. These appear
// mostly in portuguese/2A sets.
//
// Handles the common "Qual é <categoria>?" pattern by using the
// extracted category + the other choices to frame a comparison:
//
//   Q: Qual é uma vogal? (A/B/C), A: A
//   before: "A resposta correta é 'A'."
//   after:  "'A' é uma vogal. Compare: A, E, I, O, U são as vogais."
//
// Falls back to a safe imperative when the pattern is unknown.
//
// Usage: node scripts/fix-restatements.js [--apply]

import fs from 'fs';
import path from 'path';

const APPLY = process.argv.includes('--apply');

const CHOICE_RE = /\(([^)]+\/[^)]+)\)\s*$/;
// Matches classic restatement phrasings:
//   "A resposta correta é 'X'."
//   "A grafia correta é 'X'."
//   "A forma correta é 'X'."
//   "A grafia correta usa 'X'."
//   "'X' completa a palavra com a letra correta."
const RESTATE_LINE_RE = new RegExp(
  '^(\\s*)rationale:\\s*["\'](?:' +
    'A\\s+(?:resposta|grafia|forma|preposição|palavra|letra)\\s+correta\\s+(?:é|usa|aqui\\s+é)\\s+[\'"]?[^"\'.]+?[\'"]?\\.?' +
    '|[\'"]?[^"\'.]+?[\'"]?\\s+completa\\s+a\\s+palavra\\s+com\\s+a\\s+letra\\s+correta\\.?' +
  ')["\']\\s*$', 'i'
);

// Tiny domain lexicon for common Kumon Portuguese categories.
const CATEGORY_HINT = {
  vogal: 'A, E, I, O, U são as vogais',
  consoante: 'B, C, D, F, G, H, J, K, L, M, N, P, Q, R, S, T, V, W, X, Y, Z são consoantes',
  cor: 'cores descrevem tonalidade (azul, vermelho, verde…)',
  animal: 'animais são seres vivos (gato, cachorro, pássaro…)',
  número: 'números indicam quantidade (um, dois, três…)',
  numero: 'números indicam quantidade (um, dois, três…)',
  fruta: 'frutas crescem em árvores/plantas (maçã, banana, uva…)',
};

function findCategory(question) {
  const m = /qual\s+é\s+(?:um|uma)\s+(\w+)\??/i.exec(question);
  return m ? m[1].toLowerCase() : null;
}

function stripChoices(q) { return String(q || '').replace(CHOICE_RE, '').trim(); }

function generateRationale(question, answer) {
  const q = stripChoices(question);
  const a = String(answer ?? '').trim();
  if (!a) return null;
  const cat = findCategory(q);
  if (cat) {
    const hint = CATEGORY_HINT[cat];
    return hint
      ? `'${a}' é um(a) ${cat}. Lembre: ${hint}.`
      : `'${a}' é a opção que corresponde a "${cat}". Observe as outras e compare.`;
  }
  // Generic fallback — still method-teaching.
  return `Observe as opções e escolha a que responde "${q}": '${a}'.`;
}

// Track nearest preceding question/correctAnswer to pair with each
// restatement rationale. Walks line-by-line.
function processFile(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  const lines = raw.split('\n');
  let question = null, answer = null;
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mq = /^\s*question:\s*(.*)$/.exec(line);
    if (mq) question = mq[1].trim().replace(/^["'](.*)["']$/, '$1');
    const ma = /^\s*correctAnswer:\s*(.*)$/.exec(line);
    if (ma) answer = ma[1].trim().replace(/^["'](.*)["']$/, '$1');

    const mr = RESTATE_LINE_RE.exec(line);
    if (mr && question) {
      const [, indent] = mr;
      const fix = generateRationale(question, answer);
      if (fix) {
        lines[i] = `${indent}rationale: "${fix.replace(/"/g, '\\"')}"`;
        changes++;
      }
    }
  }

  if (changes && APPLY) fs.writeFileSync(fp, lines.join('\n'), 'utf8');
  return changes;
}

function walk() {
  const files = [];
  for (const subject of ['math', 'portuguese', 'english', 'japanese']) {
    const dir = path.join(process.cwd(), 'src', 'levels', subject);
    if (!fs.existsSync(dir)) continue;
    for (const level of fs.readdirSync(dir).sort()) {
      const ld = path.join(dir, level);
      if (!fs.statSync(ld).isDirectory()) continue;
      for (const f of fs.readdirSync(ld).filter(f => /\.ya?ml$/.test(f)).sort())
        files.push(path.join(ld, f));
    }
  }
  return files;
}

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

let total = 0, filesChanged = 0;
for (const f of walk()) {
  const ch = processFile(f);
  if (ch) {
    filesChanged++;
    total += ch;
    console.log(c(`  ${f.replace(process.cwd() + '/', '')}`, CYAN), c(`${ch}`, ch > 5 ? YELLOW : GREEN));
  }
}
console.log('\n' + '═'.repeat(60));
if (!total) { console.log(c('No restatements to rewrite.', GREEN)); process.exit(0); }
const verb = APPLY ? 'rewritten' : 'would rewrite';
console.log(c(`${verb} ${total} restatement(s) in ${filesChanged} file(s)`, BOLD + (APPLY ? GREEN : YELLOW)));
if (!APPLY) console.log(c('Re-run with --apply to write changes.', GRAY));
