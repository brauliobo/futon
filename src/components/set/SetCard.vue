<template lang="pug">
  div(:class="cardClass")
    div(class="flex items-start justify-between gap-3")
      div(class="space-y-1")
        h5(class="text-lg font-semibold text-slate-100") {{ set.title }}
      div(v-if="set.status")
        Badge(:variant="statusVariant" :class="statusBadgeClass")
          span(class="text-sm") {{ statusIcon }}
          span(class="text-xs uppercase tracking-wide") {{ statusText }}

    div(class="mt-5 space-y-4")
      div(v-if="hasProgress" class="rounded-2xl border border-white/5 bg-slate-900/60 p-4")
        div(class="flex items-center justify-between text-sm text-slate-300")
          span {{ $t('progress') || 'Progresso' }}
          span(class="font-mono") {{ progress.completed }}/{{ totalPages }}
        Progress(:value="progress.percent" show-value height="8px" variant="success" class="mt-3")

      div(v-else-if="set.completed" class="space-y-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4")
        span(class="text-xs font-semibold uppercase tracking-wide text-slate-300") {{ $t('lastResults') || 'Últimos resultados' }}
        div(class="grid gap-3 md:grid-cols-2")
          div(class="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/70 p-3")
            span(class="text-lg") 🎯
            div(class="space-y-1 text-sm")
              span(class="text-slate-400") {{ $t('finalScore') }}
              span(class="font-semibold text-slate-100") {{ set.lastScore }}/{{ set.totalExercises }}
          div(v-if="set.avgSecondsPerExercise" class="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/70 p-3")
            span(class="text-lg") ⏱️
            div(class="space-y-1 text-sm")
              span(class="text-slate-400") {{ $t('speed') }}
              span(class="font-semibold text-slate-100") {{ set.avgSecondsPerExercise }}s/ex

      div(v-else-if="!set.completed && (set.lastScore || set.avgSecondsPerExercise)" class="grid gap-3 md:grid-cols-2")
        div(v-if="set.lastScore" class="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/70 p-3")
          span(class="text-lg") 🎯
          div(class="space-y-1 text-sm")
            span(class="text-slate-400") {{ $t('lastScore') }}
            span(class="font-semibold text-slate-100") {{ set.lastScore }}/{{ set.totalExercises }}
        div(v-if="set.avgSecondsPerExercise" class="flex flex-col gap-2 rounded-xl border border-white/5 bg-slate-900/70 p-3")
          div(class="flex items-start gap-3")
            span(class="text-lg") ⏱️
            div(class="space-y-1 text-sm")
              span(class="text-slate-400") {{ $t('avgTime') || 'Avg Time' }}
              span(class="font-semibold text-slate-100") {{ set.avgSecondsPerExercise }}s/ex
          Progress(:value="speedGaugeWidth" :variant="speedGaugeVariant" height="4px")

      div(v-if="set.gradePercent" class="flex items-center justify-center")
        div(:class="gradeCircleClass")
          span {{ set.gradePercent }}%

    div(class="mt-auto flex items-center justify-between gap-3 pt-4")
      div(class="flex items-center gap-2")
        Badge(variant="success" v-if="set.completed" class="flex items-center gap-1 text-xs")
          CheckCircle(:size="14")
          span {{ $t('completed') }}

      Button(:variant="buttonVariant" @click.prevent="onStart" :class="buttonClass")
        component(:is="buttonIcon" :size="16")
        span {{ buttonText }}
</template>

<script>
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import Progress from "../ui/Progress.vue";
import { Play, RotateCcw, CheckCircle } from 'lucide-vue-next';

export default {
  name: 'SetCard',
  components: {
    Button,
    Badge,
    Progress,
    Play,
    RotateCcw,
    CheckCircle,
  },
  props: {
    set: { type: Object, required: true },
    isActive: { type: Boolean, default: false },
  },
  computed: {
    statusDetails() {
      const statusMap = {
        mastery: { variant: 'success', icon: '⭐', text: this.$t('mastery') || 'Mastery' },
        pass: { variant: 'warning', icon: '✓', text: this.$t('pass') || 'Pass' },
        retry: { variant: 'danger', icon: '↻', text: this.$t('retry') || 'Retry' }
      };
      return statusMap[this.set.status] || statusMap.retry;
    },
    totalPages() { return this.set.pages?.length || 0; },
    progress() {
      const completed = (this.set.completedPages || []).length;
      const percent = this.totalPages ? Math.round((completed / this.totalPages) * 100) : 0;
      return { completed, percent };
    },
    hasProgress() {
      return this.progress.completed > 0 && !this.set.completed;
    },
    speedTarget() {
      const defaults = { maxAvgSecondsPerExercise: 6 };
      const pc = { ...defaults, ...(this.set.passCriteria || {}) };
      return pc.maxAvgSecondsPerExercise;
    },
    speedGaugeWidth() {
      const s = Number(this.set.avgSecondsPerExercise) || 0;
      const maxS = Number(this.speedTarget) || 6;
      const val = Math.max(0, Math.min(100, 100 * (1 - s / (maxS * 2))));
      return Math.round(val);
    },
    speedGaugeVariant() {
      const s = Number(this.set.avgSecondsPerExercise) || 0;
      const maxS = Number(this.speedTarget) || 6;
      if (s <= maxS) return 'success';
      if (s <= maxS * 1.2) return 'warning';
      return 'danger';
    },
    statusVariant() { return this.statusDetails.variant; },
    statusIcon() { return this.statusDetails.icon; },
    statusText() { return this.statusDetails.text; },
    buttonVariant() {
      return this.isActive ? 'success' : 'primary';
    },
    buttonClass() {
      return 'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-md shadow-sky-900/40';
    },
    buttonIcon() {
      return this.set.completed ? 'RotateCcw' : 'Play';
    },
    buttonText() {
      return this.set.completed ? this.$t('restart') || 'Restart' : this.$t('start');
    },
    cardClass() {
      const base = 'flex h-full flex-col gap-4 rounded-2xl border border-white/12 bg-slate-900/70 p-6 shadow-lg transition hover:-translate-y-1 hover:border-sky-400/40 hover:shadow-sky-900/30';
      return this.isActive ? `${base} border-sky-400/50 bg-sky-500/10` : base;
    },
    statusBadgeClass() {
      return 'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold';
    },
    gradeCircleClass() {
      const base = 'flex h-16 w-16 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner shadow-black/40';
      const color = this.getGradeColor(this.set.gradePercent);
      const palette = {
        excellent: 'bg-emerald-500',
        good: 'bg-sky-500',
        average: 'bg-amber-400 text-slate-900',
        poor: 'bg-rose-500',
      };
      return `${base} ${palette[color] || palette.poor}`;
    }
  },
  methods: {
    onStart() {
      this.$emit('start', this.set);
    },
    getGradeColor(grade) {
      if (grade >= 90) return 'excellent';
      if (grade >= 80) return 'good';
      if (grade >= 70) return 'average';
      return 'poor';
    }
  }
};
</script>



