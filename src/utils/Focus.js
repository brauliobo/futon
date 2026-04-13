import { nextTick } from 'vue';

export class Focus {
  static safe(fn) {
    requestAnimationFrame(() => nextTick(() => { if (typeof fn === 'function') fn(); }));
  }
}
