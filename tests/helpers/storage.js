// tests/helpers/storage.js — localStorage utilities for E2E tests

const DEFAULT_PROFILE = { id: 'test_1', name: 'Test', avatar: '🐶', createdAt: 1713000000000 };

/**
 * Clears all futon_* keys and injects a test profile via addInitScript.
 * Must be called BEFORE page.goto().
 */
export async function setupTestProfile(page, profile = DEFAULT_PROFILE) {
  await page.addInitScript((p) => {
    Object.keys(localStorage).filter(k => k.startsWith('futon_')).forEach(k => localStorage.removeItem(k));
    localStorage.setItem('futon_profiles', JSON.stringify([p]));
    localStorage.setItem('futon_active_profile', p.id);
  }, profile);
}

/**
 * Clears all futon_* keys without injecting a profile.
 */
export async function clearFutonStorage(page) {
  await page.addInitScript(() => {
    Object.keys(localStorage).filter(k => k.startsWith('futon_')).forEach(k => localStorage.removeItem(k));
  });
}

/**
 * Injects multiple profiles without setting an active one.
 */
export async function injectProfiles(page, profiles) {
  await page.addInitScript((ps) => {
    Object.keys(localStorage).filter(k => k.startsWith('futon_')).forEach(k => localStorage.removeItem(k));
    localStorage.setItem('futon_profiles', JSON.stringify(ps));
  }, profiles);
}

/**
 * Injects set state into a profile's storage key.
 * Mirrors ProfileStorage.storageKeyFor: 'default' → 'futon_state_v2', else 'futon_state_{id}'
 */
export async function injectSetState(page, profileId, stateData) {
  await page.addInitScript(({ pid, data }) => {
    const key = pid === 'default' ? 'futon_state_v2' : `futon_state_${pid}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    localStorage.setItem(key, JSON.stringify({ ...existing, ...data }));
  }, { pid: profileId, data: stateData });
}

/**
 * Injects a timer start timestamp for speed control in tests.
 */
export async function injectTimerStart(page, profileId, setTitle, startTimestamp) {
  await page.addInitScript(({ pid, title, ts }) => {
    const key = pid === 'default' ? 'futon_state_v2' : `futon_state_${pid}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    if (!existing.timers) existing.timers = {};
    existing.timers[title] = ts;
    localStorage.setItem(key, JSON.stringify(existing));
  }, { pid: profileId, title: setTitle, ts: startTimestamp });
}

export { DEFAULT_PROFILE };
