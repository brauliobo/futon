class LevelRegistry {
  constructor(levels) { this.levels = levels; }
  order() { return this.levels.map(l => l.id); }
  name(id) { return this.levels.find(l => l.id === id)?.name || id; }
  i18nKey(id) { const t = this.levels.find(l => l.id === id)?.topic; return t ? `level_name_${t}` : ''; }
}

export class Levels {
  static MATH = [
    { id: '7A', topic: 'count_1_5', name: 'Counting 1–5' },
    { id: '6A', topic: 'count_1_10', name: 'Counting 1–10' },
    { id: '5A', topic: 'count_1_20', name: 'Counting 1–20' },
    { id: '4A', topic: 'count_1_50', name: 'Counting 1–50 • Simple Addition' },
    { id: '3A', topic: 'addition_basic', name: 'Single‑digit Addition' },
    { id: '2A', topic: 'subtraction_basic', name: 'Single‑digit Subtraction' },
    { id: '1A', topic: 'add_sub_0_10', name: 'Addition & Subtraction within 10' },
    { id: 'A', topic: 'addition', name: 'Addition within 20' },
    { id: 'B', topic: 'addition_subtraction', name: 'Addition/Subtraction (2‑digit with regrouping)' },
    { id: 'C', topic: 'multiplication', name: 'Multiplication Facts' },
    { id: 'D', topic: 'division', name: 'Division Facts' },
    { id: 'E', topic: 'fractions_add_sub', name: 'Fractions (+/−)' },
    { id: 'F', topic: 'fractions_decimals', name: 'Fractions ×/÷ • Decimals' },
    { id: 'G', topic: 'integers_expressions', name: 'Integers & Expressions' },
    { id: 'H', topic: 'linear_equations', name: 'Linear Equations & Inequalities' },
    { id: 'I', topic: 'quadratics_exponents', name: 'Quadratics • Exponents • Radicals' },
    { id: 'J', topic: 'algebra_advanced', name: 'Advanced Algebra' },
    { id: 'K', topic: 'functions_graphs', name: 'Functions & Graphs' },
    { id: 'L', topic: 'trigonometry', name: 'Trigonometry' },
    { id: 'M', topic: 'trigonometry_advanced_series', name: 'Advanced Trigonometry • Series' },
    { id: 'N', topic: 'differential_calculus', name: 'Differential Calculus' },
    { id: 'O', topic: 'integral_calculus', name: 'Integral Calculus' },
    { id: 'P', topic: 'probability_statistics', name: 'Probability & Statistics' },
    { id: 'Q', topic: 'geometry_linalg', name: 'Geometry & Linear Algebra' },
  ];

  static MATH_GROUPS = [
    { id: 'early_learner', name: 'Early Learner', levelIds: ['7A','6A','5A','4A'] },
    { id: 'basic_ops_foundation', name: 'Basic Ops Foundation', levelIds: ['3A','2A','1A','A','B'] },
    { id: 'mult_div', name: 'Multiplication & Division', levelIds: ['C','D'] },
    { id: 'fractions_decimals', name: 'Fractions & Decimals', levelIds: ['E','F'] },
    { id: 'pre_algebra', name: 'Pre-Algebra', levelIds: ['G','H'] },
    { id: 'algebra', name: 'Algebra', levelIds: ['I','J'] },
    { id: 'adv_alg_trig', name: 'Adv Algebra & Trig', levelIds: ['K','L','M'] },
    { id: 'calculus', name: 'Calculus', levelIds: ['N','O'] },
  ];

  static PORTUGUESE = [
    { id: '7A', topic: 'early_grammar_reading', name: 'Gramática Inicial & Leitura' },
    { id: '6A', topic: 'early_literacy', name: 'Letras, Sílabas e Palavras' },
    { id: '5A', topic: 'literacy', name: 'Aprendendo a Ler e Escrever' },
    { id: '4A', topic: 'literacy', name: 'Aprendendo a Ler e Escrever' },
    { id: '3A', topic: 'literacy', name: 'Aprendendo a Ler e Escrever' },
    { id: '2A', topic: 'literacy', name: 'Aprendendo a Ler e Escrever' },
    { id: '1A', topic: 'basic_literacy', name: 'Reconhecimento de Letras e Palavras' },
    { id: 'A', topic: 'reading_grammar', name: 'Leitura & Gramática' },
    { id: 'B', topic: 'sentence_building', name: 'Construção de Frases' },
    { id: 'C', topic: 'sentence_building', name: 'Construção de Frases' },
    { id: 'D', topic: 'paragraph_building', name: 'EF — Construção de Parágrafos' },
    { id: 'E', topic: 'morfologia', name: 'EF — Morfologia' },
    { id: 'F', topic: 'conjugacao', name: 'EF — Conjugação Verbal' },
    { id: 'G', topic: 'sintaxe_simples', name: 'EF — Sintaxe (Período Simples)' },
    { id: 'H', topic: 'sintaxe_composta', name: 'EF — Sintaxe Composta & Concordância' },
    { id: 'I', topic: 'estilistica', name: 'EM — Figuras de Linguagem & Estilística' },
    { id: 'J', topic: 'generos_textuais', name: 'EM — Gêneros Textuais' },
    { id: 'K', topic: 'analise_literaria', name: 'EM — Análise Literária' },
    { id: 'L', topic: 'redacao_dissertativa', name: 'EM — Redação Dissertativa-Argumentativa' },
  ];

  static ENGLISH = [
    { id: '7A', topic: 'english_pre_listening', name: 'Pre-listening — Sounds & Rhythm' },
    { id: '6A', topic: 'english_pre_listening', name: 'Pre-listening — Sounds & Rhythm' },
    { id: '5A', topic: 'english_pre_listening', name: 'Pre-listening — Sounds & Rhythm' },
    { id: '4A', topic: 'english_first_words', name: 'First Words' },
    { id: '3A', topic: 'english_first_words', name: 'First Words' },
    { id: '2A', topic: 'english_simple_phrases', name: 'Simple Phrases' },
    { id: '1A', topic: 'english_simple_phrases', name: 'Simple Phrases' },
    { id: 'A', topic: 'english_vocab', name: 'A1 — Basic Vocabulary' },
    { id: 'B', topic: 'english_present_simple', name: 'A1 — Present Simple' },
    { id: 'C', topic: 'english_past_simple', name: 'A2 — Past Simple' },
    { id: 'D', topic: 'english_future_comparison', name: 'A2 — Future & Comparison' },
    { id: 'E', topic: 'english_present_continuous', name: 'A2 — Present Continuous' },
    { id: 'F', topic: 'english_articles_pronouns', name: 'A2 — Articles, Plurals & Pronouns' },
    { id: 'G', topic: 'english_perfect_continuous', name: 'B1 — Present Perfect & Past Continuous' },
    { id: 'H', topic: 'english_modals', name: 'B1 — Modal Verbs' },
    { id: 'I', topic: 'english_conditionals', name: 'B1 — Conditionals & Wishes' },
    { id: 'J', topic: 'english_passive', name: 'B2 — Passive Voice' },
    { id: 'K', topic: 'english_reported_speech', name: 'B2 — Reported Speech' },
    { id: 'L', topic: 'english_phrasal_reading', name: 'B2+ — Phrasal Verbs & Reading' },
  ];

  static JAPANESE = [
    { id: '4A', topic: 'japanese_hiragana_basic', name: 'Hiragana — Unvoiced' },
    { id: '3A', topic: 'japanese_hiragana_advanced', name: 'Hiragana — Voiced & Combined' },
    { id: '2A', topic: 'japanese_katakana', name: 'Katakana & Loan Words' },
    { id: '1A', topic: 'japanese_kana_review', name: 'Kana Review & Mixed Drills' },
    { id: 'A',  topic: 'japanese_kanji_intro', name: 'N5 — First Kanji & Sentence Patterns' },
    { id: 'B',  topic: 'japanese_particles_verbs', name: 'N5 — Particles & Verbs' },
    { id: 'C',  topic: 'japanese_adjectives_past', name: 'N5 — Adjectives & Past Tense' },
    { id: 'D',  topic: 'japanese_connectors', name: 'N4 — Connectors & Reasons' },
    { id: 'E',  topic: 'japanese_plain_form', name: 'N4 — Plain Form & Quotes' },
    { id: 'F',  topic: 'japanese_modifiers', name: 'N4 — Modifiers & Conditions' },
    { id: 'G',  topic: 'japanese_discourse', name: 'N4 — Discourse & Function' },
    { id: 'H',  topic: 'japanese_advanced_grammar', name: 'N3 — Advanced Grammar' },
    { id: 'I',  topic: 'japanese_jlpt_n3', name: 'JLPT N3' },
    { id: 'J',  topic: 'japanese_jlpt_n2', name: 'JLPT N2' },
    { id: 'K',  topic: 'japanese_jlpt_n1', name: 'JLPT N1' },
    { id: 'L',  topic: 'japanese_native_polish', name: 'Native Polish' },
  ];

  static SPANISH = [
    { id: '7A', topic: 'spanish_word_classes', name: 'Clases de Palabras' },
    { id: '6A', topic: 'spanish_pre_reading', name: 'Lectura Inicial' },
    { id: '5A', topic: 'spanish_pre_reading', name: 'Lectura Inicial' },
    { id: '4A', topic: 'spanish_pre_reading', name: 'Lectura Inicial' },
    { id: '3A', topic: 'spanish_pre_reading', name: 'Lectura Inicial' },
    { id: '2A', topic: 'spanish_pre_reading', name: 'Lectura Inicial' },
    { id: '1A', topic: 'spanish_verb_tenses', name: 'Tiempos Verbales Básicos' },
    { id: 'A',  topic: 'spanish_reading', name: 'Comprensión Lectora' },
    { id: 'B',  topic: 'spanish_sentences', name: 'Construcción de Oraciones' },
    { id: 'C',  topic: 'spanish_sentences', name: 'Construcción de Oraciones' },
    { id: 'D',  topic: 'spanish_argumentation', name: 'Texto Argumentativo' },
    { id: 'E',  topic: 'spanish_siglo_oro', name: 'Literatura — Siglo de Oro' },
    { id: 'F',  topic: 'spanish_grammar_adv', name: 'Gramática Avanzada' },
    { id: 'G',  topic: 'spanish_grammar_adv', name: 'Gramática Avanzada' },
    { id: 'H',  topic: 'spanish_linguistics', name: 'Teoría Lingüística' },
    { id: 'I',  topic: 'spanish_linguistics', name: 'Teoría Lingüística' },
    { id: 'J',  topic: 'spanish_linguistics', name: 'Teoría Lingüística' },
    { id: 'K',  topic: 'spanish_writing', name: 'Redacción y Composición' },
    { id: 'L',  topic: 'spanish_writing', name: 'Redacción y Composición' },
  ];

  // Biology is a frontier-research corpus structured progressively over 19
  // levels (7A→S). Topics are themed per-level rather than a fixed sequence
  // of skills, so the names are descriptive rather than skill-coded.
  static BIOLOGY = [
    { id: '7A', topic: 'biology_intro',          name: 'Vida e Células — Introdução' },
    { id: '6A', topic: 'biology_systems',        name: 'Sistemas do Corpo' },
    { id: '5A', topic: 'biology_chemistry',      name: 'Bioquímica & Macromoléculas' },
    { id: '4A', topic: 'biology_genetics_intro', name: 'Genética & DNA — Introdução' },
    { id: '3A', topic: 'biology_evolution',      name: 'Evolução & Diversidade' },
    { id: '2A', topic: 'biology_ecology',        name: 'Ecologia & Ambiente' },
    { id: '1A', topic: 'biology_life_origins',   name: 'Origens da Vida' },
    { id: 'A',  topic: 'biology_advanced_1',     name: 'Biologia Avançada I' },
    { id: 'B',  topic: 'biology_advanced_2',     name: 'Biologia Avançada II' },
    { id: 'C',  topic: 'biology_advanced_3',     name: 'Biologia Avançada III' },
    { id: 'D',  topic: 'biology_advanced_4',     name: 'Biologia Avançada IV' },
    { id: 'E',  topic: 'biology_research_1',     name: 'Biologia de Fronteira I' },
    { id: 'F',  topic: 'biology_research_2',     name: 'Biologia de Fronteira II' },
    { id: 'G',  topic: 'biology_research_3',     name: 'Biologia de Fronteira III' },
    { id: 'H',  topic: 'biology_research_4',     name: 'Biologia de Fronteira IV' },
    { id: 'I',  topic: 'biology_research_5',     name: 'Biologia de Fronteira V' },
    { id: 'J',  topic: 'biology_research_6',     name: 'Biologia de Fronteira VI' },
    { id: 'K',  topic: 'biology_research_7',     name: 'Biologia de Fronteira VII' },
    { id: 'L',  topic: 'biology_research_8',     name: 'Biologia de Fronteira VIII' },
    { id: 'M',  topic: 'biology_research_9',     name: 'Biologia de Fronteira IX' },
    { id: 'N',  topic: 'biology_research_10',    name: 'Biologia de Fronteira X' },
    { id: 'O',  topic: 'biology_research_11',    name: 'Biologia de Fronteira XI' },
    { id: 'P',  topic: 'biology_research_12',    name: 'Biologia de Fronteira XII' },
    { id: 'Q',  topic: 'biology_research_13',    name: 'Biologia de Fronteira XIII' },
    { id: 'R',  topic: 'biology_research_14',    name: 'Biologia de Fronteira XIV' },
    { id: 'S',  topic: 'biology_research_15',    name: 'Biologia de Fronteira XV' },
  ];

  static math = new LevelRegistry(Levels.MATH);
  static portuguese = new LevelRegistry(Levels.PORTUGUESE);
  static english = new LevelRegistry(Levels.ENGLISH);
  static japanese = new LevelRegistry(Levels.JAPANESE);
  static spanish = new LevelRegistry(Levels.SPANISH);
  static biology = new LevelRegistry(Levels.BIOLOGY);
}
