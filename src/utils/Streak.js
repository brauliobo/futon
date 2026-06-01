export class Streak {
  static dateKeyFor(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  static todayKey() { return this.dateKeyFor(new Date()); }

  static recordActivity(storage, setsCompleted = 1, durationSeconds = 0) {
    const data = storage.load() || {};
    if (!data.dailyLog) data.dailyLog = {};
    const today = this.todayKey();
    if (!data.dailyLog[today]) data.dailyLog[today] = { setsCompleted: 0, masteryAchieved: 0, totalDurationSeconds: 0 };
    data.dailyLog[today].setsCompleted += setsCompleted;
    data.dailyLog[today].totalDurationSeconds = (data.dailyLog[today].totalDurationSeconds || 0) + durationSeconds;
    storage.save(data);
  }

  static recordMastery(storage) {
    const data = storage.load() || {};
    if (!data.dailyLog) data.dailyLog = {};
    const today = this.todayKey();
    if (!data.dailyLog[today]) data.dailyLog[today] = { setsCompleted: 0, masteryAchieved: 0 };
    data.dailyLog[today].masteryAchieved += 1;
    storage.save(data);
  }

  static calculate(storage) {
    const log = storage.load()?.dailyLog || {};
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = this.dateKeyFor(d);
      if (log[key]?.setsCompleted > 0) streak++;
      else if (i > 0) break;
    }
    return streak;
  }

  static todayCount(storage) {
    return storage.load()?.dailyLog?.[this.todayKey()]?.setsCompleted || 0;
  }

  static todayDuration(storage) {
    return storage.load()?.dailyLog?.[this.todayKey()]?.totalDurationSeconds || 0;
  }
}
