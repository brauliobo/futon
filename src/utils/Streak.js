export class Streak {
  static todayKey() { return new Date().toISOString().slice(0, 10); }

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
      const key = d.toISOString().slice(0, 10);
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
