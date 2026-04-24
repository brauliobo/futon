import { GenericStorage } from './GenericStorage.js';
import { ProfileStorage } from './ProfileStorage.js';
import { IDBStorage } from './IDBStorage.js';

export async function migrateToIDB(profileId) {
  const legacy = new GenericStorage(ProfileStorage.storageKeyFor(profileId));
  const existing = legacy.load();
  if (!existing) return;
  const idb = new IDBStorage(profileId);
  if (await idb.load()) return;
  await idb.save(existing);
}
