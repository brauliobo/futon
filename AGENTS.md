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
pnpm dev          # dev server on :5173
pnpm build        # build to docs/
pnpm test         # run E2E specs
```
