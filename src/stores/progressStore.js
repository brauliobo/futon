import { defineStore } from 'pinia';
import { SetStorage } from '../services/SetStorage.js';

export const useProgressStore = defineStore('progress', () => {
  function storage(profileId) { return new SetStorage(profileId); }

  function load(profileId) { return storage(profileId).load(); }
  function save(profileId, data) { return storage(profileId).save(data); }
  function clear(profileId) { return storage(profileId).clear(); }

  return { load, save, clear };
});
