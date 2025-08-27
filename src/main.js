import { createApp } from 'vue';
import App from './App.vue';
import { createI18n } from 'vue-i18n';
import { pt } from './i18n/pt';

import 'bootstrap/dist/css/bootstrap.min.css';

const i18n = createI18n({
  locale: 'pt', // idioma padrão
  fallbackLocale: 'pt',
  messages: {
    pt,
  },
});

createApp(App).use(i18n).mount('#app');

