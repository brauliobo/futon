// Shared rationale classification used by pedagogy-eval.js and
// rationale-review.js. Categories are defined in docs/PEDAGOGY.md.

// Method vocabulary: imperatives, reasoning connectors, and domain-specific
// operation/concept words. A rationale earns "method" credit if it uses any
// of these — i.e. it teaches *how* or *why*, not just restates the answer.
// Lexicon is authored with accents for readability; we strip them at build
// time so ASCII `\b` boundaries can anchor words that begin with á/â/ã/é/ê/í
// etc. The matching input is also stripped (see categorize()).
const METHOD_TERMS = [
  // Imperatives (PT)
  'faça', 'conte', 'some', 'soma[rm]?', 'subtraia', 'divida', 'dividir',
  'multiplique', 'calcule', 'resolva', 'converta', 'substitua',
  'tom[ea]r?', 'emprest[eao]d?o?', 'reagrup[ea]', 'peç[ao]', 'guard[ea]',
  'observ[ea]', 'veja', 'compare', 'troque', 'apliqu[ea]', 'use', 'note',
  'lembr[ea]', 'localize', 'sublinhe', 'releia', 'identifique', 'procure',
  'marque', 'circule', 'escolha', 'escreva', 'mostr[ea]', 'reconhe[çc][ae]',
  'simplifique', 'desenhe', 'liste', 'separe', 'visualize', 'recuper[ea]',
  'verifique', 'explique', 'descreva', 'organize', 'agrupe',
  'fatore', 'expanda', 'iguale',
  'form[ae]m?', 'form[ao]u', 'junta', 'juntam', 'junt[ao]u', 'compõe',
  'por\\s+extenso', 'em\\s+letra\\b', 'extenso',
  // Reasoning connectors (PT)
  'primeiro', 'depois', 'ent[ãa]o', 'porque', 'basta', 'logo', 'portanto',
  'assim', 'pois', 'como', 'se\\b', 'quando', 'enquanto',
  // Math concepts (PT)
  'dobro', 'metade', 'terç[oa]', 'fórmula', 'regra', 'unidade', 'dezena',
  'centena', 'coluna', 'dígito', 'rest[ao]', 'sobr[ae]', 'vai.um',
  'm[íi]nimo', 'm[áa]ximo', 'produto', 'quociente', 'diferença', 'total',
  'acrescent[ae]m?', 'tabuada', 'subtrai', 'multiplica', 'adicion[ae]',
  'ângulo', 'inverso', 'dom[íi]nio', 'imagem', 'valor',
  'arranjo', 'combinação', 'permutação', 'fatorial', 'anagrama',
  'padronização', 'proporção', 'progressão', 'binomial', 'identidade',
  'derivada', 'integral', 'limite', 'sistema', 'matriz', 'determinante',
  'potência', 'logaritmo', 'exponencial', 'radical', 'racionalize',
  'razão', 'multiplicativo', 'independentes', 'binômio',
  'lei\\s+d[oe]s?', 'arcsen', 'arccos', 'arctan', 'arccot',
  'triângulo', 'equilátero', 'isósceles', 'escaleno', 'retângulo',
  'quadrante', 'circunscrit[oa]', 'inscrit[oa]', 'raio', 'ssa\\b',
  'obtus[oa]', 'agud[oa]', 'colinear', 'perpendicular', 'paralel[oa]',
  'teorema', 'bissetriz', 'mediana', 'altura',
  'símbolo[s]?', 'algarismo[s]?', 'série', 'diverge', 'converge',
  'notáv[ea]l', 'harmônica', 'geométrica', 'aritmética', 'infinita',
  'sen\\b', 'cos\\b', 'tan\\b', 'cot\\b', 'tg\\b', 'cotg\\b',
  'ln\\b', 'log\\b', 'máx', 'mín', 'ocorrem?', 'ocorre[mn]?',
  'probabilidade', 'favoráv[ae][il]s?', 'dado[s]?\\b',
  'elementos', 'conjunto', 'distint[oa]s?', 'idênticos?',
  'ímpar[es]?', 'par[es]?\\b',
  'empréstimo', 'emprestad[oa]',
  'isole[mr]?', 'parte\\s+(?:real|imaginária)',
  'complemento', 'simetria', 'termos?\\b', 'iguais', 'oscilante',
  'polar\\b', 'cartesian[oa]', 'cis\\b',
  'P\\(',
  // Grammar / reading concepts (PT)
  'termin[ao]', 'respond[ae]', 'modifica', 'liga[mnrs]?', 'ligação', 'ligad[oa]s?',
  'indica', 'substitui',
  'acompanha', 'determina', 'introduz', 'marca', 'função', 'sufixo',
  'prefixo', 'parágrafo', 'trecho', 'pista', 'contexto', 'palavra.chave',
  'sílaba', 'acento', 'género|gênero', 'número',
  'característic[oa]', 'sinônimo', 'antônimo', 'oposto', 'contrário',
  'significa', 'significad[oa]', 'vogal', 'vogais', 'consoante', 'consoantes', 'maiúscul[oa]',
  'minúscul[oa]', 'masculin[oa]', 'feminin[oa]', 'singular', 'plural',
  'tônic[oa]', 'áton[oa]', 'agud[oa]', 'grav[ea]', 'esdrúxul[oa]',
  'pretérit[oa]', 'presente', 'futuro', 'gerúndio', 'infinitivo',
  'particípio', 'concord[âa]ncia', 'sujeito', 'predicad[oa]', 'objeto',
  'par\\b', 'ímpar', 'rima', 'produzem?', 'dá\\b',
  'fato', 'opinião', 'tese', 'argumento', 'interpretação',
  'desigualdade', 'equação', 'inequação', 'variável', 'incógnita',
  'preposição', 'conjunção', 'pronome', 'artigo', 'numeral',
  'interjeição', 'reg[êe]ncia', 'crase', 'colocação', 'pronominal',
  'd[íi]grafo', 'fonema', 'encontro', 'contém', 'consiste',
  'alfabeto', 'conjugação', 'corresponde', 'correspond[êe]ncia',
  'hiragana', 'katakana', 'kanji',
  // Letter-position / recognition (1A-level)
  'começa[mr]?', 'inicia[mnrs]?', 'termin[aeo][mr]?', 'completa[mr]?',
  'no\\s+início', 'no\\s+meio', 'no\\s+fim', 'início\\b', 'fim\\b',
  'letra\\b', 'letras\\b', 'primeira\\s+letra', 'última\\s+letra',
  'formato', 'entre\\b',
  'barriguinha[s]?', 'perna[s]?', 'traço[s]?', 'curva[s]?',
  'haste[s]?', 'direita', 'esquerda',
  // Vocabulary / factual (3A/4A/5A teaching)
  'escrit[oa]s?', 'corretament[ea]', 'grafad[oa]s?',
  'produz[ei]?m?', 'late[mn]?\\b', 'mia[mn]?', 'voa[mn]?',
  // Rhetoric / essay structure (D/G/L-level)
  'conclus[ãa]o', 'introdução', 'intervenção', 'proposta',
  'dissertativ[oa][s]?', 'argumentativ[oa][s]?', 'narrativ[oa][s]?',
  'descritiv[oa][s]?', 'expositiv[oa][s]?', 'injuntiv[oa][s]?',
  'oração', 'orações', 'subordinad[oa]s?', 'coordenad[oa]s?',
  'independente[s]?', 'dependente[s]?',
  'interrogaç[ãa]o', 'exclamação', 'pergunta[s]?', 'afirma[tm][ao]',
  'encerra[mr]?', 'apresenta[mr]?', 'aponta[mr]?',
  'converte[mr]?', 'expressa[mr]?', 'cita[dr][oa]s?', 'citaç[ãa]o',
  'posição', 'direção', 'caminho',
  'reafirma[mr]?', 'retoma[mr]?', 'retomad[oa]',
  'conectiv[oa]s?', 'coesão', 'coerência', 'enunciad[oa]',
  'texto[s]?', 'leitura', 'habilidade[s]?', 'organiza[mr]?',
  'ênclise', 'próclise', 'mesóclise', 'imperativo', 'subjuntivo',
  'afirmativ[oa][s]?', 'negativ[oa][s]?', 'imperfeito',
  'agente[s]?', 'finalidade', 'meio\\b', 'ação\\b', 'ações',
  'língua[s]?', 'diretamente', 'implicitamente',
  'amarel[oa]s?', 'azu[il]s?', 'verde[s]?', 'vermelh[oa]s?',
  'branc[oa]s?', 'pret[oa]s?', 'marrom', 'cinz[ae]s?',
  'ros[ao]s?', 'laranj[ao]s?', 'rox[oa]s?',
  'pai[s]?\\b', 'mãe[s]?', 'avô[s]?', 'avó[s]?',
  'hipérbato', 'anástrofe',
  // Correspondence / genre structure
  'vocativo', 'destinatário', 'remetente', 'saudação', 'despedida',
  'assinatura', 'cabeçalho', 'corpo', 'circulação', 'familiar',
  'íntimo', 'formal', 'informal', 'protocolar', 'publicação',
  // Literature / history action verbs (classification + attribution)
  'compôs', 'escreveu', 'criou', 'fundou', 'inaugurou', 'liderou',
  'publicou', 'surg[eiu]', 'pertence', 'caracteriza', 'define',
  'explora', 'defende', 'desenvolv[aeu]', 'representa', 'marca\\b',
  'torna[mr]?', 'expressam?', 'provoca', 'gera\\b',
  // Journalism / analytical verbs
  'sintetiz[ae]', 'resume', 'informa', 'investiga', 'analis[ae]',
  'avali[ae]', 'pesquisa', 'transmite', 'comunica', 'expressa',
  'objetividade', 'subjetividade', 'credibilidade', 'pluralidade',
  'parcialidade', 'imparcialidade', 'relev[âa]ncia', 'pertin[êe]ncia',
  // Style / genre markers
  'estilo', 'gênero', 'movimento', 'período', 'geração',
  'barroco', 'romantismo', 'modernismo', 'realismo', 'quinhentismo',
  // Figures of speech
  'antítese', 'paradoxo', 'ironia', 'hipérbole', 'eufemismo',
  'metáfora', 'metonímia', 'pleonasmo', 'personificação', 'prosopopeia',
  'sinestesia', 'aliteração', 'assonância', 'exagero', 'contradição',
  'afirmação', 'atenua', 'intensifica', 'comparação', 'atribui',
  // Period references
  'século', 'década', 'documento', 'obra', 'autor',
  // English equivalents
  'first', 'then', 'because', 'count', 'add', 'subtract', 'multiply',
  'divide', 'double', 'half', 'step', 'notice', 'start', 'rule', 'pattern',
  'locate', 'identify', 'replace', 'means', 'indicates', 'modifies',
  'links', 'substitute', 'determines', 'ends\\s+with', 'starts\\s+with',
  'borrow', 'carry', 'digit', 'column', 'regroup',
];
export const METHOD_RE = new RegExp(
  '\\b(?:' + METHOD_TERMS.map(t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).join('|') + ')\\b',
  'i'
);

export const RESTATE_RE = /^\s*(a\s+(?:resposta|grafia|forma|preposição|palavra|letra)\s+correta\s+(?:aqui\s+)?(?:é|usa)|resposta:|answer:|é\s+\d|is\s+\d|the\s+correct\s+answer|correct\s+answer:)/i;

// Worked-computation signal: two or more '=' forming a derivation chain,
// or an explicit substitution like f(x) = ... Signals "teaches by showing
// the computation" without needing an imperative verb.
const COMPUTATION_RE = /=\s*[^=]+=\s*[^=]+/;
const SUBSTITUTION_RE = /[a-z]\([-+]?\d/i;
// Simple arithmetic: "5-5 = 0", "3 × 4 = 12", "-2 + 7 = 5". Short but
// clearly teaching by demonstration.
const ARITHMETIC_RE = /-?\d+\s*[+\-−×÷*\/]\s*-?\d+\s*=\s*-?\d/;
// Transformation arrow: "'study' → 'studied'" / "X → Y" / "2 → 4" —
// demonstrates before-and-after mapping, a core Kumon teaching pattern.
const TRANSFORMATION_RE = /\S\s*→\s*\S/;
// Definition: "'Could' = habilidade geral passada." — quoted word followed
// by an equals glossing it. Also matches unquoted capitalized concept
// terms like "Desenvolvimento = expandir a ideia..." and single-variable
// math formulas like "A = base × altura" or "V = πr²h".
const DEFINITION_RE = /(?:['"][^'"]{2,}['"]|\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{3,}|[A-Z]\s+=)\s*=?\s*\S/;

// Strip accents for matching: JS `\b` anchors are ASCII-only, so words that
// *start* with accented letters (ângulo, década) never fire a word-boundary
// match. Normalizing both sides removes that dead zone without requiring
// complex Unicode lookarounds in every lexicon entry.
const stripAccents = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function categorize(rationale) {
  if (!rationale || typeof rationale !== 'string') return 'missing';
  const s = rationale.trim();
  if (s.length > 300) return 'long';
  // Short rationales with an equation/computation (e.g. "5-5 = 0.") teach
  // via arithmetic demonstration — don't penalize for brevity.
  const hasEquation = /=/.test(s);
  if (s.length < 10 && !hasEquation) return 'short';
  if (s.length < 6) return 'short';
  if (RESTATE_RE.test(s)) return 'restatement';
  const sAscii = stripAccents(s);
  if (METHOD_RE.test(sAscii)) return 'method';
  if (COMPUTATION_RE.test(s) || SUBSTITUTION_RE.test(s) || TRANSFORMATION_RE.test(s) || DEFINITION_RE.test(s) || ARITHMETIC_RE.test(s)) return 'method';
  return 'generic';
}
