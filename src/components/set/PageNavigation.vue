<!-- src/components/set/PageNavigation.vue -->
<template lang="pug">
  div(class="flex flex-wrap items-center justify-between gap-3 pt-2")
    button(v-if="canGoPrev" @click="$emit('prev')" class="btn-ghost shrink-0" :aria-label="$t('previousPage') || 'Previous page'")
      | ← {{ $t('previous') }}
    button(@click="handleNext" :disabled="isDisabled" :class="[nextClass, 'min-w-0 flex-1 sm:flex-none']" :aria-label="nextAriaLabel")
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
      if (this.isRemaining) return `✏️ ${this.remainingLabel} →`;
      return this.isLastPage ? `✨ ${this.$t('finish')}` : `${this.$t('next')} →`;
    },
    remainingLabel() {
      const key = this.remaining === 1 ? 'remainingOne' : 'remainingMany';
      return this.$t(key, { count: this.remaining });
    },
    nextAriaLabel() {
      if (this.isRemaining) return this.$t('jumpToRemaining') || 'Jump to next unanswered question';
      return this.isLastPage ? (this.$t('finish') || 'Finish') : (this.$t('nextPage') || 'Next page');
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
