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
    { id: '7A', topic: 'pre_reading', name: 'Repetição e Recitação' },
    { id: '6A', topic: 'pre_reading', name: 'Repetição e Recitação' },
    { id: '5A', topic: 'literacy', name: 'Aprendendo a Ler e Escrever' },
    { id: '4A', topic: 'literacy', name: 'Aprendendo a Ler e Escrever' },
    { id: '3A', topic: 'literacy', name: 'Aprendendo a Ler e Escrever' },
    { id: '2A', topic: 'literacy', name: 'Aprendendo a Ler e Escrever' },
    { id: '1A', topic: 'basic_literacy', name: 'Reconhecimento de Letras e Palavras' },
    { id: 'A', topic: 'sentence_building', name: 'Construção de Frases' },
    { id: 'B', topic: 'sentence_building', name: 'Construção de Frases' },
    { id: 'C', topic: 'sentence_building', name: 'Construção de Frases' },
    { id: 'D', topic: 'paragraph_building', name: 'Construção de Parágrafos' },
    { id: 'E', topic: 'paragraph_building', name: 'Construção de Parágrafos' },
    { id: 'F', topic: 'paragraph_building', name: 'Construção de Parágrafos' },
    { id: 'G', topic: 'summarisation', name: 'Resumo' },
    { id: 'H', topic: 'summarisation', name: 'Resumo' },
    { id: 'I', topic: 'summarisation', name: 'Resumo' },
    { id: 'J', topic: 'critique', name: 'Crítica' },
    { id: 'K', topic: 'critique', name: 'Crítica' },
    { id: 'L', topic: 'critique', name: 'Crítica' },
  ];

  static ENGLISH = [
    { id: '7A', topic: 'pre_reading', name: 'Repeating and Reciting' },
    { id: '6A', topic: 'pre_reading', name: 'Repeating and Reciting' },
    { id: '5A', topic: 'literacy', name: 'Learning to Read and Write' },
    { id: '4A', topic: 'literacy', name: 'Learning to Read and Write' },
    { id: '3A', topic: 'literacy', name: 'Learning to Read and Write' },
    { id: '2A', topic: 'literacy', name: 'Learning to Read and Write' },
    { id: 'A', topic: 'sentence_building', name: 'Sentence Building' },
    { id: 'B', topic: 'sentence_building', name: 'Sentence Building' },
    { id: 'C', topic: 'sentence_building', name: 'Sentence Building' },
    { id: 'D', topic: 'paragraph_building', name: 'Paragraph Building' },
    { id: 'E', topic: 'paragraph_building', name: 'Paragraph Building' },
    { id: 'F', topic: 'paragraph_building', name: 'Paragraph Building' },
    { id: 'G', topic: 'summarisation', name: 'Summarisation' },
    { id: 'H', topic: 'summarisation', name: 'Summarisation' },
    { id: 'I', topic: 'summarisation', name: 'Summarisation' },
    { id: 'J', topic: 'critique', name: 'Critique' },
    { id: 'K', topic: 'critique', name: 'Critique' },
    { id: 'L', topic: 'critique', name: 'Critique' },
  ];

  static math = new LevelRegistry(Levels.MATH);
  static portuguese = new LevelRegistry(Levels.PORTUGUESE);
  static english = new LevelRegistry(Levels.ENGLISH);
}
