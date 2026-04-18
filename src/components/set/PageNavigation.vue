<!-- src/components/set/PageNavigation.vue -->
<template lang="pug">
  div(class="flex items-center justify-between gap-3 pt-2")
    button(@click="$emit('prev')" :disabled="!canGoPrev" class="btn-ghost" aria-label="Previous page")
      | ← {{ $t('previous') }}
    button(@click="handleNext" :disabled="isDisabled" :class="nextClass" aria-label="Next page")
      | {{ nextLabel }}
</template>

<script>
export default {
  name: "PageNavigation",
  props: {
    canGoPrev: { type: Boolean, default: false },
    canGoNext: { type: Boolean, default: false },
    isLastPage: { type: Boolean, default: false },
    remaining: { type: Number, default: 0 },
  },
  emits: ['prev', 'next', 'focus-remaining'],
  computed: {
    isRemaining() { return !this.canGoNext && this.remaining > 0; },
    isDisabled() { return !this.canGoNext && !this.isRemaining; },
    nextClass() {
      if (this.isRemaining) return 'btn-remaining';
      const c = this.isLastPage ? 'btn-success' : 'btn-primary';
      return this.canGoNext ? `${c} animate-ready-pulse` : c;
    },
    nextLabel() {
      if (this.isRemaining) return `✏️ ${this.$t('remaining') || 'Falta'} ${this.remaining} →`;
      return this.isLastPage ? `✨ ${this.$t('finish')}` : `${this.$t('next')} →`;
    },
  },
  methods: {
    handleNext() {
      if (this.isRemaining) { this.$emit('focus-remaining'); return; }
      this.$emit('next');
    },
  },
};
</script>
