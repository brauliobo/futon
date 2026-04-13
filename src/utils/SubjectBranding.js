export class SubjectBranding {
  static COLORS = { math: '#4A9EF5', portuguese: '#6BCB77', english: '#F97316' };
  static ICONS = { math: '🔢', portuguese: '📖', english: '🌍' };

  static color(subject) { return this.COLORS[subject] || '#4A9EF5'; }
  static icon(subject) { return this.ICONS[subject] || '📚'; }
}
