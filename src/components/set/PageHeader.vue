<!-- src/components/set/PageHeader.vue -->
<template lang="pug">
  div(class="space-y-2")
    div(class="flex items-center justify-between gap-3")
      div(v-if="totalPages <= 6" class="flex items-center gap-1.5" :aria-label="pageAriaLabel")
        span(
          v-for="n in totalPages"
          :key="n"
          :class="dotClass(n)"
          aria-hidden="true"
        )
      div(v-else class="inline-flex items-center gap-1.5 rounded-full border theme-border surface-2 px-3 py-1 text-sm font-bold" :aria-label="pageAriaLabel")
        span(aria-hidden="true") 📖
        span(class="text-kid-blue tabular-nums") {{ pageNumber }}
        span(class="text-kid-muted") /
        span(class="text-kid-muted tabular-nums") {{ totalPages }}
      div(:class="['set-timer', pace && `set-timer--${pace}`]")
        span(class="text-base" aria-hidden="true") ⏱
        span(class="text-lg font-black tabular-nums" :aria-label="timerAriaLabel") {{ timer }}
    div(v-if="exercisesOnPage > 0" class="space-y-1.5")
      div(class="flex items-center justify-between text-base font-bold")
        span
          span(class="text-kid-text tabular-nums") {{ answeredOnPage }}
          span(class="text-kid-muted")  / {{ exercisesOnPage }}
        span(v-if="isComplete" class="text-kid-green animate-pop-in") ✓ {{ $t('done') || 'Done' }}
        span(v-else-if="answeredOnPage > 0" class="text-kid-blue tabular-nums") {{ percentLabel }}
      div(class="h-3 rounded-full theme-track overflow-hidden relative" role="progressbar" :aria-label="progressAriaLabel" :aria-valuenow="answeredOnPage" :aria-valuemax="exercisesOnPage")
        div(:class="['progress-fill', isComplete ? 'progress-fill--complete' : 'progress-fill--active']" :style="{ width: barWidth }")
          div(v-if="answeredOnPage > 0 && !isComplete" class="absolute inset-0 progress-shimmer" aria-hidden="true")
    span.sr-only(aria-live="assertive") {{ liveAnnouncement }}
</template>

<script>
export default {
  name: "PageHeader",
  props: {
    pageNumber: { type: Number, required: true },
    totalPages: { type: Number, required: true },
    timer: { type: String, required: true },
    progress: { type: Number, required: true },
    answeredOnPage: { type: Number, default: 0 },
    exercisesOnPage: { type: Number, default: 0 },
    pace: { type: String, default: '' },
  },
  data() { return { liveAnnouncement: '' }; },
  computed: {
    isComplete() { return this.exercisesOnPage > 0 && this.answeredOnPage >= this.exercisesOnPage; },
    percent() {
      if (!this.exercisesOnPage) return 0;
      return Math.min(100, Math.round((this.answeredOnPage / this.exercisesOnPage) * 100));
    },
    barWidth() { return `${this.percent}%`; },
    percentLabel() { return `${this.percent}%`; },
    pageAriaLabel() {
      return `${this.$t('pageInfo_before') || 'Page '}${this.pageNumber}${this.$t('pageInfo_after') || ' of '}${this.totalPages}`;
    },
    timerAriaLabel() { return `${this.$t('elapsedTime') || 'Time elapsed'} ${this.timer}`; },
    progressAriaLabel() { return this.$t('pageProgress') || 'Page progress'; },
  },
  watch: {
    isComplete(v) {
      if (!v) return;
      this.liveAnnouncement = this.$t('pageComplete') || 'Page complete';
      navigator.vibrate?.([20, 40, 20]);
    },
  },
  methods: {
    dotClass(n) {
      const base = 'rounded-full transition-all duration-300';
      if (n < this.pageNumber) return `${base} w-3.5 h-3.5 bg-kid-green shadow-sm`;
      if (n === this.pageNumber) return `${base} w-5 h-5 bg-kid-blue blue-glow animate-dot-pulse`;
      return `${base} w-3 h-3 theme-track`;
    },
  },
};
</script>
