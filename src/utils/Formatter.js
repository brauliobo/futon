export class Formatter {
  static timer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  static progress(current, total) {
    return !total ? 0 : Math.round((current / total) * 100);
  }

  // Strip accents, whitespace, commas→dots, lowercase
  static normalizeAnswer(str) {
    return String(str || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '').replace(/,/, '.').toLowerCase();
  }

  static slugify(title) {
    return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}
