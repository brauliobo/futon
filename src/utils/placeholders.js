// minimal placeholder workbook for unimplemented levels
export const generateMathPlaceholder = (level) => ({
  title: `Matemática - Nível ${level} (Coming soon)`,
  level,
  subject: 'math',
  comingSoon: true,
  pages: [
    {
      pageNumber: 1,
      title: 'Coming soon',
      description: 'Conteúdo em breve.',
      exercises: [ { type: 'mixed', question: 'Coming soon', correctAnswer: '—' } ]
    }
  ]
});


