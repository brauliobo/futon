# Pedagogy Quality — Kumon-grade Rubric

This guide defines how we judge whether a Futon set is good *as a learning artifact*, and how to improve it.

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
| 2 | Gradient | 20 | First page avg difficulty ≤ 2.4; page-to-page jump ≤ 1.0; ends ≥ it starts |
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
pnpm eval:all                                          # pedagogy + lint + audit + validate
```

Exits 0 when global score ≥70%, else 1 (CI signal).

## Rationale drill-down tool

`pedagogy-eval.js` tells you *which sets* are weak. `rationale-review.js` tells you
*which exercises* inside a set need rewriting, categorized by the same rubric:

```bash
pnpm eval:rationales src/levels/portuguese/A/set_01.yaml            # per-exercise table
pnpm eval:rationales --subject portuguese --level A                  # summary across a level
pnpm eval:rationales --subject math --level B --only restatement,missing,short
```

Categories: `method` (teaches how), `generic` (states fact, no method verb), `restatement` (repeats answer), `missing`, `short` (<10 chars), `long` (>300 chars).

**Review workflow**:
1. `pnpm eval:pedagogy --worst 20` → identifies worst sets.
2. `pnpm eval:rationales path/to/set.yaml` → lists every exercise's rationale status.
3. Rewrite the flagged rationales using the imperative + reason form (see playbook below).
4. Re-run `pnpm eval:pedagogy --set path/to/set.yaml` to verify improvement.

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

Trigger words that earn full credit: `faça`, `conte`, `primeiro`, `depois`, `porque`, `então`, `dobro`, `metade`, `first`, `then`, `because`, `notice`, `step`, `rule`, `pattern`.

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
