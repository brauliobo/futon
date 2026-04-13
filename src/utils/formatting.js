/**
 * Formatting utilities
 */

/**
 * Format seconds as MM:SS
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string (e.g., "5:23")
 */
export function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Calculate progress percentage
 * @param {number} current - Current value (1-based)
 * @param {number} total - Total value
 * @returns {number} Progress percentage (0-100)
 */
export function calculateProgress(current, total) {
  if (!total || total === 0) return 0;
  return Math.round((current / total) * 100);
}

/**
 * Normalize string for comparison (trim, lowercase, replace commas with dots)
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
export function normalizeAnswer(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '').replace(/,/, '.').toLowerCase();
}


