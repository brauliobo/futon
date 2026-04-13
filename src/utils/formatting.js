export function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function calculateProgress(current, total) {
  return !total ? 0 : Math.round((current / total) * 100);
}

// Normalize for comparison: strip accents, whitespace, commas→dots, lowercase
export function normalizeAnswer(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '').replace(/,/, '.').toLowerCase();
}
