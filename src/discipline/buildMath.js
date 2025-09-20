// src/discipline/buildMath.js
import level5ACount from "../levels/math/5A/count.yaml";
import level5ANextPrev from "../levels/math/5A/nextprev.yaml";
import level5AAddition1 from "../levels/math/5A/addition_1.yaml";
import level5AAddition2 from "../levels/math/5A/addition_2.yaml";
import level5AAddition3 from "../levels/math/5A/addition_3.yaml";
import level5AAddition4 from "../levels/math/5A/addition_4.yaml";
import level5AAddition5 from "../levels/math/5A/addition_5.yaml";
import level5AAddition6 from "../levels/math/5A/addition_6.yaml";
import level5AAddition7 from "../levels/math/5A/addition_7.yaml";
import level5AAddition8 from "../levels/math/5A/addition_8.yaml";
import level5AAddition9 from "../levels/math/5A/addition_9.yaml";
import level5ASubtraction1 from "../levels/math/5A/subtraction_1.yaml";
import level5ASubtraction2 from "../levels/math/5A/subtraction_2.yaml";
import level5ASubtraction3 from "../levels/math/5A/subtraction_3.yaml";
import level5ASubtraction4 from "../levels/math/5A/subtraction_4.yaml";
import level5ASubtraction5 from "../levels/math/5A/subtraction_5.yaml";
import level5ASubtraction6 from "../levels/math/5A/subtraction_6.yaml";
import level5ASubtraction7 from "../levels/math/5A/subtraction_7.yaml";
import level5ASubtraction8 from "../levels/math/5A/subtraction_8.yaml";
import level5ASubtraction9 from "../levels/math/5A/subtraction_9.yaml";
import level4ASet01 from "../levels/math/4A/set_01.yaml";
import level4ASet02 from "../levels/math/4A/set_02.yaml";
import level4ASet03 from "../levels/math/4A/set_03.yaml";
import level4ASet04 from "../levels/math/4A/set_04.yaml";
import level4ASet05 from "../levels/math/4A/set_05.yaml";
import level4ASet06 from "../levels/math/4A/set_06.yaml";
import level4ASet07 from "../levels/math/4A/set_07.yaml";
import level4ASet08 from "../levels/math/4A/set_08.yaml";
import level4ASet09 from "../levels/math/4A/set_09.yaml";
import level4ASet10 from "../levels/math/4A/set_10.yaml";
import level4ASet11 from "../levels/math/4A/set_11.yaml";
import level4ASet12 from "../levels/math/4A/set_12.yaml";
import level4ASet13 from "../levels/math/4A/set_13.yaml";
import level4ASet14 from "../levels/math/4A/set_14.yaml";
import level4ASet15 from "../levels/math/4A/set_15.yaml";
import level4ASet16 from "../levels/math/4A/set_16.yaml";
import level4ASet17 from "../levels/math/4A/set_17.yaml";
import level4ASet18 from "../levels/math/4A/set_18.yaml";
import level4ASet19 from "../levels/math/4A/set_19.yaml";
import level4ASet20 from "../levels/math/4A/set_20.yaml";
import level3ASet01 from "../levels/math/3A/set_01.yaml";
import level3ASet02 from "../levels/math/3A/set_02.yaml";
import level3ASet03 from "../levels/math/3A/set_03.yaml";
import level3ASet04 from "../levels/math/3A/set_04.yaml";
import level3ASet05 from "../levels/math/3A/set_05.yaml";
import level3ASet06 from "../levels/math/3A/set_06.yaml";
import level3ASet07 from "../levels/math/3A/set_07.yaml";
import level3ASet08 from "../levels/math/3A/set_08.yaml";
import level3ASet09 from "../levels/math/3A/set_09.yaml";
import level3ASet10 from "../levels/math/3A/set_10.yaml";
import level3ASet11 from "../levels/math/3A/set_11.yaml";
import level3ASet12 from "../levels/math/3A/set_12.yaml";
import level3ASet13 from "../levels/math/3A/set_13.yaml";
import level3ASet14 from "../levels/math/3A/set_14.yaml";
import level3ASet15 from "../levels/math/3A/set_15.yaml";
import level3ASet16 from "../levels/math/3A/set_16.yaml";
import level3ASet17 from "../levels/math/3A/set_17.yaml";
import level3ASet18 from "../levels/math/3A/set_18.yaml";
import level3ASet19 from "../levels/math/3A/set_19.yaml";
import level3ASet20 from "../levels/math/3A/set_20.yaml";
import level1AAddSub from "../levels/math/1A/add_sub_0_10.yaml";
import level1ANextPrev from "../levels/math/1A/nextprev_0_10.yaml";
import level2ASet01 from "../levels/math/2A/set_01.yaml";
import level2ASet02 from "../levels/math/2A/set_02.yaml";
import level2ASet03 from "../levels/math/2A/set_03.yaml";
import level2ASet04 from "../levels/math/2A/set_04.yaml";
import level2ASet05 from "../levels/math/2A/set_05.yaml";
import level2ASet06 from "../levels/math/2A/set_06.yaml";
import level2ASet07 from "../levels/math/2A/set_07.yaml";
import level2ASet08 from "../levels/math/2A/set_08.yaml";
import level2ASet09 from "../levels/math/2A/set_09.yaml";
import level2ASet10 from "../levels/math/2A/set_10.yaml";
import level2ASet11 from "../levels/math/2A/set_11.yaml";
import level2ASet12 from "../levels/math/2A/set_12.yaml";
import level2ASet13 from "../levels/math/2A/set_13.yaml";
import level2ASet14 from "../levels/math/2A/set_14.yaml";
import level2ASet15 from "../levels/math/2A/set_15.yaml";
import level2ASet16 from "../levels/math/2A/set_16.yaml";
import level2ASet17 from "../levels/math/2A/set_17.yaml";
import level2ASet18 from "../levels/math/2A/set_18.yaml";
import level2ASet19 from "../levels/math/2A/set_19.yaml";
import level2ASet20 from "../levels/math/2A/set_20.yaml";
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
  wb("4A", level4ASet01),
  wb("4A", level4ASet02),
  wb("4A", level4ASet03),
  wb("4A", level4ASet04),
  wb("4A", level4ASet05),
  wb("4A", level4ASet06),
  wb("4A", level4ASet07),
  wb("4A", level4ASet08),
  wb("4A", level4ASet09),
  wb("4A", level4ASet10),
  wb("4A", level4ASet11),
  wb("4A", level4ASet12),
  wb("4A", level4ASet13),
  wb("4A", level4ASet14),
  wb("4A", level4ASet15),
  wb("4A", level4ASet16),
  wb("4A", level4ASet17),
  wb("4A", level4ASet18),
  wb("4A", level4ASet19),
  wb("4A", level4ASet20),
  wb("3A", level3ASet01),
  wb("3A", level3ASet02),
  wb("3A", level3ASet03),
  wb("3A", level3ASet04),
  wb("3A", level3ASet05),
  wb("3A", level3ASet06),
  wb("3A", level3ASet07),
  wb("3A", level3ASet08),
  wb("3A", level3ASet09),
  wb("3A", level3ASet10),
  wb("3A", level3ASet11),
  wb("3A", level3ASet12),
  wb("3A", level3ASet13),
  wb("3A", level3ASet14),
  wb("3A", level3ASet15),
  wb("3A", level3ASet16),
  wb("3A", level3ASet17),
  wb("3A", level3ASet18),
  wb("3A", level3ASet19),
  wb("3A", level3ASet20),
  wb("2A", level2ASet01),
  wb("2A", level2ASet02),
  wb("2A", level2ASet03),
  wb("2A", level2ASet04),
  wb("2A", level2ASet05),
  wb("2A", level2ASet06),
  wb("2A", level2ASet07),
  wb("2A", level2ASet08),
  wb("2A", level2ASet09),
  wb("2A", level2ASet10),
  wb("2A", level2ASet11),
  wb("2A", level2ASet12),
  wb("2A", level2ASet13),
  wb("2A", level2ASet14),
  wb("2A", level2ASet15),
  wb("2A", level2ASet16),
  wb("2A", level2ASet17),
  wb("2A", level2ASet18),
  wb("2A", level2ASet19),
  wb("2A", level2ASet20),
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


