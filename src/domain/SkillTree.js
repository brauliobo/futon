export class SkillTree {
  static MATH = [
    { id: 'counting_early', name: 'Counting', icon: '🔢', levels: ['7A','6A','5A','4A'], prereqs: [] },
    { id: 'addition', name: 'Addition', icon: '➕', levels: ['3A'], prereqs: ['counting_early'] },
    { id: 'subtraction', name: 'Subtraction', icon: '➖', levels: ['2A'], prereqs: ['counting_early'] },
    { id: 'add_sub', name: 'Add & Subtract', icon: '🔄', levels: ['1A','A','B'], prereqs: ['addition','subtraction'] },
    { id: 'multiplication', name: 'Multiplication', icon: '✖️', levels: ['C'], prereqs: ['add_sub'] },
    { id: 'division', name: 'Division', icon: '➗', levels: ['D'], prereqs: ['add_sub'] },
    { id: 'fractions_basic', name: 'Fractions +/−', icon: '🍕', levels: ['E'], prereqs: ['multiplication','division'] },
    { id: 'fractions_adv', name: 'Fractions ×/÷', icon: '📐', levels: ['F'], prereqs: ['multiplication','division'] },
    { id: 'integers', name: 'Integers', icon: '🔢', levels: ['G'], prereqs: ['fractions_basic','fractions_adv'] },
    { id: 'linear', name: 'Linear Equations', icon: '📏', levels: ['H'], prereqs: ['integers'] },
    { id: 'quadratics', name: 'Quadratics', icon: '📈', levels: ['I'], prereqs: ['linear'] },
    { id: 'algebra_adv', name: 'Advanced Algebra', icon: '🧮', levels: ['J'], prereqs: ['quadratics'] },
    { id: 'functions', name: 'Functions', icon: '📊', levels: ['K'], prereqs: ['algebra_adv'] },
    { id: 'trig', name: 'Trigonometry', icon: '📐', levels: ['L'], prereqs: ['algebra_adv'] },
    { id: 'trig_adv', name: 'Adv Trigonometry', icon: '🌀', levels: ['M'], prereqs: ['trig'] },
    { id: 'diff_calc', name: 'Differential Calc', icon: '∫', levels: ['N'], prereqs: ['functions','trig_adv'] },
    { id: 'int_calc', name: 'Integral Calc', icon: '∮', levels: ['O'], prereqs: ['functions','trig_adv'] },
    { id: 'probability', name: 'Probability & Stats', icon: '🎲', levels: ['P'], prereqs: ['int_calc'] },
    { id: 'geometry_linear', name: 'Geometry & LinAlg', icon: '📐', levels: ['Q'], prereqs: ['int_calc'] },
  ];

  static PORTUGUESE = [
    { id: 'pre_reading', name: 'Repetição', icon: '🗣', levels: ['7A','6A'], prereqs: [] },
    { id: 'literacy', name: 'Ler e Escrever', icon: '✏️', levels: ['5A','4A','3A','2A'], prereqs: ['pre_reading'] },
    { id: 'letters', name: 'Letras e Palavras', icon: '🔤', levels: ['1A'], prereqs: ['literacy'] },
    { id: 'sentences', name: 'Frases', icon: '💬', levels: ['A','B','C'], prereqs: ['letters'] },
    { id: 'paragraphs', name: 'Parágrafos', icon: '📝', levels: ['D','E','F'], prereqs: ['sentences'] },
    { id: 'summary', name: 'Resumo', icon: '📋', levels: ['G','H','I'], prereqs: ['paragraphs'] },
    { id: 'critique', name: 'Crítica', icon: '🎯', levels: ['J','K','L'], prereqs: ['paragraphs'] },
  ];

  static ENGLISH = [
    { id: 'pre_listening', name: 'Pre-listening', icon: '👂', levels: ['7A','6A','5A'], prereqs: [] },
    { id: 'first_words', name: 'First Words', icon: '🗣', levels: ['4A','3A'], prereqs: ['pre_listening'] },
    { id: 'simple_phrases', name: 'Simple Phrases', icon: '💬', levels: ['2A','1A'], prereqs: ['first_words'] },
    { id: 'vocabulary', name: 'Vocabulary', icon: '📖', levels: ['A'], prereqs: ['simple_phrases'] },
    { id: 'sentences', name: 'Sentences', icon: '💬', levels: ['B'], prereqs: ['vocabulary'] },
    { id: 'past_tense', name: 'Past Tense', icon: '⏪', levels: ['C'], prereqs: ['sentences'] },
    { id: 'future_compare', name: 'Future & Compare', icon: '⏩', levels: ['D'], prereqs: ['past_tense'] },
    { id: 'present_continuous', name: 'Present Continuous', icon: '🔄', levels: ['E'], prereqs: ['future_compare'] },
    { id: 'articles_pronouns', name: 'Articles & Pronouns', icon: '📝', levels: ['F'], prereqs: ['future_compare'] },
    { id: 'perfect_tenses', name: 'Perfect Tenses', icon: '🔁', levels: ['G'], prereqs: ['present_continuous', 'articles_pronouns'] },
    { id: 'modals', name: 'Modal Verbs', icon: '🎛️', levels: ['H'], prereqs: ['perfect_tenses'] },
    { id: 'conditionals', name: 'Conditionals', icon: '🔀', levels: ['I'], prereqs: ['modals'] },
    { id: 'passive', name: 'Passive Voice', icon: '🔃', levels: ['J'], prereqs: ['conditionals'] },
    { id: 'reported_speech', name: 'Reported Speech', icon: '💭', levels: ['K'], prereqs: ['passive'] },
    { id: 'phrasal_reading', name: 'Phrasal Verbs', icon: '📚', levels: ['L'], prereqs: ['reported_speech'] },
  ];

  static JAPANESE = [
    { id: 'hiragana', name: 'Hiragana', icon: 'あ', levels: ['4A','3A'], prereqs: [] },
    { id: 'katakana', name: 'Katakana', icon: 'ア', levels: ['2A'], prereqs: ['hiragana'] },
    { id: 'kana_review', name: 'Kana Review', icon: 'き', levels: ['1A'], prereqs: ['katakana'] },
    { id: 'kanji_basic', name: 'First Kanji', icon: '漢', levels: ['A'], prereqs: ['kana_review'] },
    { id: 'particles_verbs', name: 'Particles & Verbs', icon: '〜', levels: ['B'], prereqs: ['kanji_basic'] },
    { id: 'adjectives_past', name: 'Adjectives & Past', icon: '⏪', levels: ['C'], prereqs: ['particles_verbs'] },
    { id: 'connectors', name: 'Connectors & Reasons', icon: '🔗', levels: ['D'], prereqs: ['adjectives_past'] },
    { id: 'plain_form', name: 'Plain Form & Quotes', icon: '📜', levels: ['E'], prereqs: ['connectors'] },
    { id: 'modifiers', name: 'Modifiers & Conditions', icon: '🔀', levels: ['F'], prereqs: ['plain_form'] },
    { id: 'discourse', name: 'Discourse & Function', icon: '💬', levels: ['G'], prereqs: ['modifiers'] },
    { id: 'advanced_grammar', name: 'Advanced Grammar', icon: '🎓', levels: ['H'], prereqs: ['discourse'] },
    { id: 'jlpt_n3', name: 'JLPT N3', icon: '📘', levels: ['I'], prereqs: ['advanced_grammar'] },
    { id: 'jlpt_n2', name: 'JLPT N2', icon: '📗', levels: ['J'], prereqs: ['jlpt_n3'] },
    { id: 'jlpt_n1', name: 'JLPT N1', icon: '📕', levels: ['K'], prereqs: ['jlpt_n2'] },
    { id: 'native_polish', name: 'Native Polish', icon: '🌸', levels: ['L'], prereqs: ['jlpt_n1'] },
  ];

  static SPANISH = [
    { id: 'es_pre_reading', name: 'Pre-lectura', icon: '🗣', levels: ['7A','6A','5A','4A','3A','2A'], prereqs: [] },
    { id: 'es_letters', name: 'Verbos y Letras', icon: '✏️', levels: ['1A'], prereqs: ['es_pre_reading'] },
    { id: 'es_reading', name: 'Lectura', icon: '📖', levels: ['A'], prereqs: ['es_letters'] },
    { id: 'es_sentences', name: 'Oraciones', icon: '💬', levels: ['B','C'], prereqs: ['es_reading'] },
    { id: 'es_paragraphs', name: 'Párrafos y Gramática', icon: '📝', levels: ['D','E','F','G'], prereqs: ['es_sentences'] },
    { id: 'es_linguistics', name: 'Lingüística', icon: '🎓', levels: ['H','I','J'], prereqs: ['es_paragraphs'] },
    { id: 'es_writing', name: 'Redacción', icon: '🖊️', levels: ['K','L'], prereqs: ['es_linguistics'] },
  ];

  static BIOLOGY = [
    { id: 'bio_life', name: 'Life & Cells', icon: '🧬', levels: ['7A'], prereqs: [] },
    { id: 'bio_systems', name: 'Body Systems', icon: '🫀', levels: ['6A','5A','4A','3A','2A','1A','A','B','C','D','E','F','G','H','I','J','K','L'], prereqs: ['bio_life'] },
  ];

  static forSubject(subject) { return this[subject.toUpperCase()] || []; }

  static nodeProgress(node, setsByLevel) {
    if (!node.levels?.length) return { total: 0, mastered: 0, percent: 0 };
    let total = 0, mastered = 0;
    node.levels.forEach(lvl => {
      const sets = setsByLevel[lvl] || [];
      total += sets.length;
      mastered += sets.filter(s => s.status === 'mastery').length;
    });
    return { total, mastered, percent: total ? Math.round((mastered / total) * 100) : 0 };
  }

  static isComplete(node, setsByLevel) {
    return node.levels.every(lvl => {
      const sets = setsByLevel[lvl] || [];
      return sets.length > 0 && sets.every(s => s.status === 'mastery');
    });
  }

  // Compute depth (distance from root) for layout; cycle-safe via visiting set
  static depth(node, tree, memo = {}, visiting = new Set()) {
    if (memo[node.id] !== undefined) return memo[node.id];
    if (visiting.has(node.id)) return 0; // cycle detected — treat as root
    if (!node.prereqs.length) { memo[node.id] = 0; return 0; }
    visiting.add(node.id);
    const d = 1 + Math.max(...node.prereqs.map(pid => {
      const p = tree.find(n => n.id === pid);
      return p ? this.depth(p, tree, memo, visiting) : 0;
    }));
    visiting.delete(node.id);
    memo[node.id] = d;
    return d;
  }

  // Group nodes by depth for row-based layout
  static rows(tree) {
    const memo = {};
    const grouped = {};
    tree.forEach(node => {
      const d = this.depth(node, tree, memo);
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(node);
    });
    return Object.keys(grouped).sort((a, b) => a - b).map(d => grouped[d]);
  }
}
