# Pedagogy Quality — Kumon-grade Rubric

This guide defines how we judge whether a Futon set is good *as a learning artifact*, and how to improve it.

> This doc lives at repo root, not `docs/` — Vite's build clears `docs/` on every `pnpm build`.

## Toolchain at a glance

| Command | Purpose |
|---|---|
| `pnpm test:eval` | 162 regression tests (categorize, rubric scorers, fixers, shuffle) — gates future edits |
| `pnpm hooks:install` | Installs a pre-commit hook that runs `test:eval` + `eval:snapshot` + `eval:topic` whenever pedagogy files are staged |
| `pnpm eval:dashboard` | One-screen health summary (global score, distribution, top weakest levels, snapshot delta) |
| `pnpm eval:pedagogy` | Per-set rubric scoring across 7 dimensions + level progression |
| `pnpm eval:rationales` | Per-exercise rationale categorization (method / generic / restatement / missing / short / long) |
| `pnpm eval:disconnected` | Flags placeholder-template + disconnected-singleton rationales |
| `pnpm eval:bias` | Answer-position bias audit (content-side, runtime shuffle also fixes this) |
| `pnpm eval:duplicates` | Cross-set question duplication scanner (within-level density) |
| `pnpm eval:review [level\|set]` | Generate markdown manual-review checklist for human reviewers |
| `pnpm eval:arithmetic` | Verify authored answers match computation for pure `N op N =` drills |
| `pnpm eval:alignment` | Flag math sets whose `example` omits an operator their exercises use |
| `pnpm fix:examples:ops [--apply]` | Auto-append a worked example for each missing operator |
| `pnpm eval:relevance` | Spot copy-paste rationale bugs: for pure `N op N` drills, rationale must reference an operand, the answer, or a decomposing digit |
| `pnpm eval:coverage [--min=N]` | List objectives with fewer than N exercises globally (default 10) — flags under-drilled learning targets |
| `pnpm eval:diversity [--threshold=X]` | Flag sets where the number of unique rationales is disproportionately small vs unique answers — surfaces hardcoded/copy-pasted rationales |
| `pnpm eval:answers` | Verify every multi-choice exercise's correctAnswer appears among its choices (catches authoring mismatches) |
| `pnpm eval:topic` | Verify bucketed rationales mentioning a specific domain marker (sec², Pitágoras, arcsen, etc.) co-occur only with exercises of that topic |
| `pnpm eval:snapshot [--save] [--threshold N]` | Save/diff a baseline for CI regression checks |
| `pnpm eval:all` | Validate + lint + audit + pedagogy + disconnected + arithmetic + alignment + relevance + answers + topic |
| `pnpm fix:binomial:rationales [--apply]` | Rewrite (x+a)(x+b) rationales in math/J to per-exercise Soma/produto form |
| `pnpm fix:5a:rationales [--apply]` | Rewrite generic-placeholder rationales in math/5A with question-shape-specific forms (iter 82) |
| `pnpm fix:6a:counting [--apply]` | Normalize counting rationales in math/6A/7A to count-specific form |
| `pnpm fix:integral:rationales [--apply]` | Fix sec²/sen/cos/e^(kx) rationales in math/O integrals |
| `pnpm fix:power:root [--apply]` | Per-exercise N^K and K-th root rationales in math/I |
| `pnpm fix:series:rationales [--apply]` | Dispatch p-series/geometric/Leibniz/De Moivre/Euler rationales in math/M |
| `pnpm fix:pass-criteria [--apply]` | Backfill missing passCriteria on non-math sets with level-appropriate defaults |
| `pnpm fix:placeholders [--apply]` | Deterministic rule-based rewriter for known-bad rationales (16 rule shapes) |
| `pnpm fix:examples [--apply]` | Appends `Ex.: Q → A.` to example fields lacking a worked pair |
| `pnpm fix:restatements [--apply]` | Rewrites "A resposta correta é X" into category-aware method form |
| `pnpm fix:japanese [--apply]` | Script-classifier rationale generator for Japanese inline-YAML sets |
| `pnpm fix:japanese:metadata [--apply]` | Adds Kumon-mapped `difficulty:` metadata to Japanese sets |

All fixers are dry-run by default; pass `--apply` to write. All evaluators support `--json` for CI consumption.

## Kumon principles Futon inherits

1. **Small steps.** Each exercise should be solvable from the pattern established by earlier exercises — *no explanation required*.
2. **Worked example first.** Every set has a tiny model in `example:` showing the method (`Vermelho → red`, `9+4 = 10+3 = 13`).
3. **Self-learning, not lecturing.** Rationales appear after a *wrong* answer. Rationales should teach a **method**, not restate the answer.
4. **Mastery before progress.** Same idea revisited in multiple contexts. Locked until mastery (≥95%).
5. **Progressive difficulty.** Within a set: flat or rising. Between sets: monotonic, step ≤ 1.
6. **Daily-doable volume.** 90–100 exercises = ~15 min of focused practice. Short questions (<250 chars).

## Scoring rubric (100 pts per set)

| # | Dimension | Pts | What earns full marks |
|---|-----------|-----|-----------------------|
| 1 | Example | 10 | `example:` present, ≥12 chars, contains a worked pair (`Ex.:` or `→` or `=`) |
| 2 | Gradient | 20 | First page avg ≤ max(2.4, `set.difficulty` - 0.5); page-to-page jump ≤ 1.0 (partial credit up to min(2.0, 1 + difficulty/4)); ends ≥ it starts |
| 3 | Rationale | 25 | ≥95% have rationale; ≥50% teach a method (verbs like *faça/primeiro/porque*); no restatements (`Resposta: X`), no one-liners (<10 ch), no walls (>300 ch) |
| 4 | Objectives | 5 | Every exercise has at least one `objectives:` tag |
| 5 | Answer distribution | 10 | No page where a single answer covers >60% of items |
| 6 | Distractors | 10 | Choice exercises: distractors unique, lengths within 6× of each other |
| 7 | Question length | 10 | Every question between 3 and 250 chars (cloze exempt) |
| 8 | Level progression | 10 | `set.difficulty` non-decreasing, step ≤ 1 across sets in the level |

**Thresholds:** ≥85% excellent · ≥70% acceptable · <70% needs rework.

## Running the evaluator

```bash
pnpm eval:pedagogy                                     # all subjects, all levels
pnpm eval:pedagogy --subject portuguese                # one subject
pnpm eval:pedagogy --level C --worst 20                # bottom 20 of a level
pnpm eval:pedagogy --set src/levels/math/B/set_08.yaml # single-file drill-down
pnpm eval:pedagogy --json > out.json                   # machine-readable
pnpm eval:all                                          # pedagogy + lint + audit + validate + disconnected
```

Exits 0 when global score ≥70%, else 1 (CI signal).

## Rationale drill-down

`pedagogy-eval.js` tells you *which sets* are weak. `rationale-review.js` tells you *which exercises* inside a set need rewriting, categorized by the same rubric:

```bash
pnpm eval:rationales src/levels/portuguese/A/set_01.yaml            # per-exercise table
pnpm eval:rationales --subject portuguese --level A                 # summary across a level
pnpm eval:rationales --subject math --level B --only restatement,missing,short
```

Categories: `method` (teaches how), `generic` (states fact, no method verb), `restatement` (repeats answer), `missing`, `short` (<10 chars), `long` (>300 chars).

**Review workflow**:
1. `pnpm eval:pedagogy --worst 20` → identifies worst sets.
2. `pnpm eval:rationales path/to/set.yaml` → lists every exercise's rationale status.
3. Rewrite flagged rationales in imperative + reason form (playbook below).
4. Re-run `pnpm eval:pedagogy --set path/to/set.yaml` to verify improvement.

## Placeholder-template scanner

`pnpm eval:disconnected` catches two distinct bugs:

- **Placeholder templates** — the same rationale appears ≥3× in one set and shares no content word with ≥80% of the questions it's attached to. Catches leftover generators like *"Responda conforme a pergunta"* or *"Analise os dados e aplique a operação pedida"*. Legitimate drill repetition (e.g. *"Somar 0 não muda o número"* across every `X + 0 =`) is excluded: the heuristic requires ≥3 word-bearing questions before evaluating, and accepts ≥20% overlap.
- **Disconnected singletons** — individual rationales with no content-word overlap with their own question (triage list, many false positives — review manually).

Exits 1 when any placeholder templates are found (CI hook). Use `--subject` / `--level` / `--min-overlap N` to scope.

## Automatic placeholder fixer

`pnpm fix:placeholders` is a **rule-based rewriter**: for every exercise whose rationale is a known placeholder AND whose question matches a known shape, it generates a specific method-teaching rationale derived from the question's own numbers. Deterministic; no LLM. Dry-run by default — add `--apply` to write.

Every rule verifies the computed value matches the exercise's `correctAnswer` before rewriting — if the answer disagrees, the fixer skips that row so wrong content is never masked by a confident-looking rationale.

For Japanese (inline-YAML style), use `pnpm fix:japanese`. It classifies question/answer by script (kanji / hiragana / katakana / romaji / digit / Portuguese text) and generates method rationales for each pair-direction:

| Direction | Rationale shape |
|---|---|
| kanji → digit | *"O kanji 一 representa o número 1."* |
| digit → kanji | *"1 em kanji escreve-se 一. Memorize o traço único."* |
| kanji → kana (reading) | *"一 lê-se いち. Pratique associar o traço ao som."* |
| kanji → Portuguese (meaning) | *"O kanji 犬 significa \"cachorro\". Observe o desenho como pista visual."* |
| hiragana ↔ katakana | *"あ (hiragana) corresponde a ア em katakana — mesmo som, escrita diferente."* |
| kana → romaji | *"あ lê-se \"a\" (romaji)."* |
| romaji → kana | *"O som \"a\" em hiragana escreve-se あ."* |
| Portuguese → kanji/kana | *"\"cachorro\" em japonês escreve-se 犬."* |

Supported shapes today:

| Exercise type | Question pattern | Generated rationale |
|---|---|---|
| `nextprev` | `Anterior de N` | `Anterior = conte 1 para trás: N → N-1.` |
| `nextprev` | `Próximo de N` | `Próximo = conte 1 para frente: N → N+1.` |
| `sequence` | `X, __, Z` | `Entre X e Z: conte +1 a partir de X → X+1.` |
| `sequence` | `__, Y, Z` | `Antes de Y: conte -1 → Y-1.` |
| `sequence` | `X, Y, __` | `Depois de Y: conte +1 → Y+1.` |
| `count` | `N <noun>` | `Conte um a um: o total é N.` |
| `place_value` | `Quantas unidades tem o número N?` | `Unidade = último algarismo. N → K unidades.` |
| `place_value` | `Quantas dezenas tem o número N?` | `Dezena = algarismo antes da unidade. N → T dezena(s).` |
| `even_odd` | `O número N é:` (par/ímpar) | `N é par: termina em 0, 2, 4, 6 ou 8.` / `N é ímpar: ...` |
| `word_problem` | `X tem N ◆. Y deu mais M ◆. Quantas?` | `Ele tinha N e ganhou M: some N + M = N+M.` |
| `word_problem` | `X tinha N ◆. Perdeu M ◆. Quantas?` | `Começou com N e perdeu M: subtraia N - M = N-M.` |
| `skip_counting` | `X, Y, Z, ?` (AP) | `Contagem de +d em +d: Z + d = Z+d.` |
| `trigonometry` | `arcsen(V) = ?`, `arccos(V) = ?`, `arctan(V) = ?` | `arccos(√2/2) = 45° porque cos(45°) = √2/2.` (lookup of standard values) |
| `trigonometry` | `1/sen(θ°) = ?`, `1/cos(θ°) = ?` | `1/sen(30°) = 2 (cossecante): calcule sen(30°) e inverta.` |

Known placeholder strings (each matched literally):
`Analise os dados e aplique a operação pedida.` · `Leia com atenção e escolha a operação adequada.` · `Responda conforme a pergunta.` · `Verifique contando de novo.` · `Organize os dados antes de operar.` · `Aplique razões trigonométricas e o ciclo.` · `Radical: √(a·b) = √a·√b; racionalize quando preciso.` · `Opere a fração conforme a regra correspondente.`

When a new placeholder/question pattern emerges, add another rule to `generateRationale()` in the script. Never widen the placeholder list with ambiguous strings — the fixer must only rewrite rationales that are *known* to be wrong.

## Dashboard (one-screen health check)

`pnpm eval:dashboard` runs all evaluators and prints a compact summary — meant for daily review or CI gate:

```
🩺 FUTON PEDAGOGY DASHBOARD
  Global score          88% (0 vs snapshot)
  Excellent (≥85%)      608
  Acceptable (70-84%)   229
  Needs rework (<70%)    89
  Placeholder templates  7 (affecting 67 exercises)
  Biased choice sets   262 authored, neutralized at runtime
  Top 5 levels needing work
    japanese/3A  60%  ...
```

`--strict` exits 1 when global < 85 or any level regresses ≥3pp vs snapshot.

## Time-budget scanner

`pnpm eval:time` estimates each set's total session time as `exerciseCount × passCriteria.maxAvgSecondsPerExercise` and flags those outside the Kumon 3–20 minute guideline.

```bash
pnpm eval:time                                # repo scan
pnpm eval:time --subject math
pnpm eval:time --min 5 --max 15               # tighter target band
pnpm eval:time --json
```

Too-slow sets are almost always fixable by either shortening (fewer exercises per page, fewer pages) or lowering `maxAvgSecondsPerExercise`. Too-fast sets likely need more exercises for proper practice volume. Exits 1 when any sets fall outside the band.

## Answer-position bias scanner

`pnpm eval:bias` scans every set's choice exercises and reports the distribution of correct-answer *positions* (first, second, third…). Because choices render in YAML order with no runtime shuffle, a set whose correct answer always sits at position 1 lets students click without reading.

```bash
pnpm eval:bias                        # repo scan
pnpm eval:bias --subject portuguese
pnpm eval:bias --min-choices 10       # only sets with ≥10 choice exercises
```

Flags sets where any position carries ≥50% of answers (strong bias), or any position holds 0% when 3+ positions exist. Exits 1 when any set has ≥70% bias.

## Cross-set duplication scanner

`pnpm eval:duplicates` walks every set and flags questions that appear in ≥2 sets at the same level. Some recurrence is pedagogically valid (spaced review), but heavy density suggests progression weakness — new sets should teach new material, not re-run the prior set's drills.

Reports per-level density (% of questions that recur elsewhere) and lists the top repeat offenders. Exits 1 when any level exceeds 15% duplication.

## Manual-review checklist generator

`pnpm eval:review` produces a markdown checklist a human reviewer can use to catch issues the automated rubric cannot see — pedagogical clarity, cultural fit, subject-matter accuracy, distractor design.

```bash
pnpm eval:review                     # every level, summary
pnpm eval:review math/D              # one level, per-set checklists
pnpm eval:review math/D/set_12       # one specific set
```

Write the output to a file (`pnpm eval:review math/D > review-mathD.md`) and work through the checklist offline.

## Arithmetic correctness check

`pnpm eval:arithmetic` parses pure `N op N =` arithmetic drills (e.g. `5 + 3 =`, `23 − 7 =`, `6 × 4 =`, `12 ÷ 3 =`) and verifies the authored answer matches the computation. Deliberately strict — skips anything with `?`, `_`, variables, or fractional notation where the numeric field has non-arithmetic semantics, so false positives are near-zero.

Wired into `pnpm eval:all` and fails CI on any mismatch. First run verified 16,312 exercises with zero typos across math/1A through math/Q.

## Example-exercise operator alignment

`pnpm eval:alignment` catches a real pedagogy gap: math sets whose `example` only demonstrates one operation but whose exercises test multiple. A student on a mixed-ops set shouldn't meet subtraction without a model.

Checks numerically-anchored operators (digit op digit) so hyphens in words don't cause false flags. When flagged, `pnpm fix:examples:ops [--apply]` appends a second worked example borrowing from the first exercise that uses each missing operator. First run caught 42 mixed-ops sets across math/1A, 5A, B, F, K, O and auto-fixed them all.

## Rationale-question relevance

`pnpm eval:relevance` catches copy-paste bugs where a rationale ends up attached to the wrong exercise. For pure `N op N =` arithmetic, a method-rationale must mention at least one of: an operand, the answer, or a decomposing digit (column-addition rationales like "Some unidades (1+2=3)" legitimately split operands into digits, so the check accepts that).

Portuguese and English word-form numbers (zero/um/dois/one/two/…) map to digits for comparison. Only fires on pure arithmetic — word problems, grammar, and vocab skip this check since their rationales teach concepts without restating numbers.

Verified 50,186 method-rationales; zero disconnected. Wired into `eval:all`.

## Objective coverage

`pnpm eval:coverage` counts how many exercises target each learning objective across the whole curriculum. Kumon doctrine: every objective needs mass-practice for mastery, so anything with fewer than ~10 exercises globally is a red flag — either expand it (add exercises), retire it (drop the tag), or merge it with a related objective.

Not wired into `eval:all` because this surfaces curriculum-design decisions rather than regressions; running it blocks CI until authors triage. Treat output as a backlog for content work. First run flagged 20 under-drilled Portuguese BNCC codes (1–9 exercises each) across levels D, E, J, K, and G.

## Rationale diversity

`pnpm eval:diversity` catches a class of content bug the automated rubric can't see: rationales that pass the lexical categorizer (they contain method-teaching words) but are actually **hardcoded or copy-pasted** across unrelated exercises.

The check uses a diversity ratio: `unique_rationales / min(unique_answers, unique_question_shapes)`. Anything below 30% (configurable via `--threshold=`) is flagged. The `min(answers, shapes)` denominator prevents false flags on legitimate single-concept drills — a 100-exercise counting set with answers 1–10 needs only ~10 rationales, not 100.

**Why this matters:** iter 82 discovered 594 rationales across math/J/set_07-09 and math/5A/set_04-20 that were either fixed-to-wrong-concept ("Diferença de quadrados" on every `(x+a)(x+b)` expansion) or generic placeholders ("Responda conforme a pergunta."). The rubric scored 100% because the text contained lexicon words; the content was wrong. The diversity detector surfaces future occurrences.

Advisory only (exit 0). Use output to drive manual audits and targeted fixer scripts (see `fix-binomial-rationales.js`, `fix-5a-rationales.js`, `fix-integral-rationales.js` as templates).

**Fix options**:
- **Content**: reshuffle `choices:` / the `(a/b/c)` order in YAML so the correct answer rotates across positions.
- **App**: add a seeded runtime shuffle in `ChoiceExercise.vue` (same seed per attempt → retry consistency). Not yet implemented.

## Snapshot + delta tracker

`pnpm eval:snapshot` saves the current global score + per-level averages + placeholder counts to `PEDAGOGY_SNAPSHOT.json`. Re-running without `--save` diffs against the baseline and flags regressions:

```bash
pnpm eval:snapshot --save                # first run or after a reviewed improvement
pnpm eval:snapshot                       # diff vs baseline (for CI / pre-commit)
pnpm eval:snapshot --threshold -2        # fail if any level drops ≥2pp
```

Default exit code is 1 when any level regresses by ≥3pp, green otherwise. Commit the snapshot alongside content changes so the diff is meaningful across PRs.

## Manual review checklist

For any set opened in the editor, walk this list:

**Set header**
- [ ] `example:` shows a worked mini-problem (before → after).
- [ ] `authorNotes:` names the teaching method or mnemonic.
- [ ] `difficulty:` reflects relative position in the level.

**Per page**
- [ ] Page difficulty rises or stays flat vs previous page.
- [ ] Same answer doesn't dominate (vary correct answers).
- [ ] First exercise on page 1 is the easiest.

**Per exercise**
- [ ] **Rationale teaches**. Opens with an imperative (*Faça 10:*, *Conte:*, *First, …*). Explains **why**, not just what.
- [ ] **Not a restatement**. Never starts with "A resposta é…" or "Answer is…".
- [ ] **Distractors plausible**. Same category, similar length, realistic wrong-answer (not `a/a/a`).
- [ ] **Objectives** tagged, matches the set's objective list.
- [ ] **Question clear**. One instruction, <250 chars, no ambiguity.

**Level level (across sets)**
- [ ] Sets sorted `set_01 … set_NN` have non-decreasing `difficulty:`.
- [ ] New concept gets a gentle warm-up set, not a cold intro at difficulty 4.
- [ ] Concepts from later sets never appear in earlier sets.

## Improvement playbook

When the evaluator flags a dimension, apply the matching recipe.

### Rationale low (<70%)

Rewrite in the **imperative + reason** form. Examples:
- ❌ `Resposta: 12.`  →  ✅ `Faça 10: 9+1=10, depois +2 = 12.`
- ❌ `A palavra correta é "casa".` → ✅ `"Casa" é feminina porque termina em -a.`
- ❌ `Blue is the answer.` → ✅ `Three letters, silent "e". Rhymes with "true".`

Trigger vocabulary lives in [scripts/lib/rationale.js](scripts/lib/rationale.js). It covers imperatives (`faça`, `conte`, `tome`, `observe`, `localize`, `releia`), reasoning connectors (`porque`, `então`, `basta`, `logo`), math concepts (`dobro`, `metade`, `dezena`, `dígito`, `reagrupe`), grammar concepts (`termina`, `modifica`, `liga`, `indica`, `substitui`), and English equivalents. Extend the list rather than rewriting rationales just to pass the regex.

### Gradient low (<70%)

Plot `pageDiffAvgs` (via `--json`). Look for:
- Hot start: page 1 avg > 2.4 → demote first page to review/warm-up.
- Large jump: |Δ| > 1.0 → insert a bridging page or redistribute exercises.
- Regression: last < first → move hardest items to the end.

### Example low (<70%)

Add a worked pair using `→` or `Ex.:`:
```yaml
example: "Conte de 2 em 2. Ex.: 0, 2, 4, 6, __"
```

Or bulk-augment every set missing a worked pair by reading the first exercise:

```bash
pnpm fix:examples                           # dry-run across repo
pnpm fix:examples --subject portuguese      # filter
pnpm fix:examples --apply                   # write
```

It appends ` Ex.: <first-question> → <first-answer>.` to any `example:` that lacks `Ex.:` / `→` / `=` so the evaluator credits a concrete model.

### Objectives low (<100%)

Every exercise must carry `objectives: [code]` using the level's objective codes (see `src/domain/schema/`). Bulk-backfill with `scripts/backfill-metadata.mjs`.

### Answer distribution low

One page has too many identical answers (e.g., 8× "sim"). Re-pick correct answers to spread across the choice space, or redesign the question set.

### Distractors low

- `a/a/a` → all-identical — fix.
- Lengths mismatched (`sim / talvez, dependendo do dia / não`) — even out.
- Implausible distractors (wrong *type*) — choose in-domain wrong answers.

### Level progression low

Sort sets and inspect `difficulty:` monotonicity. Insert or re-order sets; never leave a `step > 1` without a bridge set.

## What *not* to fix

Math drills repeat by design — `2+3=5` and `2+4=6` are fine. The evaluator exempts math from cross-set duplicate warnings (see `audit-content.js`). Do not chase "variety" in arithmetic drills; chase **coverage** and **randomness ≥ 60%**.

## How this doc stays honest

If you change a scorer, update the corresponding row in the rubric table above. The evaluator is the source of truth; this doc documents it.
