// src/services/ProfileStorage.js
const PROFILES_KEY = 'futon_profiles';
const ACTIVE_KEY = 'futon_active_profile';

export const AVATARS = ['🐶', '🐱', '🐻', '🦊', '🐼', '🐨', '🐸', '🦁', '🐯', '🐺', '🦋', '🐬'];

export class ProfileStorage {
  static getProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch { return []; }
  }

  static saveProfiles(profiles) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  static getActiveProfileId() {
    return localStorage.getItem(ACTIVE_KEY) || null;
  }

  static setActiveProfileId(id) {
    localStorage.setItem(ACTIVE_KEY, id);
  }

  static getActiveProfile() {
    const id = this.getActiveProfileId();
    if (!id) return null;
    return this.getProfiles().find(p => p.id === id) || null;
  }

  static createProfile(name, avatar = null) {
    const profiles = this.getProfiles();
    const id = `profile_${Date.now()}`;
    const chosen = avatar || AVATARS[profiles.length % AVATARS.length];
    const profile = { id, name: name.trim(), avatar: chosen, createdAt: Date.now() };
    profiles.push(profile);
    this.saveProfiles(profiles);
    return profile;
  }

  static deleteProfile(id) {
    const profiles = this.getProfiles().filter(p => p.id !== id);
    this.saveProfiles(profiles);
    localStorage.removeItem(`futon_state_${id}`);
    if (this.getActiveProfileId() === id) localStorage.removeItem(ACTIVE_KEY);
  }

  static storageKeyFor(profileId) {
    // Backward-compatible: the original default profile uses 'futon_state_v2'
    return profileId === 'default' ? 'futon_state_v2' : `futon_state_${profileId}`;
  }
}
