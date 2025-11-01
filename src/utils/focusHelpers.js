/**
 * Focus management utilities
 */

import { nextTick } from 'vue';

/**
 * Safely execute a function with animation frame and nextTick
 * Useful for focus operations and DOM updates
 * @param {Function} fn - Function to execute
 */
export function safeFocus(fn) {
  requestAnimationFrame(() => {
    nextTick(() => {
      if (typeof fn === 'function') {
        fn();
      }
    });
  });
}

