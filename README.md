# Futon

A simple learning app for Math, Portuguese, and English.

## Disciplines
- **math**: canonical levels 7A–O
- **portuguese**: canonical levels 7A–L (pré‑leitura → crítica)
- **english**: canonical levels 7A–L (pre‑reading → critique)

## Math levels (canonical)
- 7A, 6A, 5A, 4A, 3A, 2A, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O

Source of truth: `src/domain/levels.js` (`mathLevels`, `getMathLevelOrder`, `portugueseLevels`, `englishLevels`).

## Current status
- **Implemented subjects**
  - math: addition (A), subtraction (B), multiplication (C), division (D), fractions (C/D)
  - portuguese: reading (A), grammar (A)
  - english: basic vocabulary (A), phrases (A)
- **Placeholders**
  - App renders all math levels 7A–O. Missing levels are shown as "Coming soon" with a disabled Start button, but have JSON structure created at runtime so UX is consistent.

## Where things live
- `src/domain/levels.js`: canonical math levels and UX groups
- `src/domain/disciplines.js`: subjects and topic sequences
- `src/domain/workbooks.js`: scaffold for future workbook catalog + mappings
- `src/utils/generatorMath.js`: dynamic math workbook generators
- `src/utils/placeholders.js`: placeholder generator for unimplemented math levels
- `src/components/Home.vue`: lists all workbooks; shows Coming soon; groups by subject/topic
- `src/App.vue`: aggregates all workbooks (static + dynamic + placeholders)

## Roadmap
- Fill math coverage for remaining levels 7A–O
- Map workbook series to levels for 100% coverage
- Extend Portuguese and English tracks with more topics

## Exercise targets (math)
- 7A: 40 exercises per workbook (2 pages × 10, repeatAll=2)
- 6A–5A–4A: 60–80 each (counting; TBD with visuals)
- A–D (basic ops): ~150 each (15 pages × 10)
- E (fractions add/sub): ~200 currently; can reduce by setting repeatAll
- Fractions mixed (improper→mixed): ~100 currently; can reduce via repeatAll

Implementation: each level JSON (math, Portuguese, English) includes a numeric `target` equal to the number of exercises after expanding `repeat` and `repeatAll`. Targets are auto-generated via:

```bash
pnpm run targets:refresh
```

This computes targets, writes them into level files, and validates against the JSON Schema. Adjust totals by tuning `repeat` and `repeatAll` in the level JSONs.

Current non-math targets (auto-calculated from content):
- Portuguese reading (A): 20 (with repeatAll=2)
- Portuguese grammar (A): 20 (with repeatAll=2)
- English basics (A): 12 (with repeatAll=2)
- English phrases (A): 3 each
