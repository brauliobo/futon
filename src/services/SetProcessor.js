// src/services/SetProcessor.js
export class SetProcessor {
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static expandPortuguesePages(wb) {
    // Special handling for Portuguese A, B, C, D levels: split exercises into individual pages
    if (wb.subject === 'portuguese' && ['A', 'B', 'C', 'D'].includes(wb.level) && wb.pages?.length === 1 && wb.pages[0]?.exercises?.length > 1) {
      const originalPage = wb.pages[0];
      const splitPages = originalPage.exercises.map((exercise, index) => ({
        pageNumber: index + 1,
        title: `${originalPage.title} - Questão ${index + 1}`,
        description: originalPage.description,
        exercises: [exercise]
      }));
      return { ...wb, pages: splitPages };
    }
    return wb;
  }

  static expandRepetitions(wb) {
    const deep = this.deepClone;
    
    const sourcePages = wb.pages.flatMap((p) => {
      const times = Number.isFinite(p.repeat) && p.repeat > 1 ? Math.floor(p.repeat) : 1;
      return Array.from({ length: times }, () => deep({ ...p, repeat: undefined }));
    });
    
    const allTimes = Number.isFinite(wb.repeatAll) && wb.repeatAll > 1 ? Math.floor(wb.repeatAll) : 1;
    let pages = sourcePages;
    for (let t = 1; t < allTimes; t += 1) {
      pages = pages.concat(sourcePages.map((p) => deep(p)));
    }

    return { ...wb, pages };
  }

  // All YAML files now have correct structure - no processing needed

  static numberPages(wb) {
    wb.pages.forEach((p, i) => { p.pageNumber = i + 1; });
    return wb;
  }

  static calculateTotalExercises(wb) {
    const totalExercises = wb.pages.reduce((acc, page) => acc + page.exercises.length, 0);
    return { ...wb, totalExercises };
  }

  static processSet(wb) {
    let processed = this.expandPortuguesePages(wb);
    processed = this.expandRepetitions(processed);
    // Math pages no longer need processing - all YAML files have correct structure
    processed = this.numberPages(processed);
    processed = this.calculateTotalExercises(processed);
    return processed;
  }
}
