// Deterministic seeded shuffle. Used by ChoiceExercise to rotate correct-answer
// positions across questions so students can't game the layout — without
// breaking retry consistency inside a given question (same seed → same order).

export class Shuffle {
  static hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  // Fisher-Yates with a linear-congruential PRNG seeded by the string.
  static withSeed(arr, seed) {
    const out = [...arr];
    let s = Shuffle.hash(String(seed)) || 1;
    for (let i = out.length - 1; i > 0; i--) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      const j = s % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
