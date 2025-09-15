// src/services/GenericStorage.js
export class GenericStorage {
  constructor(key = 'futon_state_v2') { this.key = key; }

  load() {
    try { 
      const raw = localStorage.getItem(this.key); 
      return raw ? JSON.parse(raw) : null; 
    } catch (_) { 
      return null; 
    }
  }

  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (_) { 
      return false; 
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
      return true;
    } catch (_) {
      return false;
    }
  }
}
