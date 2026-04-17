<!-- src/components/set/PageHeader.vue -->
<template lang="pug">
  div(class="space-y-2")
    div(class="flex items-center justify-between gap-3")
      div(v-if="totalPages <= 6" class="flex items-center gap-1.5" :aria-label="`Page ${pageNumber} of ${totalPages}`")
        span(
          v-for="n in totalPages"
          :key="n"
          :class="dotClass(n)"
          aria-hidden="true"
        )
      div(v-else class="flex items-center gap-1.5 text-base font-bold" :aria-label="`Page ${pageNumber} of ${totalPages}`")
        span(class="text-kid-blue tabular-nums") {{ pageNumber }}
        span(class="text-kid-muted") /
        span(class="text-kid-muted tabular-nums") {{ totalPages }}
      div(:class="timerClass")
        span(class="text-base" aria-hidden="true") ⏱
        span(class="text-lg font-black tabular-nums" :aria-label="`Time elapsed ${timer}`") {{ timer }}
    div(v-if="exercisesOnPage > 0" class="space-y-1")
      div(class="flex items-center justify-between text-sm font-bold text-kid-muted")
        span {{ answeredOnPage }} / {{ exercisesOnPage }}
        span(v-if="isComplete" class="text-kid-green animate-pop-in") ✓ {{ $t('done') || 'Done' }}
      div(class="h-2 rounded-full theme-track overflow-hidden relative" role="progressbar" :aria-valuenow="answeredOnPage" :aria-valuemax="exercisesOnPage")
        div(:class="barClass" :style="{ width: barWidth }")
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
    barWidth() {
      if (!this.exercisesOnPage) return '0%';
      return `${Math.min(100, Math.round((this.answeredOnPage / this.exercisesOnPage) * 100))}%`;
    },
    barClass() {
      const base = 'h-full rounded-full transition-all duration-500 ease-out';
      return this.isComplete ? `${base} bg-kid-green green-glow` : `${base} bg-kid-blue`;
    },
    timerClass() {
      const base = 'flex items-center gap-2 rounded-2xl border px-3 py-1.5 transition-colors duration-500 surface-2';
      const tone = { fast: 'border-kid-green/50 text-kid-green', slow: 'border-kid-red/50 text-kid-red' }[this.pace];
      return tone ? `${base} ${tone}` : `${base} theme-border text-kid-text`;
    },
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
