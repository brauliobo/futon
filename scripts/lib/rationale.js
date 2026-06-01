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
  // Linear algebra / vectors
  'componente[s]?', 'subespaço[s]?', 'subespaco[s]?', 'vetor[ea]s?',
  'dimensão', 'dimensões', 'origem\\b', 'colinear', 'linearmente',
  'L\\.D\\.', 'L\\.I\\.', 'base\\b', 'gerador[ea]s?',
  // Statistics & probability
  'estima[mr]?\\b', 'estimador[ea]s?', 'estimação',
  'percentil', 'quartil', 'quartis',
  'hipótese[s]?', 'hipotético[s]?', 'nul[oa]', 'alternativ[oa]',
  'mínimos\\s+quadrados', 'regressão', 'correlação',
  'desvio\\s+padrão', 'variância', 'covariância',
  'média\\s+amostral', 'amostr[ae]', 'amostral',
  'rejeit[ae][mr]?\\b', 'aceit[ae][mr]?\\b',
  'reflexão', 'rotação', 'translação', 'transformação',
  'eixo[s]?\\b',
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
  // Grammar / reading concepts (ES — Spanish equivalents not covered by PT terms)
  'vocal[es]?', 'consonante[s]?', 'sustantivo[s]?', 'adjetivo[s]?',
  'adverbio[s]?', 'pronombre[s]?', 'verbo[s]?\\b',
  'expresa[mr]?n?', 'señala[mr]?n?', 'enlaza[mr]?n?', 'combina[mr]?n?', 'forman?\\b',
  'sustituye[mr]?n?', 'acompa[nñ]a[mr]?n?', 'complementa[mr]?n?',
  'sílabas?\\b', 'fonema[s]?', 'grafema[s]?', 'dígrafo[s]?', 'tilde[s]?',
  'acento[s]?', 'tónica[s]?', 'átona[s]?',
  'oración[es]?', 'cláusula[s]?', 'sintagma[s]?',
  'concordancia', 'régimen\\b', 'rección\\b',
  'pretérito', 'presente', 'subjuntivo', 'condicional',
  'pirámide', 'entradilla', 'reportaje', 'editorial', 'crónica',
  'ya\\s+que', 'dado\\s+que', 'por\\s+tanto', 'por\\s+ello', 'es\\s+decir',
  'porque\\b', 'sino\\b', 'aunque\\b',
  // Spanish copula+definition (teaching by classification)
  'es\\s+tu[s]?\\s+\\w', 'son\\s+tu[s]?\\s+\\w',
  'comparte[ns]?', 'parentesco', 'progenit[oó]r[ea]s?',
  'padre[s]?\\b', 'madre[s]?\\b', 'hijo[s]?\\b', 'hija[s]?\\b',
  'hermano[s]?', 'hermana[s]?', 'tí[oa]s?', 'prim[oa]s?\\b',
  'sobrin[oa]s?', 'niet[oa]s?', 'nuer[oa]', 'yerno', 'suegr[oa]s?',
  'cuñad[oa]s?', 'esposo[s]?', 'esposa[s]?', 'pareja',
  'suele[nm]?\\b', 'sole[nm]?os?\\b', 'pertenece[n]?\\b', 'contiene[n]?\\b',
  'deja[nm]?\\s+pasar', 'empieza\\s+(?:el|en|la)', 'comienza\\s+(?:el|en|la)',
  'es\\s+(?:la|el|una|uno)\\s+\\w', 'es\\s+un[ao]?\\s+\\w',
  'son\\s+(?:los|las)\\s+\\w', 'tras\\s+\\w', 'antes\\s+de',
  'arriba\\b', 'abajo\\b', 'encima\\b', 'debajo\\b',
  'lado[s]?\\b', 'lateral[es]?', 'parte\\s+(?:superior|inferior)',
  'cubierta', 'subterráneo', 'exterior\\b', 'interior\\b',
  'estación', 'habitación', 'temporada',
  'frí[ao]', 'caluros[ao]', 'cálid[ao]',
  // Spanish action verbs (teaching-by-function pattern)
  'anuncia[nm]?', 'introduce[n]?', 'separa[nm]?', 'delimita[nm]?',
  'encierra[nm]?', 'cierra[nm]?', 'abr[eo][nm]?',
  'requiere[n]?', 'lleva[nm]?\\b', 'produce[n]?\\b', 'causa[rn]?n?',
  'representa[nm]?', 'accede[n]?', 'controla[nm]?',
  'decimos\\b', 'denominamos?\\b', 'llamamos?\\b',
  'aplica[nm]?', 'explica[nm]?', 'revela[nm]?', 'refleja[nm]?',
  'interrumpe[n]?', 'anticipa[nm]?', 'omite[n]?', 'resume[n]?\\b',
  'afecta[nm]?', 'afect[oó]\\b', 'regulariza[nm]?', 'reduce[n]?\\b',
  'identifica[nm]?', 'cuando\\b', 'incluye[n]?', 'postula[nm]?',
  'opera[nm]?\\b', 'reproduce[n]?', 'desciende[n]?', 'descend[íi][oó]',
  'muestra[nm]?', 'establece[n]?', 'estableci[oó]\\b', 'evidencia[nm]?',
  'describe[n]?', 'influy[oó]\\b', 'redujo\\b', 'promovi[oó]\\b',
  'enriqueci[oó]\\b', 'perdieron?\\b', 'surgi[oó]\\b', 'fij[oó]\\b',
  'añade[nm]?', 'contrasta[nm]?', 'concede[n]?', 'une[n]?\\b',
  'conecta[nm]?', 'almacena[nm]?', 'prepara[nm]?', 'clasifica[nm]?',
  'protege[n]?', 'permite[n]?', 'impide[n]?', 'relaciona[nm]?',
  'exige[n]?', 'mitig[ae][nr]?', 'atenú[ae][nr]?', 'aport[aoó]n?\\b',
  'caracteriz[ae][nr]?', 'distingue[n]?', 'diferencia[nm]?',
  'presenta[nm]?', 'distorsiona[nm]?', 'ilustra[nm]?', 'mide[n]?\\b',
  'conclusion[es]?', 'estructura[nm]?\\b', 'argumento[s]?', 'tesis\\b',
  'cuida[nm]?', 'trabaja[nm]?', 'compone[n]?', 'transporta[nm]?', 'impulsa[nm]?',
  'recibe[n]?', 'percibe[n]?', 'toman?\\b', 'moja[nm]?', 'conserva[nm]?',
  'dejaron\\b', 'perdi[oó]\\b', 'sustituye[nm]?', 'sustituy[oó]\\b',
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
  // Literary analysis (D-L PT)
  'mantemos\\b', 'mant[ée]m\\b', 'eliminamos\\b', 'elimina[mr]?',
  'destruição', 'criação', 'destruir', 'cria[mr]?',
  'madur[oa]', 'comprometid[oa]', 'irreverent[ea]',
  'múltipl[oa][s]?', 'univocidade', 'ambíguo',
  'contempor[âa]ne[oa]s?', 'opost[oa]s?', 'concepção', 'concep[çc][ãa]o',
  'competência[s]?', 'avaliad[oa]s?', 'avaliam?', 'avaliar?\\b',
  'domin[ae][rs]?\\b', 'domin[ao]u', 'objetivo[s]?\\b',
  'diversidade', 'tradição', 'tradições', 'diálogo[s]?',
  'questionamento', 'perspectiva[s]?', 'gênero[s]?', 'forma[s]?\\b',
  'narrador', 'personagem', 'protagonista', 'antagonista', 'narrad[oa]',
  'discurso', 'enunciação', 'enunciador', 'foco\\s+narrativo',
  'onisciência', 'onisciente', 'oniscient[ea]', 'onipotente',
  'desfecho', 'enredo', 'trama', 'conflito\\b', 'clímax\\b',
  'epopeia', 'soneto', 'crônica', 'romance\\b', 'conto\\b',
  'reflete[mr]?\\b', 'reflet[ei][mr]?', 'reflexo[s]?', 'incorpor[ae][mr]?',
  'rompe[mr]?', 'romp[ei][mr]?', 'amplifica[mr]?', 'manipul[ae][mr]?',
  'naturaliz[ae][mr]?', 'veicul[ae][mr]?', 'subverte[mr]?',
  'denunci[ae][mr]?', 'critic[ae][mr]?\\b', 'questiona[mr]?',
  'estratégia[s]?', 'técnica[s]?', 'procedimento[s]?', 'metodologia',
  'cânone', 'tradição\\b', 'ruptura', 'continuidade', 'permanência',
  'ajuda\\s+a', 'permite[mr]?', 'garante[mr]?', 'expande[mr]?',
  'fer[ei][mr]?\\s+os?\\s+direitos', 'incorpor[oa]u', 'penetra[mr]?',
  'consciência\\b', 'subjetividade', 'multiplicidade', 'ambiguidade',
  'cientificismo', 'parnasian[oa]s?', 'modernist[ae]s?', 'romântic[oa]s?',
  'realist[ae]s?', 'naturalist[ae]s?', 'simbolist[ae]s?',
  'marg[ie]nal', 'periféric[oa]s?', 'hegemônic[oa]', 'dominante[s]?',
  'ideologi[ao]s?', 'ideológic[oa]s?', 'representa[çc][ãa]o',
  'verso[s]?\\b', 'estrofe[s]?', 'rima[s]?\\b', 'métrica',
  'editorial', 'opinativ[oa]s?', 'persuasiv[oa]s?', 'argumentação',
  'reprodutibilidade', 'precisão',
  // English equivalents
  'first', 'then', 'because', 'count', 'add', 'subtract', 'multiply',
  'divide', 'double', 'half', 'step', 'notice', 'start', 'rule', 'pattern',
  'locate', 'identify', 'replace', 'means', 'indicates', 'modifies',
  'links', 'substitute', 'determines', 'ends\\s+with', 'starts\\s+with',
  'borrow', 'carry', 'digit', 'column', 'regroup',
  // Japanese-grammar pedagogical markers (PT explanations of JP patterns)
  'implica[mr]?\\b', 'implicar?\\b', 'antecede[mr]?', 'antecedem?',
  'destaca[mr]?\\b', 'destac[ae][rs]?', 'intercambiáv[ea][il]s?',
  'neutr[oa]\\b', 'optativ[oa]', 'opcional', 'versátil', 'versáteis',
  'justificativa', 'ênfase', 'enfátic[oa]', 'coloquial', 'formal',
  'concessiv[oa][s]?', 'admirativ[oa]', 'simultâne[oa]',
  'reforça[mr]?', 'reforço', 'matiz[ea]', 'nuanc[ea]',
  'nega[mr]?\\b', 'negar?\\b', 'afirma[mr]?', 'afirmar?\\b',
  'partícula', 'sufixo', 'prefixo', 'auxiliar', 'auxiliares',
  'indicar?\\b', 'expressar?\\b', 'expressa[mr]?', 'expressam?',
  'denota[rm]?\\b', 'sinaliza[rm]?', 'marca[rm]?\\b',
  'forma\\s+(?:て|た|る|ない|polida|coloquial|negativ[ao]|imperativ[ao])',
  'generalizaç[ãa]o', 'generaliza[mr]?', 'simplificação', 'pressupost[oa]',
  'tópico', 'contexto', 'propósito', 'condi[çc][ãa]o', 'condicional',
  'sequenc[ia]al', 'sequência\\b', 'simultaneidade', 'consequência',
  'conjunção', 'conector', 'desinência', 'flexão', 'conjuga[çc][ãa]o',
  'transitiv[oa]s?', 'intransitiv[oa]s?', 'reflex[ivo]+s?',
  'objeto\\s+(?:direto|indireto)', 'sujeito', 'predicativo',
  'plano\\b', 'programa', 'habitual', 'volitiv[oa]', 'desid[ée]ri[oa]', 'intenção',
  // Biology / life-sciences (PT)
  'metabolismo', 'metabólic[oa]s?', 'homeostase', 'hom[eé]ostas[ei]',
  'reprodu[çc][ãa]o', 'reproduzem?', 'reproduz[aei][mr]?',
  'respirar?', 'respira[mr]?', 'respira[çc][ãa]o', 'respirat[óo]ri[oa]',
  'célul[ao]s?', 'celular', 'tecid[oa]s?', 'órgão[s]?', 'organism[oa]s?',
  'gamet[ao]s?', 'gen[ée]tic[oa]', 'cromossom[oa]s?', 'DNA',
  'evolu[çc][ãa]o', 'evolutiv[oa]s?', 'sele[çc][ãa]o', 'adaptaç[ãa]o', 'adapta[mr]?',
  'fotossíntese', 'cloroplasto[s]?', 'mitoc[ôo]ndria[s]?',
  'gametas?', 'pólen', 'flor[ea]s?', 'fruto[s]?', 'sement[ea]s?',
  'sazon[ai]l', 'sazonal', 'migra[çc][ãa]o', 'migrat[óo]ri[oa]',
  'esp[ée]cie[s]?', 'gen[ée]ric[oa]', 'predador[ea]s?', 'pres[ae]s?\\b',
  'ecossistema[s]?', 'biom[ae]', 'cadeia\\s+alimentar', 'nicho',
  'autotrof[oa]s?', 'heterotrof[oa]s?', 'decompositor[ea]s?',
  'temperatura\\s+corporal', 'equil[íi]brio', 'regul[ae]', 'regulam?',
  'enzim[ao]s?', 'horm[ôo]ni[oa]s?', 'sangue', 'circulação',
  'digest[ãa]o', 'sistema\\s+(?:nervoso|digest|circulat|respirat|imun)',
  'estímulo[s]?', 'percep[çc][ãa]o', 'sinal\\b',
  // English equivalents (biology)
  'metabolism', 'homeostasis', 'reproduce[ds]?', 'respiration', 'cell[s]?\\b',
  'organism[s]?', 'species', 'evolution', 'photosynthesis', 'gamete[s]?',
  'ecosystem[s]?', 'predator[s]?', 'adapt[s]?', 'regulate[s]?', 'enzyme[s]?',
];
export const METHOD_RE = new RegExp(
  '\\b(?:' + METHOD_TERMS.map(t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).join('|') + ')\\b',
  'i'
);

export const RESTATE_RE = /^\s*(a\s+(?:resposta|grafia|forma|preposição|palavra|letra)\s+correta\s+(?:aqui\s+)?(?:é|usa)|resposta:|answer:|é\s+\d|is\s+\d|the\s+correct\s+answer|correct\s+answer:)/i;

// Worked-computation signal: two or more '=' forming a derivation chain,
// or an explicit substitution like f(x) = ... Signals "teaches by showing
// the computation" without needing an imperative verb.
// Two-equals derivation chain OR single-equals between two substantive tokens (≥4 chars)
const COMPUTATION_RE = /=\s*[^=]+=\s*[^=]+|[A-Za-záéíóúâêôãõ]{4,}\s*=\s*[A-Za-záéíóúâêôãõ]{4,}/;
const SUBSTITUTION_RE = /[a-z]\([-+]?\d/i;
// Simple arithmetic: "5-5 = 0", "3 × 4 = 12", "-2 + 7 = 5". Short but
// clearly teaching by demonstration.
const ARITHMETIC_RE = /-?\d+\s*[+\-−×÷*\/]\s*-?\d+\s*=\s*-?\d/;
// Transformation arrow: "'study' → 'studied'" / "X → Y" / "2 → 4" —
// demonstrates before-and-after mapping, a core mastery teaching pattern.
const TRANSFORMATION_RE = /\S\s*[→>]\s*\S/;
// Definition: "'Could' = habilidade geral passada." — quoted word followed
// by an equals glossing it. Also matches unquoted capitalized concept
// terms in three patterns: (1) explicit `=`, (2) PT copula `é/são`,
// (3) ≥3-word noun-led classification ("Obras ambientadas na Bahia.").
// Pure-imperative or 2-word fragments like "Pense bem." or "Resposta
// correta!" don't qualify — they aren't classifying anything.
const DEFINITION_RE = /(?:['"][^'"]{2,}['"]\s*=?\s*\S|\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{3,}[\s,;:]*(?:=\s*\S|\sé\s|\ssão\s|\ses\s|\sson\s|\sis\s|\sare\s|(?:[\s,;:]+\S+){3,})|\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+\S+){1,8}?\s+(?:é|são|es|son|is|are)\s+\S|\b[A-Z]\s*=\s*\S)/;
// Bilingual sentence-decomposition: a Japanese script chunk followed by
// its parenthetical translation, joined by " + " into the next chunk.
// Or: PT term '=' japanese script with parenthetical reading.
// E.g. "電車で (de trem) + 駅まで (até a estação) + 行きます (vou)."
//      "leste = 東 (ひがし)."
// Both are teaching methods — chunked or definitional bilingual mapping.
const JP_DECOMP_RE = /[぀-ヿ一-鿿].*\([^)]+\)\s*\+|=\s*[一-鿿぀-ヿ][^\s]*\s*\(/;
// Generic chunk-by-chunk decomposition: ≥2 occurrences of ' + ' joining
// substantive tokens. Teaches by sentence chunking — common in JP, EN, PT
// grammar drills. e.g. "この決定 + をめぐって + 議論が起きた"
//                       "at + hora + in the evening"
//                       "De + o = do"
const PLUS_DECOMP_RE = /\S+\s+\+\s+\S+\s+\+\s+\S/;
// Non-numeric equation: variable/word `=` value with operators. Catches
// "C(n,1) = n", "De + o = do", "x! = x*(x-1)*…", "a + b = c".
// Distinct from COMPUTATION_RE (which requires ≥4-char tokens both sides).
const ALPHA_EQ_RE = /\S\s*[+\-×÷*]\s*\S+\s*=\s*\S/;
// Vocabulary enumeration with parenthetical translations or numeric values:
// ≥2 entries of `term (gloss)` separated by commas/slashes/spaces or by
// the conjunction 'e'/'and'/'y'/'ou'. Teaches by lexical mapping — common
// in early-grade vocab and number sets.
// e.g. "kitchen (cozinha), bedroom (quarto), bathroom (banheiro)"
//      "Cat (gato) e dog (cachorro) são animais domésticos."
const VOCAB_ENUM_RE = /[\wáéíóúâêôãõç-]+\s*\([^)]+\)\s*(?:[,;/]|\s+(?:e|y|and|ou)\s+)\s*[\wáéíóúâêôãõç-]+\s*\([^)]+\)/i;
// Word-family enumeration: "família -X" or "família X-" introducing a
// list of words sharing a phonetic pattern. Specific to phonics/literacy
// lessons in early-grade language sets.
const WORD_FAMILY_RE = /família\s+-?[a-z]+-?\b[^:]*:\s*\w/i;
// "Phrase: list" enumeration — ≥3 comma- or slash-separated terms after a
// colon. Terms may be multi-word ("a cat", "in the evening").
// e.g. "As 4 estações: spring, summer, autumn, winter."
//      "eat: I/you/we/they eat, he/she/it eats."
//      "'a' antes de sons consonantais: a cat, a dog, a house."
const COLON_LIST_RE = /:\s*[\wáéíóúâêôãõç'-][^,/]*?(?:\s*[,/]\s*[\wáéíóúâêôãõç'-][^,/]*?){2,}[.\s]*$/im;
// Numeric/word equation: "1 = one", "10 = ten" — digit equating to a
// word definition (early-grade vocabulary).
const NUM_DEF_RE = /\b\d+\s*=\s*[A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç]/;
// Phrase-equation: "term-or-phrase = explanation". Catches grammar-rule
// definitions like "Has to (3ª pessoa) = obrigação externa.",
// "Don't have to = não é necessário."
const PHRASE_EQ_RE = /[A-Za-záéíóúâêôãõç'][\w'\s()ª°-]{1,30}\s*=\s*[A-Za-záéíóúâêôãõç]/;
// Numbered-list teaching pattern: "1) X 2) Y 3) Z 4) W" enumerates
// criteria/steps. Used in math criteria lists, PT essay structure, etc.
//  e.g. "1) n fixo 2) independência 3) apenas 2 resultados 4) p constante."
const NUMBERED_LIST_RE = /\b1\)\s*\S+.*\b2\)\s*\S+.*\b3\)/;
// Inline list with summary: ≥3 comma-separated terms then em-dash/dash and a
// short descriptor. e.g. "shirt, pants, dress, shoes, hat — 5 roupas básicas."
// or "I, you, he, she, it, we, they — os sete pronomes pessoais."
const ENUM_LIST_RE = /(?:[\wáéíóúâêôãõç-]+\s*,\s*){2,}[\wáéíóúâêôãõç/-]+\s*[—–-]\s*\S/i;
// Math shorthand: factorials, exponents, combinations, approximations,
// variable assignments, middle-dot products, statistical symbols, matrix
// entries.
// e.g. "4! = 24.", "C(n,1) = n", "1/6 ≈ 0.167", "a = 4", "(2,4)=2·(1,2)",
//      "(0.5)^2 = 0.25", "Q1 = 25º percentil", "α=0.05", "L.D. ↔ det = 0",
//      "T: (3,3)", "R90°(5,0)=(0,5)", "A⁻¹[1,2] = -1", "(90/360)·π·64 = 16π"
const MATH_SHORTHAND_RE = /\b\d+!\s*=|\d+\s*\^\s*\d+\s*=|\([\d.]+\)\^\d|C\(\s*[a-z\d]|[\d\w/]+\s*≈\s*[\d.]+|C\([a-z],[a-z\d]\)\s*=|\b[a-z]\s*=\s*[\d(\-]|·\s*[(\dπ]|[QHα-ω][₀-₉0-9]?\s*=|↔|°\s*\(|[A-Z][⁻¹⁰¹²³⁴⁵⁶⁷⁸⁹]{0,2}\[\d|\|[^|]+\|\s*=/i;
// Japanese script with grammatical enumeration: kanji/kana followed by a
// colon, comma list, or " : " with at least one paired term.
// e.g. "どころか: 親切どころか、上手どころか、謝るどころか."
//      "ものだから tem mais ênfase e peso de justificativa que から e ので."
//      "Nだけあって、Vただけあって — Latin lead is ok if JP-comma follows."
const JP_GRAMMAR_RE = /[\w一-鿿぀-ヿ][\w\s一-鿿぀-ヿ]*[一-鿿぀-ヿ][^\s]*\s*[:、,]\s*[\w\s一-鿿぀-ヿ]*[一-鿿぀-ヿ]/;
// Pattern-explanation structure: starts with a JP-script grammar pattern
// then PT/EN explanation copula (é/são/pode/serve/segue/aceita/significa/
// usa-se/funciona/equivale). Note JS \b is ASCII-only so we anchor on
// trailing whitespace or punctuation rather than \b.
//  e.g. "ないことはない é uma aceitação hesitante"
//       "を踏まえた上で é a estrutura ideal..."
//       "ならでは pode seguir: 日本ならでは"
//       "に則して ≒ に基づいて, mas..."
const JP_PATTERN_DESC_RE = /[一-鿿぀-ヿ][^\s]*\s+(?:é|são|pode|poder|serve|segue|aceita|significa|indica|usa(?:-se)?|representa|expressa|denota|funciona|equivale|conecta|exige|contém|tem|ter|≒|≈|=)[\s\W]/i;

// Strip accents for matching: JS `\b` anchors are ASCII-only, so words that
// *start* with accented letters (ângulo, década) never fire a word-boundary
// match. Normalizing both sides removes that dead zone without requiring
// complex Unicode lookarounds in every lexicon entry.
const stripAccents = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function categorize(rationale, { maxLen = 300 } = {}) {
  if (rationale == null) return 'missing';
  // Bilingual rationales are stored as {pt, en}; categorize on the pt
  // surface (lexicon is PT-tuned) and fall back to en.
  let raw = rationale;
  if (typeof raw === 'object') raw = raw.pt ?? raw.en ?? '';
  if (typeof raw !== 'string' || !raw) return 'missing';
  const s = raw.trim();
  if (s.length > maxLen) return 'long';
  // Short rationales with an equation/computation (e.g. "5-5 = 0.") teach
  // via arithmetic demonstration — don't penalize for brevity.
  const hasEquation = /=/.test(s);
  if (s.length < 10 && !hasEquation) return 'short';
  if (s.length < 6) return 'short';
  if (RESTATE_RE.test(s)) return 'restatement';
  const sAscii = stripAccents(s);
  if (METHOD_RE.test(sAscii)) return 'method';
  if (COMPUTATION_RE.test(s) || SUBSTITUTION_RE.test(s) || TRANSFORMATION_RE.test(s) || DEFINITION_RE.test(s) || ARITHMETIC_RE.test(s) || JP_DECOMP_RE.test(s) || VOCAB_ENUM_RE.test(s) || WORD_FAMILY_RE.test(s) || ENUM_LIST_RE.test(s) || MATH_SHORTHAND_RE.test(s) || JP_GRAMMAR_RE.test(s) || COLON_LIST_RE.test(s) || NUM_DEF_RE.test(s) || PLUS_DECOMP_RE.test(s) || ALPHA_EQ_RE.test(s) || JP_PATTERN_DESC_RE.test(s) || PHRASE_EQ_RE.test(s) || NUMBERED_LIST_RE.test(s)) return 'method';
  return 'generic';
}
