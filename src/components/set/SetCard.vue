<template lang="pug">
  div(:class="cardClass")
    div(class="flex items-start justify-between gap-3")
      h5(class="text-lg font-extrabold text-kid-text leading-snug") {{ set.title }}
      div(class="flex items-center gap-1 flex-shrink-0")
        span(v-for="n in 3" :key="n" :class="starClass(n)" class="text-2xl leading-none") ★

    div(class="mt-4 space-y-3")
      div(v-if="hasProgress" class="rounded-2xl border border-kid-blue/15 bg-kid-blue/5 p-4")
        div(class="flex items-center justify-between text-sm font-semibold text-kid-muted mb-2")
          span {{ $t('progress') || 'Progress' }}
          span {{ progress.completed }}/{{ totalPages }} {{ $t('pages') || 'pages' }}
        div(class="h-3 rounded-full bg-black/5 overflow-hidden")
          div(class="h-full rounded-full bg-kid-blue transition-all" :style="{ width: progress.percent + '%' }")

      div(v-else-if="set.attempts > 0" class="grid grid-cols-2 gap-2")
        div(class="rounded-2xl bg-kid-bg border border-black/5 p-3 text-center")
          div(class="text-xs font-semibold text-kid-muted mb-0.5") {{ $t('finalScore') || 'Score' }}
          div(class="text-lg font-black text-kid-text") {{ set.lastScore }}/{{ set.totalExercises }}
        div(v-if="set.avgSecondsPerExercise" class="rounded-2xl bg-kid-bg border border-black/5 p-3 text-center")
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
    hasProgress() { return this.progress.completed > 0 && this.set.status !== 'mastery' && this.set.status !== 'pass' && this.set.status !== 'retry'; },
    starCount() {
      if (this.set.status === 'mastery') return 3;
      if (this.set.status === 'pass') return this.set.avgSecondsPerExercise && this.set.avgSecondsPerExercise <= (this.set.passCriteria?.maxAvgSecondsPerExercise || 8) ? 2 : 1;
      if (this.set.status === 'retry') return 0;
      return 0;
    },
    speedTarget() { return this.set.passCriteria?.maxAvgSecondsPerExercise || 8; },
    speedColor() {
      const s = Number(this.set.avgSecondsPerExercise) || 0;
      if (s <= this.speedTarget) return 'text-kid-green';
      if (s <= this.speedTarget * 1.3) return 'text-amber-500';
      return 'text-kid-red';
    },
    statusBorderColor() {
      if (this.set.status === 'mastery') return 'border-l-kid-green';
      if (this.set.status === 'pass') return 'border-l-amber-400';
      if (this.set.status === 'retry') return 'border-l-kid-red';
      return 'border-l-slate-200';
    },
    cardClass() {
      const base = 'flex h-full flex-col gap-2 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md border-l-4';
      const active = this.isActive ? ' ring-2 ring-kid-blue/40' : '';
      const statusBorder = this.statusBorderColor;
      return `${base} ${statusBorder}${active}`;
    },
    buttonText() { return this.set.attempts > 0 ? this.$t('restart') || 'Try Again' : this.$t('start') || 'Start'; },
    buttonIcon() { return this.set.attempts > 0 ? '↺' : '▶'; },
    actionButtonClass() {
      const base = 'w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-base font-bold transition shadow-sm';
      if (this.set.status === 'mastery') return `${base} bg-kid-green text-white hover:opacity-90`;
      if (this.set.attempts > 0) return `${base} bg-kid-blue text-white hover:opacity-90`;
      return `${base} bg-kid-blue text-white hover:opacity-90`;
    },
  },
  methods: {
    onStart() { this.$emit('start', this.set); },
    starClass(n) { return n <= this.starCount ? 'text-kid-gold' : 'text-slate-200'; },
  }
};
</script>
