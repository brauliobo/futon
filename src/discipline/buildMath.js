// src/discipline/buildMath.js
import level5ACount from "../levels/math/5A/level_5A_count.json";
import level5ANextPrev from "../levels/math/5A/level_5A_nextprev.json";
import level5AAddition1 from "../levels/math/5A/level_5A_addition_1.json";
import level5AAddition2 from "../levels/math/5A/level_5A_addition_2.json";
import level5AAddition3 from "../levels/math/5A/level_5A_addition_3.json";
import level5AAddition4 from "../levels/math/5A/level_5A_addition_4.json";
import level5AAddition5 from "../levels/math/5A/level_5A_addition_5.json";
import level5AAddition6 from "../levels/math/5A/level_5A_addition_6.json";
import level5AAddition7 from "../levels/math/5A/level_5A_addition_7.json";
import level5AAddition8 from "../levels/math/5A/level_5A_addition_8.json";
import level5AAddition9 from "../levels/math/5A/level_5A_addition_9.json";
import level5ASubtraction1 from "../levels/math/5A/level_5A_subtraction_1.json";
import level5ASubtraction2 from "../levels/math/5A/level_5A_subtraction_2.json";
import level5ASubtraction3 from "../levels/math/5A/level_5A_subtraction_3.json";
import level5ASubtraction4 from "../levels/math/5A/level_5A_subtraction_4.json";
import level5ASubtraction5 from "../levels/math/5A/level_5A_subtraction_5.json";
import level5ASubtraction6 from "../levels/math/5A/level_5A_subtraction_6.json";
import level5ASubtraction7 from "../levels/math/5A/level_5A_subtraction_7.json";
import level5ASubtraction8 from "../levels/math/5A/level_5A_subtraction_8.json";
import level5ASubtraction9 from "../levels/math/5A/level_5A_subtraction_9.json";
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

const wb = (l, n) => ({ level: l, workbook: n });
const staticWorkbooks = [
  wb("5A", level5ACount),
  wb("5A", level5ANextPrev),
  wb("5A", level5AAddition1),
  wb("5A", level5AAddition2),
  wb("5A", level5AAddition3),
  wb("5A", level5AAddition4),
  wb("5A", level5AAddition5),
  wb("5A", level5AAddition6),
  wb("5A", level5AAddition7),
  wb("5A", level5AAddition8),
  wb("5A", level5AAddition9),
  wb("5A", level5ASubtraction1),
  wb("5A", level5ASubtraction2),
  wb("5A", level5ASubtraction3),
  wb("5A", level5ASubtraction4),
  wb("5A", level5ASubtraction5),
  wb("5A", level5ASubtraction6),
  wb("5A", level5ASubtraction7),
  wb("5A", level5ASubtraction8),
  wb("5A", level5ASubtraction9),
  wb("4A", level4ACount),
  wb("4A", level4AAddition),
  wb("3A", level3AAddition),
  wb("3A", level3ANextPrev),
  wb("2A", level2ASubtraction),
  wb("2A", level2ASubtraction2),
  wb("1A", level1AAddSub),
  wb("1A", level1ANextPrev),
];

export function buildMathWorkbooks(withMeta, generators, seed) {
  const {
    generateAdditionWorkbook,
    generateSubtractionWorkbook,
    generateMultiplicationWorkbook,
    generateDivisionWorkbook,
    generateCountWorkbook,
    generateNextPrevWorkbook,
  } = generators;

  const level7AWorkbooks = [];
  for (let i = 0; i < 10; i += 1) {
    level7AWorkbooks.push(withMeta(generateCountWorkbook({ seed: `${seed}-7A-C-${i}`, level: '7A', pages: 10, sequence: i })));
    level7AWorkbooks.push(withMeta(generateNextPrevWorkbook({ seed: `${seed}-7A-NP-${i}`, level: '7A', pages: 10, sequence: i })));
  }

  // 6A: enforce 20 workbooks (10 count + 10 next/prev)
  const level6AWorkbooks = [];
  for (let i = 0; i < 10; i += 1) {
    const c = withMeta(generateCountWorkbook({ seed: `${seed}-6A-C-${i}`, level: '6A', pages: 10 }));
    const np = withMeta(generateNextPrevWorkbook({ seed: `${seed}-6A-NP-${i}`, level: '6A', pages: 10 }));
    level6AWorkbooks.push({ ...c, title: `6A • Contar Objetos 1–10 #${i + 1}` });
    level6AWorkbooks.push({ ...np, title: `6A • Próximo/Anterior #${i + 1}` });
  }

  const dynamicWorkbooks = [
    ...level7AWorkbooks,
    ...level6AWorkbooks,
    withMeta(generateAdditionWorkbook({ seed: `${seed}-A`, level: 'A', pages: 10 })),
    withMeta(generateAdditionWorkbook({ seed: `${seed}-B`, level: 'B', pages: 10 })),
    withMeta(generateSubtractionWorkbook({ seed: `${seed}-S-A`, level: 'A', pages: 10 })),
    withMeta(generateSubtractionWorkbook({ seed: `${seed}-S-B`, level: 'B', pages: 10 })),
    withMeta(generateMultiplicationWorkbook({ seed: `${seed}-M-A`, level: 'A', pages: 10 })),
    withMeta(generateDivisionWorkbook({ seed: `${seed}-D-A`, level: 'A', pages: 10 })),
  ];

  const implementedMathLevels = new Set(staticWorkbooks.map(w => w.level).concat(dynamicWorkbooks.map(w => w.level)));

  const allMathOrder = getMathLevelOrder();
  const mathPlaceholders = allMathOrder
    .filter(lvl => !implementedMathLevels.has(lvl))
    .map(lvl => withMeta(generateMathPlaceholder(lvl)));

  return [
    ...staticWorkbooks.map(w => withMeta(w.workbook)),
    ...dynamicWorkbooks,
    ...mathPlaceholders,
  ];
}


