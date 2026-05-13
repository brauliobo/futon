export class SubjectBranding {
  static COLORS = {
    math: '#4A9EF5', portuguese: '#6BCB77', english: '#F97316',
    japanese: '#E31F23', spanish: '#F4C430', biology: '#22C55E',
  };
  static ICONS = {
    math: '🔢', portuguese: '📖', english: '🌍',
    japanese: '🗾', spanish: '🌶️', biology: '🧬',
  };

  static color(subject) { return this.COLORS[subject] || '#4A9EF5'; }
  static icon(subject) { return this.ICONS[subject] || '📚'; }
}
