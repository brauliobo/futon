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
  'Organize os dados antes de operar.',
  'Aplique razões trigonométricas e o ciclo.',
  'Radical: √(a·b) = √a·√b; racionalize quando preciso.',
  'Opere a fração conforme a regra correspondente.',
]);

// Standard trig values. Key: "<fn>(<normalizedExpr>)", value: expected answer.
// Covers the arcsen / arccos / arctan quadrant-1 + symmetric negatives that
// appear in math/L sets. Mirrors / supplementary angles handled as needed.
const TRIG_TABLE = {
  arcsen: {
    '0': '0°', '1/2': '30°', '√2/2': '45°', '√3/2': '60°', '1': '90°',
    '-1/2': '-30°', '-√2/2': '-45°', '-√3/2': '-60°', '-1': '-90°',
  },
  arccos: {
    '1': '0°', '√3/2': '30°', '√2/2': '45°', '1/2': '60°', '0': '90°',
    '-1/2': '120°', '-√2/2': '135°', '-√3/2': '150°', '-1': '180°',
  },
  arctan: {
    '0': '0°', '√3/3': '30°', '1': '45°', '√3': '60°',
    '-√3/3': '-30°', '-1': '-45°', '-√3': '-60°',
  },
};
const INVERSE_FN = { arcsen: 'sen', arccos: 'cos', arctan: 'tan' };

// Reciprocal (cossecante/secante) standard values: "<fn>(<θ>°)" → value.
const RECIP_TABLE = {
  sen: { '30': '2', '45': '√2', '60': '2√3/3', '90': '1', '150': '2', '135': '√2' },
  cos: { '0': '1', '30': '2√3/3', '45': '√2', '60': '2', '180': '-1', '225': '-√2', '120': '-2', '135': '-√2' },
};

// Rule: given exercise type, question, correctAnswer — return a replacement
// rationale that teaches the method, or null when we don't know a safe rule.
function generateRationale(type, question, answer) {
  const q = String(question || '').trim();
  const a = String(answer ?? '').trim();

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

  if (type === 'place_value') {
    const m = /^Quantas\s+unidades\s+tem\s+o\s+n[úu]mero\s+(\d+)\s*\??$/i.exec(q);
    if (m) {
      const n = +m[1];
      const unit = n % 10;
      if (unit === +a) {
        return n < 10
          ? `${n} tem só um algarismo — são ${n} unidades.`
          : `Unidade = último algarismo. ${n} → ${unit} unidades.`;
      }
    }
    const md = /^Quantas\s+dezenas\s+tem\s+o\s+n[úu]mero\s+(\d+)\s*\??$/i.exec(q);
    if (md) {
      const n = +md[1];
      const tens = Math.floor(n / 10);
      if (tens === +a) return `Dezena = algarismo antes da unidade. ${n} → ${tens} dezena(s).`;
    }
  }

  if (type === 'even_odd') {
    const m = /^O\s+n[úu]mero\s+(-?\d+)\s+[ée]\s*:?$/i.exec(q);
    if (m) {
      const n = +m[1];
      const even = n % 2 === 0;
      const aNorm = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if ((even && aNorm === 'par') || (!even && aNorm === 'impar')) {
        return even
          ? `${n} é par: termina em 0, 2, 4, 6 ou 8 (divisível por 2).`
          : `${n} é ímpar: termina em 1, 3, 5, 7 ou 9 (não divisível por 2).`;
      }
    }
  }

  if (type === 'word_problem') {
    // Addition stories: "X tem N <sym>. Y deu mais M <sym>. Quantas <sym>..."
    //                   "X viu N <sym>. Y viu mais M <sym>. Quantas <sym>..."
    const addRe = /(-?\d+)\s+\S+\s*\.\s*\S+\s+(?:deu\s+mais|ganhou|viu\s+mais|coletou\s+\S+|trouxe\s+mais|recebeu\s+mais)\s+(-?\d+)/i;
    const sub = addRe.exec(q);
    if (sub) {
      const [, n, m] = sub;
      if (+n + +m === +a) return `Ele tinha ${n} e ganhou ${m}: some ${n} + ${m} = ${+n + +m}.`;
    }
    // Subtraction stories: "X tinha N <sym>. Perdeu M <sym>. Quantas..."
    const subRe = /(-?\d+)\s+\S+\s*\.\s*(?:Perdeu|Deu|Comeu|Gastou|Saiu|Doou|Cortou)\s+(-?\d+)/i;
    const subM = subRe.exec(q);
    if (subM) {
      const [, n, m] = subM;
      if (+n - +m === +a) return `Começou com ${n} e perdeu ${m}: subtraia ${n} - ${m} = ${+n - +m}.`;
    }
  }

  if (type === 'trigonometry') {
    // arcsen(V) = ?, arccos(V) = ?, arctan(V) = ?
    const inv = /^(arcsen|arccos|arctan)\s*\(\s*(.+?)\s*\)\s*=\s*\?\s*$/i.exec(q);
    if (inv) {
      const [, fnRaw, v] = inv;
      const fn = fnRaw.toLowerCase();
      const expected = TRIG_TABLE[fn]?.[v];
      if (expected && a === expected) {
        return `${fnRaw}(${v}) = ${expected} porque ${INVERSE_FN[fn]}(${expected}) = ${v}.`;
      }
    }
    // 1/sen(θ°) = ? or 1/cos(θ°) = ?
    const recip = /^1\/(sen|cos)\s*\(\s*(-?\d+)°\s*\)\s*=\s*\?\s*$/i.exec(q);
    if (recip) {
      const [, fn, θ] = recip;
      const expected = RECIP_TABLE[fn.toLowerCase()]?.[θ];
      if (expected && a === expected) {
        return `1/${fn}(${θ}°) = ${expected} (${fn === 'sen' ? 'cossecante' : 'secante'}): calcule ${fn}(${θ}°) e inverta.`;
      }
    }
  }

  if (type === 'skip_counting') {
    // "X, Y, Z, ?" — detect arithmetic progression
    const m = /^(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*\?\s*$/.exec(q);
    if (m) {
      const [, x, y, z] = m.map(Number).slice(1);
      const d = y - x;
      if (z - y === d && z + d === +a) {
        return `Contagem de ${d > 0 ? '+' : ''}${d} em ${d > 0 ? '+' : ''}${d}: ${z} + ${d} = ${z + d}.`;
      }
    }
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
