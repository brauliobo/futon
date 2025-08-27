import { createRouter, createWebHistory } from 'vue-router';
import App from '../App.vue';

const routes = [
  { path: '/', name: 'home', component: App },
  { path: '/w/:slug/p/:page?', name: 'workbook', component: App, props: true },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});


