export function speedGaugeWidth(avgSeconds, target) {
  return Math.round(Math.max(0, Math.min(100, 100 * (1 - avgSeconds / (target * 2)))));
}

export function speedVariant(avgSeconds, target) {
  if (avgSeconds <= target) return 'success';
  if (avgSeconds <= target * 1.2) return 'warning';
  return 'danger';
}

export function speedLabelColor(avgSeconds, target) {
  if (avgSeconds <= target) return 'text-kid-green';
  if (avgSeconds <= target * 1.3) return 'text-amber-500';
  return 'text-kid-red';
}
