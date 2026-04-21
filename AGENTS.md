# Futon

Mastery-based learning app for kids (ages 5-12). Math, Portuguese, English.

> **Self-update rule:** After any session that changes architecture, patterns, file structure, or conventions — update this file to reflect the current state before finishing.

## Stack

Vue 3 (Options API) + Pug templates + Tailwind 3 + Vite + YAML exercises.

## Architecture

- `src/components/` — Vue SFCs, all use `<template lang="pug">`
- `src/services/` — Classes: `SetFactory`, `SetProcessor`, `SetStorage`, `ProfileStorage`, `GenericStorage`
- `src/utils/` — Static utility classes: `Formatter`, `Scoring`, `ExerciseLayout`, `PageStatus`, `Focus`, `Streak`, `SubjectBranding`, `SpeedGauge`, `DisciplineRegistry`
- `src/domain/` — Domain classes: `Discipline`, `Levels` (with `LevelRegistry` instances), `SkillTree`
- `src/discipline/` — `DisciplineManager`, `BaseDiscipline`, subject-specific subclasses
- `src/levels/{subject}/{level}/set_XX.yaml` — Exercise content

## Navigation modes

Two modes under each subject tab:
- **Campaign** (default): Strict sequential mastery-gated flow via `LevelRoadmap` + `LevelList`
- **Themes**: Skill tree (`SkillTreeView`) — topics branch from prerequisites. Node unlocks when prereq topics have at least one mastery. Same YAML sets, different organization.

## Code patterns

- **Class with static methods** for stateless utilities (Ruby Class-method style)
- **Class with instance methods** for stateful services (`SetStorage`, `SetFactory`)
- **File names match class names** (e.g., `Formatter.js` exports `Formatter`)
- **No standalone function exports** — everything is a class method
- Kid-friendly Tailwind theme: `kid-bg`, `kid-blue`, `kid-green`, `kid-gold`, `kid-red`, `kid-text`, `kid-muted`
- Font: Nunito. Rounded corners (`rounded-2xl`), animations defined in `index.css`

## Tests

Playwright E2E. `pnpm test` runs 36 specs in ~25s.

> **Always run specs in the background** (`run_in_background: true`) — they take ~50s and block the terminal. Poll the output file rather than waiting inline.
- `tests/helpers/` — `storage.js`, `navigation.js`, `exercises.js`, `app.js`
- `tests/e2e/` — 10 spec files covering all user flows
- Fast: most tests inject Vue state via `page.evaluate`, only golden-path tests do full completion via `window.__futonSet`

## Key commands

```bash
pnpm dev             # dev server on :5173
pnpm build           # build to docs/
pnpm test            # run E2E specs
pnpm eval:dashboard  # pedagogy health (global score + tier distribution)
pnpm test:eval       # regression tests for rubric scorers + categorize
pnpm eval:summary    # one-line status of all 29 evaluators
pnpm eval:all        # hard-fail gate (includes 3 zero-state tripwires)
```

## Pedagogy evaluation system

Full documentation in [PEDAGOGY.md](PEDAGOGY.md) at repo root. Key entry points:

- **Evaluators** (JSON-capable): `eval:dashboard`, `eval:pedagogy`, `eval:rationales`, `eval:disconnected`, `eval:bias`, `eval:time`, `eval:snapshot`.
- **Zero-state hard-fail gates** (block commit on regression): `eval:tautological`, `eval:pt-category`, `eval:example-spoiler`, `eval:pt-pluralization` — see PEDAGOGY.md "Quality status". Run all 4 with `pnpm eval:gates` (~7s).
- **Fixers** (dry-run by default, `--apply` to write): `fix:placeholders`, `fix:examples`, `fix:restatements`, `fix:example-spoiler`, `fix:japanese`, `fix:japanese:metadata`, `fix:japanese:objectives`.
- **Regression tests**: `test:eval` runs `scripts/test-rationale.js` + `scripts/test-eval.js` + `scripts/test-fixers.js` + `scripts/test-shuffle.js` + `scripts/test-zero-state-detectors.js` (47 detector unit tests).
- **Runtime**: `src/utils/Shuffle.js` seeds per-question choice order so authored YAML order can't bias answers.
- **Snapshot**: `PEDAGOGY_SNAPSHOT.json` tracks per-set + per-level scores for CI regression checks. `eval:snapshot --save` updates it.

The rubric is calibrated to recognize 6 Kumon design patterns (progressive, constant-drill, theme-answer, progressive-theme, binary-option, sparse-page) rather than reflexively penalizing deviations from a textbook linear progression.
