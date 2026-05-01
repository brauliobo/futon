#!/usr/bin/env node
// Length-bias defuser v3: surgical line-edit, parenthetical topical-wrong qualifiers.
// Strategy: append a parenthetical that names a *related but different* biology concept,
// chosen from the SET's title/authorNotes domain. This makes distractors read as topical
// siblings with extra (wrong) detail rather than terse stubs.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

const ROOT = 'src/levels/biology';
const LEVELS = process.argv.slice(2).length ? process.argv.slice(2) : ['5A','6A','7A'];
const txt = (c, lang) => typeof c === 'string' ? c : (c?.[lang] || '');

// Domain-themed wrong qualifiers keyed by topic keywords found in title/authorNotes.
// Each tuple: [pt, en]. They are factually wrong/irrelevant in the question's context but on-topic.
const DOMAIN_QUALS = {
  bioelement: [
    ['conforme tabela periódica de Mendeleev', 'per Mendeleev periodic table'],
    ['em traços apenas em rochas ígneas', 'in trace amounts only in igneous rocks'],
    ['descoberto por Lavoisier em 1789', 'discovered by Lavoisier in 1789'],
  ],
  agua: [
    ['em estado sólido permanente', 'in permanently solid state'],
    ['com cor azul intrínseca', 'with intrinsic blue color'],
    ['conforme modelo de Mendeleev', 'per Mendeleev water model'],
  ],
  celula: [
    ['no retículo endoplasmático rugoso', 'in the rough endoplasmic reticulum'],
    ['durante a fase G0 do ciclo', 'during the G0 phase of the cycle'],
    ['conforme proposto por Schleiden em 1838', 'as proposed by Schleiden in 1838'],
    ['mediado pelos centríolos do fuso', 'mediated by spindle centrioles'],
  ],
  tecido: [
    ['no tecido epitelial estratificado', 'in stratified epithelial tissue'],
    ['típico do sistema linfático apenas', 'typical of the lymphatic system only'],
    ['conforme histologia de Bichat', 'per Bichat histology'],
  ],
  musculo: [
    ['no músculo cardíaco apenas durante o sono', 'in cardiac muscle only during sleep'],
    ['conforme modelo de filamentos deslizantes invertido', 'per inverted sliding-filament model'],
    ['mediado por troponina C, não actina', 'mediated by troponin C, not actin'],
    ['característico do tecido conjuntivo frouxo', 'characteristic of loose connective tissue'],
  ],
  osso: [
    ['no tecido cartilaginoso hialino apenas', 'in hyaline cartilage tissue only'],
    ['conforme proposto por Galeno na Antiguidade', 'as proposed by Galen in antiquity'],
    ['mediado por condroblastos, não osteoblastos', 'mediated by chondroblasts, not osteoblasts'],
  ],
  pele: [
    ['na hipoderme adiposa profunda apenas', 'in the deep adipose hypodermis only'],
    ['conforme classificação de Fitzpatrick tipo VI', 'per Fitzpatrick type VI classification'],
    ['mediado por queratinócitos basais inativos', 'mediated by inactive basal keratinocytes'],
  ],
  digestao: [
    ['no íleo terminal apenas, nunca no duodeno', 'in the terminal ileum only, never duodenum'],
    ['mediado por pepsinogênio inativo no jejum', 'mediated by inactive pepsinogen during fasting'],
    ['conforme descrito por Pavlov em cães', 'as described by Pavlov in dogs'],
  ],
  respiracao: [
    ['nos bronquíolos terminais apenas', 'in terminal bronchioles only'],
    ['conforme curva de Bohr invertida', 'per inverted Bohr curve'],
    ['mediado por surfactante pulmonar denaturado', 'mediated by denatured pulmonary surfactant'],
  ],
  circulacao: [
    ['no átrio direito durante diástole apenas', 'in the right atrium during diastole only'],
    ['conforme lei de Starling do coração', 'per the Starling law of the heart'],
    ['mediado por fibras de Purkinje rápidas', 'mediated by fast Purkinje fibers'],
  ],
  nervoso: [
    ['no nodo de Ranvier apenas em axônios mielinizados', 'at the node of Ranvier only in myelinated axons'],
    ['conforme potencial de equilíbrio de Nernst', 'per Nernst equilibrium potential'],
    ['mediado por células de Schwann inativas', 'mediated by inactive Schwann cells'],
  ],
  endocrino: [
    ['na glândula pineal durante o dia apenas', 'in the pineal gland during the day only'],
    ['conforme eixo hipotálamo-hipófise-tireoide invertido', 'per inverted hypothalamic-pituitary-thyroid axis'],
    ['mediado por receptores nucleares citoplasmáticos', 'mediated by cytoplasmic nuclear receptors'],
  ],
  reprodutor: [
    ['na fase folicular tardia apenas', 'in the late follicular phase only'],
    ['conforme ciclo menstrual invertido', 'per inverted menstrual cycle'],
    ['mediado por células de Sertoli em fêmeas', 'mediated by Sertoli cells in females'],
  ],
  imune: [
    ['no timo após a puberdade apenas', 'in the thymus after puberty only'],
    ['conforme teoria da seleção clonal invertida', 'per inverted clonal selection theory'],
    ['mediado por linfócitos B citotóxicos', 'mediated by cytotoxic B lymphocytes'],
  ],
  excretor: [
    ['na alça de Henle ascendente apenas', 'in the ascending loop of Henle only'],
    ['conforme contracorrente medular invertido', 'per inverted medullary countercurrent'],
    ['mediado por podócitos no túbulo distal', 'mediated by podocytes in the distal tubule'],
  ],
  default: [
    ['em condições estritamente anaeróbias', 'under strictly anaerobic conditions'],
    ['conforme modelo histórico do século XIX', 'per a 19th-century historical model'],
    ['mediado por organela ausente em humanos', 'mediated by an organelle absent in humans'],
    ['durante a fase G0 do ciclo celular', 'during the G0 phase of the cell cycle'],
  ],
};

function pickDomain(title, notes) {
  const blob = ((title?.pt||'') + ' ' + (title?.en||'') + ' ' + (notes||'')).toLowerCase();
  const map = [
    ['bioelement', /bioelement|atom|element|chnops|carbono|carbon|química|chemistry/],
    ['agua', /água|water|h2o|h₂o/],
    ['musculo', /músculo|muscle|actina|miosin/],
    ['osso', /osso|bone|esquelet|skelet/],
    ['pele', /pele|skin|epiderm/],
    ['digestao', /digest|estômago|stomach|intestino|intestine/],
    ['respiracao', /respira|respir|pulmão|lung|alvéolo/],
    ['circulacao', /circulação|circulation|coração|heart|sangue|blood|hemoglob/],
    ['nervoso', /nervo|nerv|neurônio|neuron|cérebro|brain|sinaps/],
    ['endocrino', /hormônio|hormone|tireoide|thyroid|insulin|glând/],
    ['reprodutor', /reprod|sexual|gameta|gamete|óvulo|sperm/],
    ['imune', /imun|immune|linfócito|lymphoc|anticorp|antibod/],
    ['excretor', /rim|kidney|néfron|nephron|urin/],
    ['celula', /célula|cell|organela|organelle|membrana|membrane|núcle|nucle/],
    ['tecido', /tecido|tissue|epitél|epithel|conjunt|connect/],
  ];
  for (const [k, re] of map) if (re.test(blob)) return k;
  return 'default';
}

function pad(str, target, qual) {
  if (!qual || str.length >= target - 3) return str;
  const sep = /[.!?]$/.test(str) ? ' ' : ' ';
  return `${str}${sep}(${qual})`;
}

function yamlDQEscape(s) { return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

function replaceQuoted(text, oldStr, newStr) {
  const oldQ = `"${yamlDQEscape(oldStr)}"`;
  const newQ = `"${yamlDQEscape(newStr)}"`;
  const idx = text.indexOf(oldQ);
  if (idx < 0) return null;
  return text.slice(0, idx) + newQ + text.slice(idx + oldQ.length);
}

let totalBiased = 0, padded = 0;
const filesChanged = [];

for (const lvl of LEVELS) {
  const dir = path.join(ROOT, lvl);
  if (!fs.existsSync(dir)) continue;
  for (const fname of fs.readdirSync(dir).sort()) {
    if (!fname.endsWith('.yaml')) continue;
    const fp = path.join(dir, fname);
    let text = fs.readFileSync(fp, 'utf8');
    const data = yaml.parse(text);
    let modified = false;
    const domainKey = pickDomain(data.title, data.authorNotes);
    const quals = DOMAIN_QUALS[domainKey] || DOMAIN_QUALS.default;

    for (const page of data.pages || []) {
      for (const ex of page.exercises || []) {
        if (!ex.choices || ex.choices.length < 2) continue;
        const correctPt = txt(ex.correctAnswer, 'pt');
        const correctEn = txt(ex.correctAnswer, 'en');
        const ci = ex.choices.findIndex(c => txt(c,'pt') === correctPt && txt(c,'en') === correctEn);
        if (ci < 0) continue;
        const lensMax = ex.choices.map(c => Math.max(txt(c,'pt').length, txt(c,'en').length));
        const max = Math.max(...lensMax);
        if (lensMax[ci] !== max) continue;
        const sortedDesc = [...lensMax].sort((a,b)=>b-a);
        if (sortedDesc[0] === sortedDesc[1]) continue;
        totalBiased++;

        let exDidPad = false;
        for (let i = 0; i < ex.choices.length; i++) {
          if (i === ci) continue;
          const c = ex.choices[i];
          if (typeof c !== 'object') continue;
          const cPt = c.pt || '', cEn = c.en || '';
          const gapPt = correctPt.length - cPt.length;
          const gapEn = correctEn.length - cEn.length;
          if (gapPt < 8 && gapEn < 8) continue;
          const q = quals[i % quals.length];
          const newPt = gapPt >= 8 ? pad(cPt, correctPt.length, q[0]) : cPt;
          const newEn = gapEn >= 8 ? pad(cEn, correctEn.length, q[1]) : cEn;
          if (newPt !== cPt) {
            const t2 = replaceQuoted(text, cPt, newPt);
            if (t2) { text = t2; modified = true; exDidPad = true; }
          }
          if (newEn !== cEn) {
            const t2 = replaceQuoted(text, cEn, newEn);
            if (t2) { text = t2; modified = true; exDidPad = true; }
          }
        }
        if (exDidPad) padded++;
      }
    }
    if (modified) {
      yaml.parse(text); // sanity
      fs.writeFileSync(fp, text);
      filesChanged.push(fp);
    }
  }
}

console.log(`biased: ${totalBiased}, padded: ${padded}, files: ${filesChanged.length}`);
