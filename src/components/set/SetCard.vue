<template lang="pug">
  div(:class="cardClass")
    div(class="flex items-start justify-between gap-3")
      h5(class="text-lg font-extrabold text-kid-text leading-snug") {{ set.title }}
      div(class="flex items-center gap-0.5 flex-shrink-0")
        span(v-for="n in 3" :key="n" :class="starClass(n)") ★

    div(class="mt-4 space-y-3")
      div(v-if="hasProgress" class="rounded-2xl border border-kid-blue/15 bg-kid-blue/5 p-4")
        div(class="flex items-center justify-between text-sm font-semibold text-kid-muted mb-2")
          span {{ $t('progress') || 'Progress' }}
          span {{ progress.completed }}/{{ totalPages }} {{ $t('pages') || 'pages' }}
        div(class="h-3 rounded-full theme-track overflow-hidden")
          div(class="h-full rounded-full bg-kid-blue transition-all duration-500 shadow-sm" :style="{ width: progress.percent + '%' }")

      div(v-else-if="set.attempts > 0" class="grid grid-cols-2 gap-2")
        div(class="rounded-2xl surface-2 border theme-border p-3 text-center")
          div(class="text-xs font-semibold text-kid-muted mb-0.5") {{ $t('finalScore') || 'Score' }}
          div(class="text-lg font-black text-kid-text") {{ set.lastScore }}/{{ set.totalExercises }}
        div(v-if="set.avgSecondsPerExercise" class="rounded-2xl surface-2 border theme-border p-3 text-center")
          div(class="text-xs font-semibold text-kid-muted mb-0.5") {{ $t('speed') || 'Speed' }}
          div(class="text-lg font-black" :class="speedColor") {{ set.avgSecondsPerExercise }}s

    div(class="mt-auto pt-4")
      button(@click.prevent="onStart" :class="actionButtonClass")
        span {{ buttonIcon }}
        span {{ buttonText }}
</template>

<script>
export default {
  name: 'SetCard',
  props: {
    set: { type: Object, required: true },
    isActive: { type: Boolean, default: false },
  },
  computed: {
    totalPages() { return this.set.pages?.length || 0; },
    progress() {
      const completed = (this.set.completedPages || []).length;
      const percent = this.totalPages ? Math.round((completed / this.totalPages) * 100) : 0;
      return { completed, percent };
    },
    hasProgress() { return this.progress.completed > 0 && !['mastery', 'pass', 'retry'].includes(this.set.status); },
    starCount() {
      if (this.set.status === 'mastery') return 3;
      if (this.set.status === 'pass') return this.set.avgSecondsPerExercise && this.set.avgSecondsPerExercise <= (this.set.passCriteria?.maxAvgSecondsPerExercise || 8) ? 2 : 1;
      return 0;
    },
    speedTarget() { return this.set.passCriteria?.maxAvgSecondsPerExercise || 8; },
    speedColor() {
      const s = Number(this.set.avgSecondsPerExercise) || 0;
      if (s <= this.speedTarget) return 'text-kid-green';
      if (s <= this.speedTarget * 1.3) return 'text-amber-500';
      return 'text-kid-red';
    },
    cardClass() {
      const base = 'flex h-full flex-col gap-2 rounded-2xl border theme-border bg-kid-surface p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg border-l-[6px]';
      const borders = { mastery: 'border-l-kid-green shadow-md green-glow', pass: 'border-l-amber-400 shadow-sm', retry: 'border-l-kid-red shadow-sm' };
      const border = borders[this.set.status] || 'border-l-[color:var(--kid-border-strong)] shadow-sm';
      const ring = this.isActive ? ' ring-2 ring-kid-blue/50 ring-offset-2 ring-offset-theme blue-glow' : '';
      return `${base} ${border}${ring}`;
    },
    buttonText() { return this.set.attempts > 0 ? this.$t('restart') || 'Try Again' : this.$t('start') || 'Start'; },
    buttonIcon() { return this.set.attempts > 0 ? '↺' : '▶'; },
    actionButtonClass() {
      const base = 'w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95';
      if (this.set.status === 'mastery') return `${base} bg-kid-green text-white`;
      return `${base} bg-kid-blue text-white`;
    },
  },
  methods: {
    onStart() { this.$emit('start', this.set); },
    starClass(n) {
      if (n <= this.starCount) return 'text-2xl leading-none text-kid-gold star-glow transition-all';
      return 'text-2xl leading-none theme-star-empty transition-all';
    },
  }
};
</script>
