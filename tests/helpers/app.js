// tests/helpers/app.js — Direct Vue app state manipulation for fast tests

import { PAGE_ACTION_SELECTOR } from './navigation.js';

/**
 * Returns the App component proxy from the live Vue instance.
 */
export async function getAppProxy(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__;
    return !!app?._instance?.proxy;
  });
}

/**
 * Reads all set metadata for the current subject+level.
 */
export async function getVisibleSets(page) {
  return page.evaluate(() => {
    const proxy = document.querySelector('#app').__vue_app__._instance.proxy;
    return proxy.sets.map((s, i) => ({
      index: i, title: s.title, subject: s.subject, level: s.level,
      status: s.status, attempts: s.attempts, totalExercises: s.totalExercises,
      totalPages: s.pages?.length || 0,
    }));
  });
}

/**
 * Sets a specific set's status + attempts directly in Vue state and persists.
 */
/**
 * Injects set status via direct Vue state mutation + save.
 * Caller should reload page after calling this for UI to reflect changes.
 */
export async function injectSetStatus(page, setTitle, status, extra = {}) {
  await page.evaluate(({ title, status, extra }) => {
    const proxy = document.querySelector('#app').__vue_app__._instance.proxy;
    const set = proxy.sets.find(s => s.title === title);
    if (!set) return;
    Object.assign(set, {
      status,
      attempts: extra.attempts ?? 1,
      lastScore: extra.lastScore ?? set.totalExercises ?? 10,
      gradePercent: extra.gradePercent ?? (status === 'mastery' ? 100 : status === 'pass' ? 85 : 40),
      avgSecondsPerExercise: extra.avgSecondsPerExercise ?? 3,
      completed: status === 'mastery' || status === 'pass',
      durationSeconds: 30,
      history: [{ ts: Date.now(), status, accuracyPercent: 100, avgSecondsPerExercise: 3 }],
    });
    proxy.saveSets();
  }, { title, status, extra });
}

/**
 * Sets all sets in a subject+level to mastery except one.
 */
export async function injectAllMasteryExcept(page, subject, level, exceptIndex = 0) {
  await page.evaluate(({ subject, level, exceptIndex }) => {
    const proxy = document.querySelector('#app').__vue_app__._instance.proxy;
    const sets = proxy.sets.filter(s => s.subject === subject && String(s.level).toUpperCase() === level.toUpperCase());
    sets.forEach((set, i) => {
      if (i === exceptIndex) return;
      set.status = 'mastery';
      set.attempts = 1;
      set.lastScore = set.totalExercises;
      set.gradePercent = 100;
      set.avgSecondsPerExercise = 3;
      set.completed = true;
      set.history = [{ ts: Date.now(), status: 'mastery', accuracyPercent: 100 }];
    });
    if (proxy.saveSets) proxy.saveSets();
  }, { subject, level, exceptIndex });
}

/**
 * Injects daily log entries for streak testing.
 */
export async function injectDailyLog(page, dailyLog) {
  await page.evaluate((log) => {
    const proxy = document.querySelector('#app').__vue_app__._instance.proxy;
    const storage = proxy.storage;
    if (!storage) return;
    const data = storage.load() || {};
    data.dailyLog = { ...(data.dailyLog || {}), ...log };
    storage.save(data);
    // Update reactive state
    proxy.streak = 0;
    proxy.todaySets = 0;
    // Recalculate from the imported utils
    const today = new Date().toISOString().slice(0, 10);
    proxy.todaySets = log[today]?.setsCompleted || 0;
    // Count streak
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (log[key]?.setsCompleted > 0) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    proxy.streak = streak;
  }, dailyLog);
}

/**
 * Selects a set and navigates to it programmatically (instant).
 */
export async function selectSetByIndex(page, index) {
  await page.evaluate((idx) => {
    const proxy = document.querySelector('#app').__vue_app__._instance.proxy;
    const set = proxy.sets[idx];
    if (set) proxy.selectSet(set);
  }, index);
  await page.waitForSelector(PAGE_ACTION_SELECTOR, { timeout: 5000 }).catch(() => {});
}
