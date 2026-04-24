import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { createI18n } from 'vue-i18n';
import pt from './i18n/pt.yaml';
import en from './i18n/en.yaml';
import { router } from './router';

import './index.css';

const i18n = createI18n({
  locale: 'pt',
  fallbackLocale: 'en',
  messages: {
    pt,
    en,
  },
});

createApp(App).use(createPinia()).use(i18n).use(router).mount('#app');

