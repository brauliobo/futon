// src/utils/streakUtils.js

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function recordActivity(storage, setsCompleted = 1) {
  const data = storage.load() || {};
  if (!data.dailyLog) data.dailyLog = {};
  const today = todayKey();
  if (!data.dailyLog[today]) data.dailyLog[today] = { setsCompleted: 0, masteryAchieved: 0 };
  data.dailyLog[today].setsCompleted += setsCompleted;
  storage.save(data);
}

export function recordMastery(storage) {
  const data = storage.load() || {};
  if (!data.dailyLog) data.dailyLog = {};
  const today = todayKey();
  if (!data.dailyLog[today]) data.dailyLog[today] = { setsCompleted: 0, masteryAchieved: 0 };
  data.dailyLog[today].masteryAchieved += 1;
  storage.save(data);
}

export function calculateStreak(storage) {
  const data = storage.load();
  const log = data?.dailyLog || {};
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (log[key]?.setsCompleted > 0) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export function todayCount(storage) {
  const data = storage.load();
  return data?.dailyLog?.[todayKey()]?.setsCompleted || 0;
}
