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
    { id: 'sentences', name: 'Sentences', icon: '💬', levels: ['A'], prereqs: [] },
  ];

  static forSubject(subject) { return this[subject.toUpperCase()] || []; }

  static isUnlocked(node, tree, setsByLevel) {
    if (!node.prereqs.length) return true;
    return node.prereqs.every(prereqId => {
      const prereq = tree.find(n => n.id === prereqId);
      if (!prereq) return true;
      return prereq.levels.some(lvl => (setsByLevel[lvl] || []).some(s => s.status === 'mastery'));
    });
  }

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
