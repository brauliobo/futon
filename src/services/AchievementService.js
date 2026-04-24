const ACHIEVEMENTS = [
  { id: 'first_mastery', icon: '🏆', name: 'Primeira Maestria' },
  { id: 'streak_3',      icon: '🔥', name: '3 Dias Seguidos' },
  { id: 'streak_7',      icon: '🌟', name: '7 Dias Seguidos' },
  { id: 'level_complete',icon: '🎓', name: 'Nível Concluído' },
  { id: 'sets_10',       icon: '⭐', name: '10 Blocos' },
  { id: 'sets_50',       icon: '💎', name: '50 Blocos' },
  { id: 'perfect_set',   icon: '✨', name: 'Bloco Perfeito' },
];

const key = (profileId) => `futon_achievements_${profileId}`;

export class AchievementService {
  static getEarned(profileId) {
    try { return JSON.parse(localStorage.getItem(key(profileId)) || '[]'); } catch { return []; }
  }

  static markEarned(profileId, ids) {
    const earned = [...new Set([...this.getEarned(profileId), ...ids])];
    localStorage.setItem(key(profileId), JSON.stringify(earned));
  }

  static check(profileId, { masteredCount, totalCompleted, streak, accuracy, levelCompleted }) {
    const earned = new Set(this.getEarned(profileId));
    const unlocked = ACHIEVEMENTS.filter(({ id }) => {
      if (earned.has(id)) return false;
      if (id === 'first_mastery')   return masteredCount >= 1;
      if (id === 'streak_3')        return streak >= 3;
      if (id === 'streak_7')        return streak >= 7;
      if (id === 'level_complete')  return levelCompleted;
      if (id === 'sets_10')         return totalCompleted >= 10;
      if (id === 'sets_50')         return totalCompleted >= 50;
      if (id === 'perfect_set')     return accuracy === 100;
      return false;
    });
    if (unlocked.length) this.markEarned(profileId, unlocked.map(a => a.id));
    return unlocked;
  }
}
