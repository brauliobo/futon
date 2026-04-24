import Dexie from 'dexie';

export const db = new Dexie('FutonDB');
db.version(1).stores({
  progress: 'profileId',
  profiles: '++id, name',
  settings: 'key'
});
