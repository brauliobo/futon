import { createApp } from 'vue';
import App from './App.vue';
import { createI18n } from 'vue-i18n';
import { pt } from './i18n/pt';
import { en } from './i18n/en';
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

createApp(App).use(i18n).use(router).mount('#app');

