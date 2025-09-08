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

export function generateAdditionWorkbook({ seed, level = 'A', pages = 1 }) {
  const rng = makeRng(seed);
  const policy = additionPolicies[level] || additionPolicies.A;
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const exercises = [];
    for (let i = 0; i < policy.items; i += 1) {
      const a = randInt(rng, policy.min, policy.max);
      const b = randInt(rng, policy.min, policy.max);
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

export function generateSubtractionWorkbook({ seed, level = 'A', pages = 1 }) {
  const rng = makeRng(seed);
  const policy = (basePolicies.subtraction[level]) || basePolicies.subtraction.A;
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const exercises = [];
    for (let i = 0; i < policy.items; i += 1) {
      let a = randInt(rng, policy.min, policy.max);
      let b = randInt(rng, policy.min, policy.max);
      if (policy.noNegative && b > a) [a, b] = [b, a];
      exercises.push({ type: 'subtraction', question: `${a} - ${b} =`, correctAnswer: a - b });
    }
    pagesArr.push({ pageNumber: p + 1, title: `Subtração Dinâmica - Página ${p + 1}`, description: 'Gerado automaticamente.', exercises });
  }
  const defaultsByLevel = { A: { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4.5 }, B: { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4 } };
  return { title: `Subtração Dinâmica (nível ${level})`, level, subject: 'math', pages: pagesArr, passCriteria: defaultsByLevel[level] || { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4.5 } };
}

export function generateMultiplicationWorkbook({ seed, level = 'A', pages = 1 }) {
  const rng = makeRng(seed);
  const policy = (basePolicies.multiplication[level]) || basePolicies.multiplication.A;
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const exercises = [];
    for (let i = 0; i < policy.items; i += 1) {
      const a = randInt(rng, policy.min, policy.max);
      const b = randInt(rng, 2, policy.max);
      exercises.push({ type: 'multiplication', question: `${a} x ${b} =`, correctAnswer: a * b });
    }
    pagesArr.push({ pageNumber: p + 1, title: `Multiplicação Dinâmica - Página ${p + 1}`, description: 'Gerado automaticamente.', exercises });
  }
  const defaultsByLevel = { A: { minAccuracyPercent: 92, maxAvgSecondsPerExercise: 4 }, B: { minAccuracyPercent: 94, maxAvgSecondsPerExercise: 3.5 } };
  return { title: `Multiplicação Dinâmica (nível ${level})`, level, subject: 'math', pages: pagesArr, passCriteria: defaultsByLevel[level] || { minAccuracyPercent: 92, maxAvgSecondsPerExercise: 4 } };
}

export function generateDivisionWorkbook({ seed, level = 'A', pages = 1 }) {
  const rng = makeRng(seed);
  const policy = (basePolicies.division[level]) || basePolicies.division.A;
  const pagesArr = [];
  for (let p = 0; p < pages; p += 1) {
    const exercises = [];
    for (let i = 0; i < policy.items; i += 1) {
      const divisor = randInt(rng, policy.min, policy.max);
      const quotient = randInt(rng, 2, policy.max);
      const dividend = divisor * quotient; // force integer result
      exercises.push({ type: 'division', question: `${dividend} ÷ ${divisor} =`, correctAnswer: quotient });
    }
    pagesArr.push({ pageNumber: p + 1, title: `Divisão Dinâmica - Página ${p + 1}`, description: 'Gerado automaticamente.', exercises });
  }
  const defaultsByLevel = { A: { minAccuracyPercent: 92, maxAvgSecondsPerExercise: 4 }, B: { minAccuracyPercent: 94, maxAvgSecondsPerExercise: 3.5 } };
  return { title: `Divisão Dinâmica (nível ${level})`, level, subject: 'math', pages: pagesArr, passCriteria: defaultsByLevel[level] || { minAccuracyPercent: 92, maxAvgSecondsPerExercise: 4 } };
}


