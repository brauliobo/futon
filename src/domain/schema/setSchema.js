import Ajv from 'ajv';
import { EXERCISE_SCHEMAS, familyOf } from './exerciseTypes.js';

const pageSchema = {
  type: 'object',
  required: ['exercises'],
  properties: {
    pageNumber: { type: 'integer', minimum: 1 },
    title: { type: 'string' },
    description: { type: 'string' },
    passage: { type: 'string' },
    repeat: { type: 'integer', minimum: 1 },
    exercises: {
      type: 'array',
      minItems: 1,
      items: { type: 'object', required: ['type'], properties: { type: { type: 'string' } } },
    },
  },
};

export const setSchema = {
  type: 'object',
  required: ['title', 'level', 'subject', 'pages'],
  properties: {
    title: { type: 'string', minLength: 1 },
    level: { type: 'string', minLength: 1 },
    subject: { type: 'string', enum: ['math', 'portuguese', 'english'] },
    example: { type: 'string' },
    inputType: { type: 'string' },
    repeatAll: { type: 'integer', minimum: 1 },
    target: { type: 'integer', minimum: 1 },
    comingSoon: { type: 'boolean' },
    difficulty: { type: 'integer', minimum: 1, maximum: 5 },
    objectives: { type: 'array', items: { type: 'string' } },
    authorNotes: { type: 'string' },
    passCriteria: {
      type: 'object',
      properties: {
        minAccuracyPercent: { type: 'number' },
        maxAvgSecondsPerExercise: { type: 'number' },
      },
    },
    pages: { type: 'array', minItems: 1, items: pageSchema },
  },
};

const ajv = new Ajv({ allErrors: true, strict: false });
const exerciseValidators = Object.fromEntries(
  Object.entries(EXERCISE_SCHEMAS).map(([family, schema]) => [family, ajv.compile(schema)])
);
const validateSet = ajv.compile(setSchema);

export function validate(set) {
  const errors = [];
  if (!validateSet(set)) {
    for (const e of validateSet.errors) errors.push(`${e.instancePath || '/'} ${e.message}`);
    return { valid: false, errors };
  }
  set.pages.forEach((page, pi) => {
    page.exercises.forEach((ex, ei) => {
      const family = familyOf(ex.type);
      if (!family) {
        errors.push(`/pages/${pi}/exercises/${ei} unknown exercise type "${ex.type}"`);
        return;
      }
      const check = exerciseValidators[family];
      if (!check(ex)) {
        for (const e of check.errors) {
          errors.push(`/pages/${pi}/exercises/${ei}${e.instancePath} ${e.message}`);
        }
      }
    });
  });
  return { valid: errors.length === 0, errors };
}
