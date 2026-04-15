export const Encourage = {
  message(t, n) { return t(`encourage_${(Number(n) || 0) % 4}`) || 'Almost!'; },
};
