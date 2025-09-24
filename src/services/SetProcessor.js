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

  static groupMathExercises(wb) {
    // Group math pages that contain a single exercise into pages of 10 exercises
    if (wb.subject === 'math' && wb.pages.length > 1 && wb.pages.every(p => (p.exercises || []).length === 1)) {
      const baseTitle = String(wb.pages[0]?.title || '').replace(/\s*–\s*Página\s+\d+$/i, '');
      const desc = wb.pages[0]?.description || '';
      const grouped = [];
      
      for (let i = 0; i < wb.pages.length; i += 10) {
        const slice = wb.pages.slice(i, i + 10);
        grouped.push({
          pageNumber: 0, // Will be set later
          title: `${baseTitle} – Página ${grouped.length + 1}`,
          description: desc,
          exercises: slice.flatMap(p => p.exercises)
        });
      }
      
      return { ...wb, pages: grouped };
    }
    return wb;
  }

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
    processed = this.groupMathExercises(processed);
    processed = this.numberPages(processed);
    processed = this.calculateTotalExercises(processed);
    return processed;
  }
}
