// src/discipline/buildPortuguese.js
import portugueseReading from "../levels/portuguese/A/reading_comprehension.json";
import portugueseGrammar from "../levels/portuguese/A/grammar.json";
import portugueseReading2 from "../levels/portuguese/A/reading_comprehension_2.json";
import portugueseGrammar2 from "../levels/portuguese/A/grammar_2.json";

export function buildPortugueseWorkbooks(withMeta) {
  return [withMeta(portugueseReading), withMeta(portugueseGrammar), withMeta(portugueseReading2), withMeta(portugueseGrammar2)];
}


