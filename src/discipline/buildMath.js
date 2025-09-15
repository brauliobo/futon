// src/discipline/buildMath.js
import addition from "../levels/math/A/addition.json";
import addition2 from "../levels/math/A/addition_2.json";
import addition3 from "../levels/math/A/addition_3.json";
import addition4 from "../levels/math/A/addition_4.json";
import addition5 from "../levels/math/A/addition_5.json";
import subtraction from "../levels/math/B/subtraction.json";
import subtraction2 from "../levels/math/B/subtraction_2.json";
import subtraction3 from "../levels/math/B/subtraction_3.json";
import subtraction4 from "../levels/math/B/subtraction_4.json";
import subtraction5 from "../levels/math/B/subtraction_5.json";
import multiplication from "../levels/math/C/multiplication.json";
import multiplication2 from "../levels/math/C/multiplication_2.json";
import multiplication3 from "../levels/math/C/multiplication_3.json";
import multiplication4 from "../levels/math/C/multiplication_4.json";
import multiplication5 from "../levels/math/C/multiplication_5.json";
import division from "../levels/math/D/division.json";
import division2 from "../levels/math/D/division_2.json";
import division3 from "../levels/math/D/division_3.json";
import division4 from "../levels/math/D/division_4.json";
import division5 from "../levels/math/D/division_5.json";
import fractions from "../levels/math/C/fractions.json";
import fractionsMixed from "../levels/math/D/fractions_mixed.json";
import eFractionsSame from "../levels/math/E/fractions_add_sub.json";
import eFractionsUnlike1 from "../levels/math/E/fractions_unlike_1.json";
import eFractionsUnlike2 from "../levels/math/E/fractions_unlike_2.json";
import eFractionsWord from "../levels/math/E/fractions_word_problems.json";
import eDecimalsLink from "../levels/math/E/decimals_link.json";
import fFractionsMulDiv from "../levels/math/F/fractions_mul_div.json";
import fDecimalsOps from "../levels/math/F/decimals_operations.json";
import { c1 } from "../levels/math/C/c1.js";
import level7ACount from "../levels/math/7A/level_7A_count.json";
import level7ANextPrev from "../levels/math/7A/level_7A_nextprev.json";
import level6ACount from "../levels/math/6A/level_6A_count.json";
import level6ANextPrev from "../levels/math/6A/level_6A_nextprev.json";
import level5ACount from "../levels/math/5A/level_5A_count.json";
import level5ANextPrev from "../levels/math/5A/level_5A_nextprev.json";
import level4ACount from "../levels/math/4A/level_4A_count.json";
import level4AAddition from "../levels/math/4A/level_4A_addition.json";
import level3AAddition from "../levels/math/3A/level_3A_addition.json";
import level3ANextPrev from "../levels/math/3A/level_3A_nextprev.json";
import level1AAddSub from "../levels/math/1A/level_1A_add_sub_0_10.json";
import level1ANextPrev from "../levels/math/1A/level_1A_nextprev_0_10.json";
import level2ASubtraction from "../levels/math/2A/level_2A_subtraction.json";
import level2ASubtraction2 from "../levels/math/2A/level_2A_subtraction_2.json";
import { getMathLevelOrder } from "../domain/levels.js";
import { generateMathPlaceholder } from "../utils/placeholders.js";

export function buildMathWorkbooks(withMeta, generators, seed) {
  const { generateAdditionWorkbook, generateSubtractionWorkbook, generateMultiplicationWorkbook, generateDivisionWorkbook } = generators;
  const dynamicAdditionA = withMeta(generateAdditionWorkbook({ seed: `${seed}-A`, level: 'A', pages: 2 }));
  const dynamicAdditionB = withMeta(generateAdditionWorkbook({ seed: `${seed}-B`, level: 'B', pages: 2 }));
  const dynamicSubtractionA = withMeta(generateSubtractionWorkbook({ seed: `${seed}-S-A`, level: 'A', pages: 2 }));
  const dynamicSubtractionB = withMeta(generateSubtractionWorkbook({ seed: `${seed}-S-B`, level: 'B', pages: 2 }));
  const dynamicMultiplicationA = withMeta(generateMultiplicationWorkbook({ seed: `${seed}-M-A`, level: 'A', pages: 2 }));
  const dynamicDivisionA = withMeta(generateDivisionWorkbook({ seed: `${seed}-D-A`, level: 'A', pages: 2 }));

  const implementedMathLevels = new Set([
    addition, addition2, addition3, addition4, addition5,
    subtraction, subtraction2, subtraction3, subtraction4, subtraction5,
    multiplication, multiplication2, multiplication3, multiplication4, multiplication5,
    division, division2, division3, division4, division5,
    fractions, fractionsMixed,
    eFractionsSame, eFractionsUnlike1, eFractionsUnlike2, eFractionsWord, eDecimalsLink,
    fFractionsMulDiv, fDecimalsOps,
    level7ACount, level7ANextPrev,
    level6ACount, level6ANextPrev,
    level5ACount, level5ANextPrev,
    level4ACount, level4AAddition,
    level3AAddition, level3ANextPrev,
    level1AAddSub, level1ANextPrev,
    level2ASubtraction, level2ASubtraction2
  ].map(w => w.level));

  const allMathOrder = getMathLevelOrder();
  const mathPlaceholders = allMathOrder
    .filter(lvl => !implementedMathLevels.has(lvl))
    .map(lvl => withMeta(generateMathPlaceholder(lvl)));

  return [
    withMeta(level7ACount), withMeta(level7ANextPrev),
    withMeta(level6ACount), withMeta(level6ANextPrev),
    withMeta(level5ACount), withMeta(level5ANextPrev),
    withMeta(level4ACount), withMeta(level4AAddition),
    withMeta(level3AAddition), withMeta(level3ANextPrev), withMeta(level1AAddSub), withMeta(level1ANextPrev), withMeta(level2ASubtraction), withMeta(level2ASubtraction2),
    withMeta(addition), withMeta(addition2), withMeta(addition3), withMeta(addition4), withMeta(addition5),
    dynamicAdditionA, dynamicAdditionB,
    dynamicSubtractionA, dynamicSubtractionB,
    dynamicMultiplicationA,
    dynamicDivisionA,
    withMeta(subtraction2), withMeta(subtraction3), withMeta(subtraction4), withMeta(subtraction5), withMeta(subtraction),
    withMeta(multiplication2), withMeta(multiplication3), withMeta(multiplication4), withMeta(multiplication5), withMeta(multiplication),
    withMeta(division2), withMeta(division3), withMeta(division4), withMeta(division5), withMeta(division),
    withMeta(fractions), withMeta(fractionsMixed),
    withMeta(eFractionsSame), withMeta(eFractionsUnlike1), withMeta(eFractionsUnlike2), withMeta(eFractionsWord), withMeta(eDecimalsLink),
    withMeta(fFractionsMulDiv), withMeta(fDecimalsOps),
    ...mathPlaceholders,
    withMeta(c1)
  ];
}


