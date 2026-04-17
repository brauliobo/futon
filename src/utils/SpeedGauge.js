export class SpeedGauge {
  static width(avgSeconds, target) {
    return Math.round(Math.max(0, Math.min(100, 100 * (1 - avgSeconds / (target * 2)))));
  }

  static variant(avgSeconds, target) {
    if (avgSeconds <= target) return 'success';
    if (avgSeconds <= target * 1.2) return 'warning';
    return 'danger';
  }

  static labelColor(avgSeconds, target) {
    if (avgSeconds <= target) return 'text-kid-green';
    if (avgSeconds <= target * 1.3) return 'text-amber-500';
    return 'text-kid-red';
  }

  static emoji(avgSeconds, target) {
    if (avgSeconds <= target * 0.5) return '🚀';
    if (avgSeconds <= target) return '⚡';
    if (avgSeconds <= target * 1.3) return '🐢';
    return '🐌';
  }
}
