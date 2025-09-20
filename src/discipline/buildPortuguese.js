// src/discipline/buildPortuguese.js
import portugueseReading from "../levels/portuguese/A/reading_comprehension.yaml";
import portugueseGrammar from "../levels/portuguese/A/grammar.yaml";
import portugueseReading2 from "../levels/portuguese/A/reading_comprehension_2.yaml";
import portugueseGrammar2 from "../levels/portuguese/A/grammar_2.yaml";

export function buildPortugueseWorkbooks(withMeta) {
  return [withMeta(portugueseReading), withMeta(portugueseGrammar), withMeta(portugueseReading2), withMeta(portugueseGrammar2)];
}


