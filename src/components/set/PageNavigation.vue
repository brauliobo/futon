<!-- src/components/set/PageNavigation.vue -->
<template lang="pug">
  div(class="flex items-center justify-between gap-3 pt-2")
    button(@click="$emit('prev')" :disabled="!canGoPrev" class="btn-ghost" aria-label="Previous page")
      | ← {{ $t('previous') }}
    button(@click="$emit('next')" :disabled="!canGoNext" :class="nextClass" aria-label="Next page")
      | {{ isLastPage ? '✨ ' + $t('finish') : $t('next') + ' →' }}
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
    nextClass() {
      const c = this.isLastPage ? 'btn-success' : 'btn-primary';
      return this.canGoNext ? `${c} animate-ready-pulse` : c;
    },
  },
};
</script>
