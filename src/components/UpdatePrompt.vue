<template lang="pug">
  div(v-if="needRefresh" class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border theme-border bg-kid-surface px-4 py-3 shadow-lg animate-slide-up")
    span(class="text-xl") 🔄
    span(class="text-sm font-bold text-kid-text") {{ $t('updateAvailable') || 'Nova versão disponível' }}
    button(@click="applyUpdate" class="rounded-xl bg-kid-blue px-3 py-1.5 text-sm font-black text-white shadow-sm hover:bg-kid-blue/90 active:scale-95 transition") {{ $t('update') || 'Atualizar' }}
</template>

<script>
import { registerSW } from 'virtual:pwa-register';

export default {
  name: 'UpdatePrompt',
  data() {
    return {
      needRefresh: false,
      updateSW: null,
      updateCheckInterval: null,
    };
  },
  mounted() {
    this.updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => { this.needRefresh = true; },
      onOfflineReady: () => {},
      onRegisteredSW: (swUrl, registration) => {
        this.checkForLatestVersion(swUrl, registration);
        this.updateCheckInterval = window.setInterval(() => {
          this.checkForLatestVersion(swUrl, registration);
        }, 60 * 60 * 1000);
      },
    });
  },
  beforeUnmount() {
    if (this.updateCheckInterval) window.clearInterval(this.updateCheckInterval);
  },
  methods: {
    applyUpdate() { this.updateSW?.(true); },
    async checkForLatestVersion(swUrl, registration) {
      if (!registration || !navigator.onLine) return;

      try {
        const response = await fetch(swUrl, {
          cache: 'no-store',
          headers: { 'cache-control': 'no-cache' },
        });

        if (response.ok) await registration.update();
      } catch (error) {
        console.debug('Service worker update check failed:', error);
      }
    },
  },
};
</script>
