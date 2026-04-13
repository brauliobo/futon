const SUBJECT_COLORS = { math: '#4A9EF5', portuguese: '#6BCB77', english: '#F97316' };
const SUBJECT_ICONS = { math: '🔢', portuguese: '📖', english: '🌍' };

export const subjectColor = (s) => SUBJECT_COLORS[s] || '#4A9EF5';
export const subjectIcon = (s) => SUBJECT_ICONS[s] || '📚';
