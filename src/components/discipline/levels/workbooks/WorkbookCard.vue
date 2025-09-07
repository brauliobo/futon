<template lang="pug">
  .card.h-100
    .card-body.d-flex.flex-column
      h5.card-title {{ workbook.title }}
      p.mb-1 {{ $t('level') }}: {{ workbook.level }}
      .mb-2.d-flex.align-items-center.gap-2(v-if="workbook.status")
        span.badge.bg-success(v-if="workbook.status === 'mastery'") ○ {{ $t('mastery') || 'Mastery' }}
        span.badge.bg-warning.text-dark(v-else-if="workbook.status === 'pass'") △ {{ $t('pass') || 'Pass' }}
        span.badge.bg-danger(v-else) × {{ $t('retry') || 'Retry' }}
        span.badge.bg-secondary.ms-auto(v-if="workbook.gradePercent") {{ $t('grade') }}: {{ workbook.gradePercent }}%
      .mb-2
        .progress(role="progressbar" :aria-valuenow="progress.percent" aria-valuemin="0" aria-valuemax="100")
          .progress-bar(:style="{ width: progress.percent + '%' }") {{ progress.percent }}%
        small.text-muted {{ progress.completed }}/{{ totalPages }} páginas
      p.mb-2 {{ $t('lastScore') }}: {{ workbook.lastScore }}/{{ workbook.totalExercises }}
      small.text-muted(v-if="workbook.avgSecondsPerExercise") ⏱ {{ workbook.avgSecondsPerExercise }}s/ex
      .mt-1(v-if="workbook.avgSecondsPerExercise")
        .progress(style="height:4px" role="progressbar" aria-valuemin="0" aria-valuemax="100")
          .progress-bar(:class="speedGaugeClass" :style="{ width: speedGaugeWidth + '%' }")
      .d-flex.align-items-center.gap-2.mt-auto
        span.badge.bg-success(v-if="workbook.completed") {{ $t('completed') }}
        span.badge.bg-warning.text-dark(v-if="workbook.comingSoon") {{ $t('comingSoon') }}
        button.btn.btn-primary.ms-auto(:disabled="!canStart" :class="{ 'opacity-50': !canStart, disabled: !canStart }" @click.prevent="onStart") {{ $t('start') }}
</template>

<script>
export default {
  name: 'WorkbookCard',
  props: { workbook: { type: Object, required: true } },
  computed: {
    totalPages() { return this.workbook.pages ? this.workbook.pages.length : 0; },
    progress() {
      const completed = (this.workbook.completedPages || []).length;
      const percent = this.totalPages ? Math.round((completed / this.totalPages) * 100) : 0;
      return { completed, percent };
    },
    canStart() { return !this.workbook.comingSoon; },
    speedTarget() {
      const defaults = { maxAvgSecondsPerExercise: 6 };
      const pc = { ...defaults, ...(this.workbook.passCriteria || {}) };
      return pc.maxAvgSecondsPerExercise;
    },
    speedGaugeWidth() {
      const s = Number(this.workbook.avgSecondsPerExercise) || 0;
      const maxS = Number(this.speedTarget) || 6;
      const val = Math.max(0, Math.min(100, 100 * (1 - s / (maxS * 2))));
      return Math.round(val);
    },
    speedGaugeClass() {
      const s = Number(this.workbook.avgSecondsPerExercise) || 0;
      const maxS = Number(this.speedTarget) || 6;
      if (s <= maxS) return 'bg-success';
      if (s <= maxS * 1.2) return 'bg-warning';
      return 'bg-danger';
    },
  },
  methods: {
    onStart() {
      if (!this.canStart) return;
      this.$emit('start', this.workbook);
    }
  }
};
</script>

<style scoped>
</style>


