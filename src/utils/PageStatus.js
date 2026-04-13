export class PageStatus {
  static calculate(answers, totalCount) {
    const answeredCount = answers.filter(a => a !== null && String(a).trim() !== '').length;
    return { answeredCount, totalCount, isCompleted: answeredCount === totalCount };
  }

  static initAnswers(exercises) {
    return exercises.map(ex => {
      const a = ex?.answer ? String(ex.answer) : '';
      return a.trim() !== '' ? a : null;
    });
  }
}
