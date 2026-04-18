// Shared rationale classification used by pedagogy-eval.js and
// rationale-review.js. Categories are defined in docs/PEDAGOGY.md.

// Method vocabulary: imperatives, reasoning connectors, and domain-specific
// operation/concept words. A rationale earns "method" credit if it uses any
// of these — i.e. it teaches *how* or *why*, not just restates the answer.
export const METHOD_RE = new RegExp('\\b(?:' + [
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
  // Grammar / reading concepts (PT)
  'termin[ao]', 'respond[ae]', 'modifica', 'liga', 'indica', 'substitui',
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
].join('|') + ')\\b', 'i');

export const RESTATE_RE = /^\s*(a\s+(?:resposta|grafia|forma|preposição|palavra|letra)\s+correta\s+(?:aqui\s+)?(?:é|usa)|resposta:|answer:|é\s+\d|is\s+\d|the\s+correct\s+answer|correct\s+answer:)/i;

// Worked-computation signal: two or more '=' forming a derivation chain,
// or an explicit substitution like f(x) = ... Signals "teaches by showing
// the computation" without needing an imperative verb.
const COMPUTATION_RE = /=\s*[^=]+=\s*[^=]+/;
const SUBSTITUTION_RE = /[a-z]\([-+]?\d/i;
// Simple arithmetic: "5-5 = 0", "3 × 4 = 12", "-2 + 7 = 5". Short but
// clearly teaching by demonstration.
const ARITHMETIC_RE = /-?\d+\s*[+\-×÷*\/]\s*-?\d+\s*=\s*-?\d/;
// Transformation arrow: "'study' → 'studied'" / "X → Y" / "2 → 4" —
// demonstrates before-and-after mapping, a core Kumon teaching pattern.
const TRANSFORMATION_RE = /\S\s*→\s*\S/;
// Definition: "'Could' = habilidade geral passada." — quoted word followed
// by an equals glossing it. Also matches unquoted capitalized concept
// terms like "Desenvolvimento = expandir a ideia..." and single-variable
// math formulas like "A = base × altura" or "V = πr²h".
const DEFINITION_RE = /(?:['"][^'"]{2,}['"]|\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{3,}|[A-Z]\s+=)\s*=?\s*\S/;

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
  if (METHOD_RE.test(s)) return 'method';
  if (COMPUTATION_RE.test(s) || SUBSTITUTION_RE.test(s) || TRANSFORMATION_RE.test(s) || DEFINITION_RE.test(s) || ARITHMETIC_RE.test(s)) return 'method';
  return 'generic';
}
