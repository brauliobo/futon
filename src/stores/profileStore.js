import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ProfileStorage } from '../services/ProfileStorage.js';

export const useProfileStore = defineStore('profile', () => {
  const profiles = ref(ProfileStorage.getProfiles());
  const activeProfileId = ref(ProfileStorage.getActiveProfileId());

  const activeProfile = () => profiles.value.find(p => p.id === activeProfileId.value) || null;

  function loadProfiles() {
    profiles.value = ProfileStorage.getProfiles();
    activeProfileId.value = ProfileStorage.getActiveProfileId();
  }

  function saveProfiles(list) {
    ProfileStorage.saveProfiles(list);
    profiles.value = list;
  }

  function setActive(id) {
    ProfileStorage.setActiveProfileId(id);
    activeProfileId.value = id;
  }

  function createProfile(name, avatar = null) {
    const profile = ProfileStorage.createProfile(name, avatar);
    profiles.value = ProfileStorage.getProfiles();
    return profile;
  }

  function deleteProfile(id) {
    ProfileStorage.deleteProfile(id);
    profiles.value = ProfileStorage.getProfiles();
    if (activeProfileId.value === id) activeProfileId.value = null;
  }

  return { profiles, activeProfileId, activeProfile, loadProfiles, saveProfiles, setActive, createProfile, deleteProfile };
});
