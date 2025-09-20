// placeholder for future 100% workbook coverage mapping
// keep lean; map later by importing real catalog
export const workbookSeries = [
  { id: 'numbers_1_120', title: 'My Book of Numbers 1–120', grades: 'PreK–K' },
  { id: 'addition', title: 'Addition', grades: 'G1–G4' },
  { id: 'subtraction', title: 'Subtraction', grades: 'G1–G4' },
  { id: 'add_sub', title: 'Addition & Subtraction', grades: 'G2–G4' },
  { id: 'multiplication', title: 'Multiplication', grades: 'G3–G5' },
  { id: 'division', title: 'Division', grades: 'G3–G5' },
  { id: 'fractions', title: 'Fractions', grades: 'G4–G6' },
  { id: 'decimals_fractions', title: 'Decimals & Fractions', grades: 'G4–G6' },
  { id: 'geometry_measure', title: 'Geometry & Measurement', grades: 'G1–G6' },
  { id: 'word_problems', title: 'Word Problems', grades: 'G1–G6' },
  { id: 'pre_algebra', title: 'Pre-Algebra (Grades 6–8)', grades: 'G6–G8' },
  { id: 'algebra', title: 'Algebra (Grades 6–8)', grades: 'G6–G8' },
  { id: 'intro_geometry', title: 'Intro to Geometry (Grades 6–8)', grades: 'G6–G8' },
  { id: 'geometry', title: 'Geometry (Grades 6–8)', grades: 'G6–G8' },
  { id: 'hs_ready', title: 'Are You Ready for High School Math?', grades: 'G8+' }
];

// future many-to-many: level -> workbook(s)
export const levelToSeries = {
  // use keys as `${subject}-${level}` to avoid cross-discipline collisions
  'math-7A': ['numbers_1_120'],
  'math-6A': ['numbers_1_120'],
  'math-5A': ['numbers_1_120'],
  'math-4A': ['numbers_1_120', 'addition'],
  'math-3A': ['numbers_1_120', 'addition'],
  'math-2A': ['subtraction', 'add_sub'],
  'math-1A': ['add_sub', 'addition', 'subtraction'],
  'math-A': ['addition', 'add_sub'],
  'math-B': ['addition', 'subtraction', 'add_sub'],
  // Kumon-style prerequisites for C (Multiplication Facts)
  'math-C': ['numbers_1_120', 'addition', 'subtraction', 'add_sub', 'multiplication', 'division'],
  // Kumon-style prerequisites for D (Division Facts) + fractions readiness
  'math-D': ['multiplication', 'division', 'fractions'],
  // Kumon-style focus for E (Fractions +/−) and adjacent practice
  'math-E': ['fractions', 'decimals_fractions', 'word_problems', 'geometry_measure'],
  // Focus for F (Fractions ×/÷ and Decimals operations)
  'math-F': ['fractions', 'decimals_fractions', 'word_problems', 'geometry_measure'],
  'math-G': ['pre_algebra', 'word_problems'],
  'math-H': ['algebra', 'word_problems'],
  'math-I': ['algebra', 'intro_geometry'],
  'math-J': ['algebra', 'geometry'],
  'math-K': ['algebra', 'geometry'],
  'math-L': ['geometry', 'algebra'],
  'math-M': ['geometry', 'algebra'],
  'math-N': ['hs_ready', 'algebra'],
  'math-O': ['hs_ready', 'geometry'],
};




