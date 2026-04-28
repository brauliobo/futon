import { createI18n } from 'vue-i18n';
import pt from './pt.yaml';
import en from './en.yaml';

export const i18n = createI18n({
  locale: 'pt',
  fallbackLocale: 'en',
  messages: { pt, en },
});

export function currentLocale() {
  const l = i18n.global.locale;
  return typeof l === 'string' ? l : l.value;
}
