import { createRouter, createWebHistory } from 'vue-router';
import App from '../App.vue';

const routes = [
  { path: '/', name: 'home', component: App },
  { path: '/s/:slug/p/:page?', name: 'set', component: App, props: true },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});


