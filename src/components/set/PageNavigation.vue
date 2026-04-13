<!-- src/components/set/PageNavigation.vue -->
<template lang="pug">
  div(class="flex items-center justify-between gap-3 pt-2")
    button(
      @click="$emit('prev')"
      :disabled="!canGoPrev"
      class="flex items-center gap-2 rounded-2xl border-2 border-black/10 bg-kid-surface px-5 py-3 text-base font-bold text-kid-text shadow-sm transition-all duration-200 hover:border-kid-blue/40 hover:text-kid-blue hover:-translate-x-0.5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-x-0"
      aria-label="Previous page"
    ) ← {{ $t('previous') }}
    button(
      @click="$emit('next')"
      :disabled="!canGoNext"
      :class="nextButtonClass"
      aria-label="Next page"
    ) {{ isLastPage ? '✨ ' + $t('finish') : $t('next') + ' →' }}
</template>

<script>
export default {
  name: "PageNavigation",
  props: {
    canGoPrev: { type: Boolean, default: false },
    canGoNext: { type: Boolean, default: false },
    isLastPage: { type: Boolean, default: false },
  },
  emits: ['prev', 'next'],
  computed: {
    nextButtonClass() {
      const base = 'flex items-center gap-2 rounded-2xl px-5 py-3 text-base font-bold text-white shadow-sm transition-all duration-200 hover:translate-x-0.5 hover:shadow-md active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-x-0';
      if (this.isLastPage) return `${base} bg-kid-green gold-glow`;
      return `${base} bg-kid-blue`;
    },
  },
};
</script>
