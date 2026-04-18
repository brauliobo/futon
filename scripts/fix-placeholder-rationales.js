#!/usr/bin/env node
// Rule-based rationale fixer. Replaces known placeholder rationales with
// specific method-teaching rationales generated from the exercise's own
// question/answer. Deterministic; only rewrites when BOTH the rationale is a
// known placeholder AND the question matches a known shape.
//
// Usage:
//   node scripts/fix-placeholder-rationales.js                # dry-run across repo
//   node scripts/fix-placeholder-rationales.js --subject math # filter
//   node scripts/fix-placeholder-rationales.js --apply        # write changes

import fs from 'fs';
import path from 'path';

const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[90m';
const c = (t, col) => `${col}${t}${RESET}`;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SUBJECT = argVal('--subject');
const LEVEL = argVal('--level');
const APPLY = args.includes('--apply');
const SUBJECTS = SUBJECT ? [SUBJECT] : ['math', 'portuguese', 'english', 'japanese'];

// Rationale strings known to be placeholders. Each is matched literally.
const PLACEHOLDERS = new Set([
  'Analise os dados e aplique a operação pedida.',
  'Leia com atenção e escolha a operação adequada.',
  'Responda conforme a pergunta.',
  'Verifique contando de novo.',
]);

// Rule: given exercise type, question, correctAnswer — return a replacement
// rationale that teaches the method, or null when we don't know a safe rule.
function generateRationale(type, question, answer) {
  const q = String(question || '').trim();
  const a = String(answer || '').trim();

  if (type === 'nextprev') {
    const prev = /^Anterior de (-?\d+)$/i.exec(q);
    if (prev) {
      const n = +prev[1];
      return `Anterior = conte 1 para trás: ${n} → ${n - 1}.`;
    }
    const next = /^Pr[óo]ximo de (-?\d+)$/i.exec(q);
    if (next) {
      const n = +next[1];
      return `Próximo = conte 1 para frente: ${n} → ${n + 1}.`;
    }
  }

  if (type === 'sequence') {
    const middle = /^(-?\d+),\s*__,\s*(-?\d+)$/.exec(q);
    if (middle) {
      const [, l, r] = middle;
      return `Entre ${l} e ${r}: conte +1 a partir de ${l} → ${+l + 1}.`;
    }
    const leading = /^__,\s*(-?\d+),\s*(-?\d+)$/.exec(q);
    if (leading) {
      const [, m] = leading;
      return `Antes de ${m}: conte -1 → ${+m - 1}.`;
    }
    const trailing = /^(-?\d+),\s*(-?\d+),\s*__$/.exec(q);
    if (trailing) {
      const [, , m] = trailing;
      return `Depois de ${m}: conte +1 → ${+m + 1}.`;
    }
  }

  if (type === 'count') {
    const m = /^(\d+)\s+\S+/.exec(q);
    if (m && a === m[1]) return `Conte um a um: o total é ${m[1]}.`;
  }

  return null;
}

// Line-oriented rewrite. Tracks current exercise via the most recent
// type:/question:/correctAnswer: lines. Only rewrites rationale lines whose
// quoted value is a known placeholder AND whose question matches a known rule.
function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  let type = null, question = null, answer = null;
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Reset state on a new exercise (starts with `- type:` or `- { type:`)
    const exStart = /^(\s*)-\s+(?:type:|\{\s*type:)\s*(\S+)/.exec(line);
    if (exStart) { type = exStart[2].replace(/[,}]$/, ''); question = null; answer = null; }

    const mType = /^\s*type:\s*(\S+)/.exec(line);
    if (mType && !exStart) type = mType[1];

    const mQ = /^\s*question:\s*(.*)$/.exec(line);
    if (mQ) question = mQ[1].trim().replace(/^["'](.*)["']$/, '$1');

    const mA = /^\s*correctAnswer:\s*(.*)$/.exec(line);
    if (mA) answer = mA[1].trim().replace(/^["'](.*)["']$/, '$1');

    const mR = /^(\s*)rationale:\s*["'](.+)["']\s*$/.exec(line);
    if (mR) {
      const [, indent, text] = mR;
      if (PLACEHOLDERS.has(text)) {
        const fix = generateRationale(type, question, answer);
        if (fix) {
          lines[i] = `${indent}rationale: "${fix.replace(/"/g, '\\"')}"`;
          changes++;
        }
      }
    }
  }

  if (changes && APPLY) fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return { changes, content: lines.join('\n') };
}

function walkSets() {
  const files = [];
  for (const subject of SUBJECTS) {
    const dir = path.join(process.cwd(), 'src', 'levels', subject);
    if (!fs.existsSync(dir)) continue;
    for (const level of fs.readdirSync(dir).sort()) {
      if (LEVEL && level !== LEVEL) continue;
      const ld = path.join(dir, level);
      if (!fs.statSync(ld).isDirectory()) continue;
      for (const file of fs.readdirSync(ld).filter(f => /\.ya?ml$/.test(f)).sort()) {
        files.push(path.join(ld, file));
      }
    }
  }
  return files;
}

function main() {
  const files = walkSets();
  let totalChanges = 0, filesChanged = 0;
  for (const f of files) {
    const { changes } = processFile(f);
    if (changes) {
      filesChanged++;
      totalChanges += changes;
      console.log(c(`  ${f.replace(process.cwd() + '/', '')}`, CYAN) + c(`  ${changes} rationale(s)`, changes > 10 ? YELLOW : GREEN));
    }
  }
  console.log('\n' + '═'.repeat(60));
  if (!totalChanges) { console.log(c('No fixable placeholders found.', GREEN)); return; }
  const verb = APPLY ? 'rewritten' : 'would rewrite';
  console.log(c(`${verb} ${totalChanges} rationale(s) in ${filesChanged} file(s)`, BOLD + (APPLY ? GREEN : YELLOW)));
  if (!APPLY) console.log(c('Re-run with --apply to write changes.', GRAY));
}

main();
