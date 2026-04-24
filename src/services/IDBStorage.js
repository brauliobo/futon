import { db } from './FutonDB.js';

export class IDBStorage {
  constructor(profileId = 'default') { this.profileId = profileId; }

  async load() {
    const row = await db.progress.get(this.profileId);
    return row ? JSON.parse(row.data) : null;
  }

  async save(data) {
    await db.progress.put({ profileId: this.profileId, data: JSON.stringify(data) });
  }

  async clear() {
    await db.progress.delete(this.profileId);
  }
}
