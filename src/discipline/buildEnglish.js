// src/discipline/buildEnglish.js
import englishBasics from "../levels/english/A/english_basics.yaml";
import englishPhrases from "../levels/english/A/english_phrases.yaml";
import englishVocab2 from "../levels/english/A/english_vocab_2.yaml";
import englishPhrases2 from "../levels/english/A/english_phrases_2.yaml";

export function buildEnglishSets(withMeta) {
  return [withMeta(englishBasics), withMeta(englishPhrases), withMeta(englishVocab2), withMeta(englishPhrases2)];
}


