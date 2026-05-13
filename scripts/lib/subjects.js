// Shared subject list for evaluator/fixer scripts. The frontend uses
// src/domain/disciplines.js's Discipline.ALL, but Node scripts can't import
// from src (Vue/Vite-aware paths). Keep this list in sync with that source
// — any new subject must be added in both places.
//
// Order mirrors `Discipline.ALL`: math, portuguese, english, japanese,
// spanish, biology.

export const SUBJECTS = Object.freeze(['math', 'portuguese', 'english', 'japanese', 'spanish', 'biology']);
