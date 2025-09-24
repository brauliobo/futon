// Simple deterministic RNG (xorshift32 seeded by string)
function hashStringTo32Bit(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seedStr) {
  let x = hashStringTo32Bit(String(seedStr)) || 123456789;
  return function rng() {
    // xorshift32
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    // to [0,1)
    return (x >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Deterministic selector: no RNG state, stable across runs for same key
const sel = (key, min, max) => {
  const lo = Math.min(min, max); const hi = Math.max(min, max);
  const span = hi - lo + 1; if (span <= 0) return lo;
  return lo + (hashStringTo32Bit(String(key)) % span);
};

const additionPolicies = {
  A: { min: 0, max: 10, items: 10 },
  B: { min: 0, max: 20, items: 10 },
  C: { min: 10, max: 100, items: 10 },
  D: { min: 20, max: 200, items: 10 },
};

const basePolicies = {
  subtraction: {
    A: { min: 0, max: 10, items: 10, noNegative: true },
    B: { min: 0, max: 20, items: 10, noNegative: true },
    C: { min: 10, max: 100, items: 10, noNegative: true },
    D: { min: 20, max: 200, items: 10, noNegative: false },
  },
  multiplication: {
    A: { min: 2, max: 5, items: 10 },
    B: { min: 2, max: 10, items: 10 },
    C: { min: 2, max: 12, items: 10 },
    D: { min: 2, max: 15, items: 10 },
  },
  division: {
    A: { min: 2, max: 5, items: 10 },
    B: { min: 2, max: 10, items: 10 },
    C: { min: 2, max: 12, items: 10 },
    D: { min: 2, max: 15, items: 10 },
  }
};

export function generateAdditionSet({ seed, level = 'A', pages = 1 }) {
  const policy = additionPolicies[level] || additionPolicies.A;
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const exercises = [];
    for (let i = 0; i < policy.items; i += 1) {
      const a = sel(`${seed}|add|${level}|${p}|${i}|a`, policy.min, policy.max);
      const b = sel(`${seed}|add|${level}|${p}|${i}|b`, policy.min, policy.max);
      exercises.push({
        type: 'addition',
        question: `${a} + ${b} =`,
        correctAnswer: a + b,
      });
    }
    pagesArr.push({ pageNumber: p + 1, title: `Adição Dinâmica - Página ${p + 1}`, description: 'Gerado automaticamente a partir de uma seed.', exercises });
  }
  const defaultsByLevel = { A: { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4.5 }, B: { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4 } };
  return { title: `Adição Dinâmica (nível ${level})`, level, subject: 'math', pages: pagesArr, passCriteria: defaultsByLevel[level] || { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4.5 } };
}

export function generateSubtractionSet({ seed, level = 'A', pages = 1 }) {
  const policy = (basePolicies.subtraction[level]) || basePolicies.subtraction.A;
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const exercises = [];
    for (let i = 0; i < policy.items; i += 1) {
      let a = sel(`${seed}|sub|${level}|${p}|${i}|a`, policy.min, policy.max);
      let b = sel(`${seed}|sub|${level}|${p}|${i}|b`, policy.min, policy.max);
      if (policy.noNegative && b > a) [a, b] = [b, a];
      exercises.push({ type: 'subtraction', question: `${a} - ${b} =`, correctAnswer: a - b });
    }
    pagesArr.push({ pageNumber: p + 1, title: `Subtração Dinâmica - Página ${p + 1}`, description: 'Gerado automaticamente.', exercises });
  }
  const defaultsByLevel = { A: { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4.5 }, B: { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4 } };
  return { title: `Subtração Dinâmica (nível ${level})`, level, subject: 'math', pages: pagesArr, passCriteria: defaultsByLevel[level] || { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4.5 } };
}

export function generateMultiplicationSet({ seed, level = 'A', pages = 1 }) {
  const policy = (basePolicies.multiplication[level]) || basePolicies.multiplication.A;
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const exercises = [];
    for (let i = 0; i < policy.items; i += 1) {
      const a = sel(`${seed}|mul|${level}|${p}|${i}|a`, policy.min, policy.max);
      const b = sel(`${seed}|mul|${level}|${p}|${i}|b`, 2, policy.max);
      exercises.push({ type: 'multiplication', question: `${a} x ${b} =`, correctAnswer: a * b });
    }
    pagesArr.push({ pageNumber: p + 1, title: `Multiplicação Dinâmica - Página ${p + 1}`, description: 'Gerado automaticamente.', exercises });
  }
  const defaultsByLevel = { A: { minAccuracyPercent: 92, maxAvgSecondsPerExercise: 4 }, B: { minAccuracyPercent: 94, maxAvgSecondsPerExercise: 3.5 } };
  return { title: `Multiplicação Dinâmica (nível ${level})`, level, subject: 'math', pages: pagesArr, passCriteria: defaultsByLevel[level] || { minAccuracyPercent: 92, maxAvgSecondsPerExercise: 4 } };
}

export function generateDivisionSet({ seed, level = 'A', pages = 1 }) {
  const policy = (basePolicies.division[level]) || basePolicies.division.A;
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const exercises = [];
    for (let i = 0; i < policy.items; i += 1) {
      const divisor = sel(`${seed}|div|${level}|${p}|${i}|d`, policy.min, policy.max);
      const quotient = sel(`${seed}|div|${level}|${p}|${i}|q`, 2, policy.max);
      const dividend = divisor * quotient; // force integer result
      exercises.push({ type: 'division', question: `${dividend} ÷ ${divisor} =`, correctAnswer: quotient });
    }
    pagesArr.push({ pageNumber: p + 1, title: `Divisão Dinâmica - Página ${p + 1}`, description: 'Gerado automaticamente.', exercises });
  }
  const defaultsByLevel = { A: { minAccuracyPercent: 92, maxAvgSecondsPerExercise: 4 }, B: { minAccuracyPercent: 94, maxAvgSecondsPerExercise: 3.5 } };
  return { title: `Divisão Dinâmica (nível ${level})`, level, subject: 'math', pages: pagesArr, passCriteria: defaultsByLevel[level] || { minAccuracyPercent: 92, maxAvgSecondsPerExercise: 4 } };
}

// Early learner generators for 7A (deterministic, 10 pages × 10 exercises)
export function generateCountSet({ seed, level = '7A', pages = 10, sequence = 0 }) {
  const symbols = ['★','●','▲','◆','♥','☀','♣'];
  const makeRow = (n, sym) => Array.from({ length: n }, () => sym).join(' ');
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const isLow = (p % 2) === 0; const title = isLow ? 'Contar até 5' : 'Contar 6–10';
    const range = isLow ? [1,5] : [6,10];
    const exercises = [];
    for (let i = 0; i < 10; i += 1) {
      const n = sel(`${seed}|cnt|${p}|${i}|n`, range[0], range[1]);
      const sym = symbols[sel(`${seed}|cnt|${p}|${i}|s`, 0, symbols.length - 1)];
      exercises.push({ type: 'count', question: makeRow(n, sym), correctAnswer: n });
    }
    pagesArr.push({ pageNumber: p + 1, title, description: 'Conte os símbolos.', exercises });
  }
  return { title: `Contar Objetos 1–10 #${sequence + 1}` , level, subject: 'math', pages: pagesArr, passCriteria: { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 5 } };
}

export function generateNextPrevSet({ seed, level = '7A', pages = 10, sequence = 0 }) {
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const isNext = (p % 2) === 0; const type = isNext ? 'next_number' : 'previous_number';
    const title = isNext ? 'Próximo número' : 'Número anterior';
    const description = isNext ? 'Escreva o próximo número.' : 'Escreva o número anterior.';
    const exercises = [];
    for (let i = 0; i < 10; i += 1) {
      const base = sel(`${seed}|np|${p}|${i}|b`, 0, 10);
      const question = isNext ? `Depois de ${base} vem:` : `Antes de ${base} vem:`;
      const correctAnswer = isNext ? Math.min(10, base + 1) : Math.max(0, base - 1);
      exercises.push({ type, question, correctAnswer });
    }
    pagesArr.push({ pageNumber: p + 1, title, description, exercises });
  }
  return { title: `Número Anterior e Próximo #${sequence + 1}` , level, subject: 'math', pages: pagesArr, passCriteria: { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 5 } };
}
