const DISCIPLINES = {
  math: {
    levels: {
      '5A': 20, '4A': 20, '3A': 20, '2A': 20, '1A': 20,
      '6A': 22, '7A': 20,
      'A': 28, 'B': 28, 'C': 28, 'D': 26,
      'E': 20, 'F': 20, 'G': 20, 'H': 20,
      'I': 20, 'J': 20, 'K': 20, 'L': 20,
      'M': 20, 'N': 20, 'O': 20
    }
  },
  portuguese: {
    levels: {
      '7A': 20, '6A': 20, '5A': 20, '4A': 20, '3A': 20, '2A': 20, '1A': 20,
      'A': 20, 'B': 20, 'C': 20, 'D': 20
    }
  },
  english: {
    levels: {
      'A': 4
    }
  }
};

export function getDisciplineMetadata(disciplineName) {
  const discipline = DISCIPLINES[disciplineName];
  if (!discipline) throw new Error(`Unknown discipline: ${disciplineName}`);
  return { levels: Object.keys(discipline.levels) };
}

export async function importSetsForLevel(disciplineName, level) {
  const discipline = DISCIPLINES[disciplineName];
  if (!discipline) throw new Error(`Unknown discipline: ${disciplineName}`);
  
  const setCount = discipline.levels[level];
  if (setCount === undefined) throw new Error(`Unknown level ${level} for ${disciplineName}`);
  
  const sets = [];
  for (let i = 1; i <= setCount; i++) {
    const setNumber = i.toString().padStart(2, '0');
    const module = await import(`../levels/${disciplineName}/${level}/set_${setNumber}.yaml`);
    sets.push({ level, set: module.default });
  }
  return sets;
}

// Optionally add single-set imports in the future to prefetch around current