<template lang="pug">
  div(v-if="!isInstalled" class="relative")
    button(v-if="!isDownloading" @click="onClick" :disabled="busy" :aria-label="$t('installApp')" class="flex items-center gap-1.5 rounded-2xl border-2 border-kid-blue bg-kid-blue px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition disabled:opacity-60")
      span(class="text-base" :class="{ 'animate-bounce': isReady }") {{ isReady ? '✓' : '📲' }}
      span(class="hidden sm:inline") {{ isReady ? $t('installApp') : $t('saveOffline') }}
    div(v-else class="flex items-center gap-2 rounded-2xl border-2 border-kid-blue/40 bg-kid-surface px-3 py-1.5 text-sm font-bold text-kid-blue")
      div(class="relative h-6 w-6 shrink-0")
        svg(viewBox="0 0 24 24" class="h-6 w-6 -rotate-90")
          circle(cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="3")
          circle(cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" :stroke-dasharray="circ" :stroke-dashoffset="dashOffset" stroke-linecap="round" class="transition-[stroke-dashoffset] duration-200 ease-out")
        span(class="absolute inset-0 flex items-center justify-center text-[9px] font-black") {{ percent }}
      span(class="hidden sm:inline whitespace-nowrap") {{ $t('downloadingLessons') }}
    div(v-if="showIOSHint" @click.self="showIOSHint = false" class="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-4")
      div(class="relative w-full max-w-sm rounded-3xl border-2 theme-border bg-kid-surface p-5 shadow-xl")
        button(@click="showIOSHint = false" class="absolute right-3 top-2 text-2xl text-kid-muted hover:text-kid-text" :aria-label="$t('close') || 'Close'") ×
        h3(class="mb-2 text-lg font-black text-kid-text") {{ $t('iosInstallTitle') }}
        ol(class="space-y-2 text-sm text-kid-text")
          li
            span(class="font-bold mr-1") 1.
            | {{ $t('iosInstallStep1') }}
            span(class="ml-1") ⎋
          li
            span(class="font-bold mr-1") 2.
            | {{ $t('iosInstallStep2') }}
          li
            span(class="font-bold mr-1") 3.
            | {{ $t('iosInstallStep3') }}
</template>

<script>
const lessonModules = import.meta.glob('../levels/**/*.yaml');

export default {
  name: 'InstallButton',
  data() {
    const mql = window.matchMedia('(display-mode: standalone)');
    const standalone = mql.matches || window.navigator.standalone === true;
    return {
      deferredPrompt: null,
      isInstalled: standalone,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
      isDownloading: false,
      isReady: false,
      busy: false,
      loaded: 0,
      total: Object.keys(lessonModules).length,
      showIOSHint: false,
      circ: 2 * Math.PI * 10,
    };
  },
  computed: {
    progress() { return this.total ? this.loaded / this.total : 0; },
    percent() { return Math.round(this.progress * 100); },
    dashOffset() { return this.circ * (1 - this.progress); },
  },
  methods: {
    onBeforeInstall(e) { e.preventDefault(); this.deferredPrompt = e; },
    onAppInstalled() { this.isInstalled = true; this.deferredPrompt = null; },
    async onClick() {
      if (this.busy) return;
      this.busy = true;
      try {
        if (!this.isReady) await this.downloadLessons();
        if (this.deferredPrompt) {
          const p = this.deferredPrompt;
          this.deferredPrompt = null;
          p.prompt();
          const { outcome } = await p.userChoice;
          if (outcome === 'accepted') this.isInstalled = true;
        } else if (this.isIOS) {
          this.showIOSHint = true;
        }
      } finally {
        this.busy = false;
      }
    },
    async downloadLessons() {
      this.isDownloading = true;
      this.loaded = 0;
      const keys = Object.keys(lessonModules);
      this.total = keys.length;
      let idx = 0;
      const worker = async () => {
        while (idx < keys.length) {
          const k = keys[idx++];
          await lessonModules[k]();
          this.loaded++;
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      this.isDownloading = false;
      this.isReady = true;
    },
  },
  mounted() {
    window.addEventListener('beforeinstallprompt', this.onBeforeInstall);
    window.addEventListener('appinstalled', this.onAppInstalled);
  },
  beforeUnmount() {
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstall);
    window.removeEventListener('appinstalled', this.onAppInstalled);
  },
};
</script>
