// Dynamic import utilities for loading all set_*.yaml files from directories

// Define discipline structure with levels and their set counts
const DISCIPLINES = {
  math: {
    levels: {
      '5A': 20, '4A': 20, '3A': 20, '2A': 20, '1A': 20, // Grade levels
      '6A': 22, '7A': 20,                                // Early learning (6A has extra sets)
      'A': 28, 'B': 28, 'C': 28, 'D': 26,              // Basic operations (with extra sets)
      'E': 20, 'F': 20, 'G': 20, 'H': 20,              // Intermediate
      'I': 20, 'J': 20, 'K': 20, 'L': 20,              // Advanced
      'M': 20, 'N': 20, 'O': 20                        // Expert
    }
  },
  portuguese: {
    levels: {
      '7A': 20, '6A': 20, '5A': 20, '4A': 20, '3A': 20, '2A': 20, '1A': 20, // Grade levels
      'A': 20, 'B': 20, 'C': 20, 'D': 20                                      // Literacy levels
    }
  },
  english: {
    levels: {
      'A': 4 // Basic English
    }
  }
};

// Generic function to import sets for any discipline
async function importSetsForDiscipline(disciplineName) {
  const discipline = DISCIPLINES[disciplineName];
  if (!discipline) {
    throw new Error(`Unknown discipline: ${disciplineName}`);
  }

  const sets = [];
  
  // Iterate through all levels in this discipline
  for (const [level, setCount] of Object.entries(discipline.levels)) {
    // Import all sets for this level
    for (let i = 1; i <= setCount; i++) {
      const setNumber = i.toString().padStart(2, '0');
      const module = await import(`../levels/${disciplineName}/${level}/set_${setNumber}.yaml`);
      sets.push({ level, set: module.default });
    }
  }
  
  return sets;
}

// Export discipline-specific functions
export async function importMathSets() {
  return importSetsForDiscipline('math');
}

export async function importPortugueseSets() {
  return importSetsForDiscipline('portuguese');
}

export async function importEnglishSets() {
  return importSetsForDiscipline('english');
}

// Export generic function for potential future use
export { importSetsForDiscipline };