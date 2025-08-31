import { createRouter, createWebHistory } from 'vue-router';
import App from '../App.vue';

const routes = [
  { path: '/', name: 'home', component: App },
  { path: '/w/:slug/p/:page?', name: 'workbook', component: App, props: true },
];

export const router = createRouter({
  history: createWebHistory(typeof window !== 'undefined' && window.location.pathname.startsWith('/futon') ? '/futon/' : import.meta.env.BASE_URL),
  routes,
});


