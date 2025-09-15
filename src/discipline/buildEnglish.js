// src/discipline/buildEnglish.js
import englishBasics from "../levels/english/A/english_basics.json";
import englishPhrases from "../levels/english/A/english_phrases.json";
import englishVocab2 from "../levels/english/A/english_vocab_2.json";
import englishPhrases2 from "../levels/english/A/english_phrases_2.json";

export function buildEnglishWorkbooks(withMeta) {
  return [withMeta(englishBasics), withMeta(englishPhrases), withMeta(englishVocab2), withMeta(englishPhrases2)];
}


