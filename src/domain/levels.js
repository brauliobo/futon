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

  static math = new LevelRegistry(Levels.MATH);
  static portuguese = new LevelRegistry(Levels.PORTUGUESE);
  static english = new LevelRegistry(Levels.ENGLISH);
}
