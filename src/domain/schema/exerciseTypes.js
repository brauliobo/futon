// Classification of exercise `type` strings into authoring families.
// Legacy content uses ~60 free-form types. The canonical families below
// determine which fields are required/allowed on each exercise.

export const FAMILIES = {
  // Short numeric or string answer, rendered with text input.
  drill: [
    'addition', 'subtraction', 'multiplication', 'division',
    'fraction', 'fraction_add', 'fraction_sub', 'fraction_subtract',
    'fraction_multiply', 'fraction_divide',
    'decimal', 'decimal_add', 'decimal_subtract', 'decimal_multiply', 'decimal_divide',
    'integer', 'integer_add', 'integer_subtract', 'integer_multiply', 'integer_divide',
    'absolute_value', 'algebra', 'algebraic_expression', 'equation', 'linear_equation',
    'inequality', 'polynomial', 'quadratic', 'radical', 'exponent', 'factoring',
    'system_equation', 'slope_intercept', 'graph_point', 'proportion',
    'trigonometry', 'calculus', 'geometry',
    'count', 'next_number', 'previous_number', 'nextprev', 'missing_number',
    'sequence', 'skip_counting', 'decomposition', 'place_value', 'number_sense',
    'comparison', 'even_odd', 'mental_math', 'measure', 'money', 'word_problem',
    'arithmetic',
  ],
  // Multiple-choice (sugar: "(a/b/c)" suffix in question).
  choice: ['choice'],
  // Translation / vocabulary.
  translation: ['english_vocab', 'english_phrases', 'translation'],
  // Passage-based comprehension.
  reading: ['reading', 'reading_comprehension'],
  // Literacy & grammar short-answer.
  language: ['literacy', 'grammar', 'paragraph', 'sentence_building'],
  // New structured types introduced by Phase 0.
  fill_blank: ['fill_blank'],
  cloze: ['cloze'],
  matching: ['matching'],
  ordering: ['ordering'],
  conjugation: ['conjugation'],
  transformation: ['transformation'],
};

const TYPE_TO_FAMILY = Object.fromEntries(
  Object.entries(FAMILIES).flatMap(([family, types]) => types.map(t => [t, family]))
);

export const ALL_TYPES = Object.keys(TYPE_TO_FAMILY);

export function familyOf(type) {
  return TYPE_TO_FAMILY[type] || null;
}

// JSON Schema fragment per family. Each describes the exercise shape.
// Shared base: type, question, correctAnswer.
const base = {
  type: 'object',
  required: ['type', 'question', 'correctAnswer'],
  properties: {
    type: { type: 'string' },
    question: { type: 'string', minLength: 1 },
    correctAnswer: {}, // string | number | array | object depending on family
    difficulty: { type: 'integer', minimum: 1, maximum: 5 },
    rationale: { type: 'string' },
    objectives: { type: 'array', items: { type: 'string' } },
  },
};

export const EXERCISE_SCHEMAS = {
  drill: { ...base },
  choice: {
    ...base,
    required: [...base.required, 'choices'],
    properties: {
      ...base.properties,
      choices: { type: 'array', minItems: 2, items: { type: 'string' } },
    },
  },
  translation: { ...base },
  reading: { ...base },
  language: { ...base },
  fill_blank: {
    ...base,
    properties: {
      ...base.properties,
      acceptAlternatives: { type: 'array', items: { type: 'string' } },
    },
  },
  cloze: {
    type: 'object',
    required: ['type', 'passage', 'blanks'],
    properties: {
      type: { const: 'cloze' },
      passage: { type: 'string', minLength: 1 },
      blanks: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['index', 'answer'],
          properties: {
            index: { type: 'integer', minimum: 0 },
            answer: { type: 'string' },
            alternatives: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      difficulty: { type: 'integer', minimum: 1, maximum: 5 },
      rationale: { type: 'string' },
      objectives: { type: 'array', items: { type: 'string' } },
    },
  },
  matching: {
    type: 'object',
    required: ['type', 'pairs'],
    properties: {
      type: { const: 'matching' },
      pairs: {
        type: 'array',
        minItems: 2,
        items: {
          type: 'object',
          required: ['left', 'right'],
          properties: { left: { type: 'string' }, right: { type: 'string' } },
        },
      },
      distractors: { type: 'array', items: { type: 'string' } },
      difficulty: { type: 'integer', minimum: 1, maximum: 5 },
      rationale: { type: 'string' },
      objectives: { type: 'array', items: { type: 'string' } },
    },
  },
  ordering: {
    type: 'object',
    required: ['type', 'items', 'correctOrder'],
    properties: {
      type: { const: 'ordering' },
      prompt: { type: 'string' },
      items: { type: 'array', minItems: 2, items: { type: 'string' } },
      correctOrder: { type: 'array', items: { type: 'integer', minimum: 0 } },
      difficulty: { type: 'integer', minimum: 1, maximum: 5 },
      rationale: { type: 'string' },
      objectives: { type: 'array', items: { type: 'string' } },
    },
  },
  conjugation: {
    ...base,
    required: [...base.required, 'verb', 'tense', 'person'],
    properties: {
      ...base.properties,
      verb: { type: 'string' },
      tense: { type: 'string' },
      person: { type: 'string' },
    },
  },
  transformation: {
    ...base,
    required: [...base.required, 'source'],
    properties: { ...base.properties, source: { type: 'string' } },
  },
};
