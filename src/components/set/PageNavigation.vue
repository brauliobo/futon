<!-- src/components/set/PageNavigation.vue -->
<template lang="pug">
  div(class="flex items-center justify-between gap-3 pt-2")
    button(
      @click="$emit('prev')"
      :disabled="!canGoPrev"
      class="flex items-center gap-2 rounded-2xl border-2 border-black/10 bg-white px-5 py-3 text-base font-bold text-kid-text shadow-sm transition hover:border-kid-blue/40 hover:text-kid-blue disabled:opacity-30 disabled:cursor-not-allowed"
      aria-label="Previous page"
    ) ← {{ $t('previous') }}
    button(
      @click="$emit('next')"
      :disabled="!canGoNext"
      class="flex items-center gap-2 rounded-2xl bg-kid-blue px-5 py-3 text-base font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
      aria-label="Next page"
    ) {{ isLastPage ? $t('finish') : $t('next') + ' →' }}
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
};
</script>
