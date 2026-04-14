#!/usr/bin/env node
// Template-based exercise rationale backfill.
// Adds a short `rationale` key to every exercise that lacks one, keyed by exercise `type`.
// Usage: node scripts/backfill-rationale.mjs [--apply] [--subject math|portuguese|english] [--level <lvl>]

import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml';

const TEMPLATES = {
  addition: 'Soma dos termos; alinhe unidades e dezenas.',
  subtraction: 'Subtração direta; respeite a ordem dos valores.',
  multiplication: 'Use a tabuada correspondente.',
  division: 'Divisão exata; pense na multiplicação inversa.',
  fraction: 'Opere frações pela regra do denominador comum.',
  fraction_add: 'Some numeradores com denominadores iguais.',
  fraction_sub: 'Subtraia numeradores com denominadores iguais.',
  fraction_subtract: 'Subtraia numeradores com denominadores iguais.',
  fraction_multiply: 'Multiplique numeradores e denominadores separadamente.',
  fraction_divide: 'Multiplique pela fração inversa (divisão de frações).',
  decimal: 'Alinhe as casas decimais antes de operar.',
  decimal_add: 'Some alinhando as casas decimais.',
  decimal_subtract: 'Subtraia alinhando as casas decimais.',
  decimal_multiply: 'Multiplique normalmente e ajuste as casas decimais no resultado.',
  decimal_divide: 'Torne o divisor inteiro multiplicando ambos por 10^n.',
  integer: 'Aplique a regra de sinais.',
  integer_add: 'Sinais iguais somam e conservam; diferentes subtraem e assumem o maior.',
  integer_subtract: 'Transforme em soma com sinal oposto.',
  integer_multiply: 'Regra de sinais: iguais positivo, diferentes negativo.',
  integer_divide: 'Regra de sinais aplicada à divisão.',
  absolute_value: 'Módulo é sempre positivo ou zero.',
  algebra: 'Isole a incógnita usando operações inversas.',
  algebraic_expression: 'Simplifique combinando termos semelhantes.',
  equation: 'Aplique operações inversas para isolar a variável.',
  linear_equation: 'Isole x usando operações inversas dos dois lados.',
  inequality: 'Resolva como equação; inverta o sinal ao multiplicar por negativo.',
  polynomial: 'Agrupe termos semelhantes ou fatore.',
  quadratic: 'Use fatoração ou a fórmula de Bhaskara.',
  radical: 'Aplique propriedades de radicais.',
  exponent: 'Use propriedades de potências.',
  factoring: 'Identifique o fator comum ou use fórmula de produto notável.',
  system_equation: 'Use substituição, adição ou matriz.',
  slope_intercept: 'Compare com y = mx + b para identificar coeficientes.',
  graph_point: 'Localize a coordenada no plano.',
  proportion: 'Aplique a regra de três.',
  trigonometry: 'Consulte o ciclo trigonométrico.',
  calculus: 'Aplique a regra de derivação/integração correspondente.',
  geometry: 'Use a fórmula geométrica adequada à figura.',
  count: 'Conte seguindo a sequência.',
  next_number: 'Observe o padrão da sequência.',
  previous_number: 'Observe o padrão da sequência.',
  nextprev: 'Observe o padrão da sequência.',
  missing_number: 'Use a diferença entre termos para achar o ausente.',
  sequence: 'Identifique o padrão (diferença ou razão constante).',
  skip_counting: 'Conte pulando pela quantidade indicada.',
  decomposition: 'Decomponha em dezenas e unidades.',
  place_value: 'Identifique a posição do dígito (unidade, dezena, centena).',
  number_sense: 'Estime e compare quantidades.',
  comparison: 'Compare valores por tamanho.',
  even_odd: 'Pares terminam em 0, 2, 4, 6, 8; ímpares em 1, 3, 5, 7, 9.',
  mental_math: 'Calcule mentalmente usando estratégias de decomposição.',
  measure: 'Use a unidade correta antes de comparar.',
  money: 'Trate o dinheiro como valor decimal.',
  word_problem: 'Identifique os dados e a operação pedida.',
  arithmetic: 'Aplique a operação solicitada.',
  reading: 'Reveja o trecho relevante do texto.',
  reading_comprehension: 'Reveja o trecho relevante do texto.',
  english_vocab: 'Memorize a palavra junto com o contexto.',
  english_phrases: 'Observe a estrutura da frase (sujeito + verbo + complemento).',
  translation: 'Traduza respeitando ordem e concordância.',
  literacy: 'Associe a letra ao som e à palavra modelo.',
  grammar: 'Aplique a regra gramatical estudada.',
  paragraph: 'Relacione ao tópico principal do parágrafo.',
  sentence_building: 'Combine sujeito, verbo e complemento na ordem correta.',
  choice: 'Elimine alternativas incorretas comparando com o enunciado.',
};

const DEFAULT_RATIONALE = 'Aplique o conceito correspondente ao tipo de exercício.';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const subjectArg = args.indexOf('--subject') >= 0 ? args[args.indexOf('--subject') + 1] : null;
const levelArg = args.indexOf('--level') >= 0 ? args[args.indexOf('--level') + 1] : null;

const subjects = ['math', 'portuguese', 'english'].filter(s => !subjectArg || s === subjectArg);

let filesTouched = 0, exercisesTouched = 0;

for (const subject of subjects) {
  const subjectDir = path.join(process.cwd(), 'src', 'levels', subject);
  if (!fs.existsSync(subjectDir)) continue;
  const levels = fs.readdirSync(subjectDir).filter(d =>
    !levelArg || d === levelArg
  );
  for (const level of levels) {
    const levelDir = path.join(subjectDir, level);
    if (!fs.statSync(levelDir).isDirectory()) continue;
    for (const file of fs.readdirSync(levelDir).filter(f => /\.ya?ml$/.test(f))) {
      const filePath = path.join(levelDir, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      let doc;
      try { doc = parse(raw); } catch { continue; }
      if (!doc?.pages) continue;
      let changed = false;
      for (const page of doc.pages) {
        for (const ex of page.exercises || []) {
          if (ex.rationale) continue;
          ex.rationale = TEMPLATES[ex.type] || DEFAULT_RATIONALE;
          changed = true;
          exercisesTouched++;
        }
      }
      if (!changed) continue;
      filesTouched++;
      if (apply) fs.writeFileSync(filePath, stringify(doc, { lineWidth: 0 }));
    }
  }
}

console.log(`${apply ? 'Updated' : 'Would update'} ${filesTouched} file(s), ${exercisesTouched} exercise(s).`);
if (!apply) console.log('Pass --apply to write changes.');
