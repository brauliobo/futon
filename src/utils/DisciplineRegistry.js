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
    levels: { 'A': 10, 'B': 7, 'C': 3, 'D': 2 }
  }
};

export class DisciplineRegistry {
  static metadata(name) {
    const d = DISCIPLINES[name];
    if (!d) throw new Error(`Unknown discipline: ${name}`);
    return { levels: Object.keys(d.levels) };
  }

  static async importLevel(name, level) {
    const d = DISCIPLINES[name];
    if (!d) throw new Error(`Unknown discipline: ${name}`);
    const count = d.levels[level];
    if (count === undefined) throw new Error(`Unknown level ${level} for ${name}`);
    const sets = [];
    for (let i = 1; i <= count; i++) {
      const num = i.toString().padStart(2, '0');
      const module = await import(`../levels/${name}/${level}/set_${num}.yaml`);
      sets.push({ level, set: module.default });
    }
    return sets;
  }
}
