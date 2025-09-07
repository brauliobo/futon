<template>
  <div class="card h-100">
    <div class="card-body d-flex flex-column">
      <h5 class="card-title">{{ workbook.title }}</h5>
      <p class="mb-1">{{ $t('level') }}: {{ workbook.level }}</p>
      <div class="mb-2 d-flex align-items-center gap-2" v-if="workbook.status">
        <span v-if="workbook.status === 'mastery'" class="badge bg-success">○ {{ $t('mastery') || 'Mastery' }}</span>
        <span v-else-if="workbook.status === 'pass'" class="badge bg-warning text-dark">△ {{ $t('pass') || 'Pass' }}</span>
        <span v-else class="badge bg-danger">× {{ $t('retry') || 'Retry' }}</span>
        <span v-if="workbook.gradePercent" class="badge bg-secondary ms-auto">{{ $t('grade') }}: {{ workbook.gradePercent }}%</span>
      </div>
      <div class="mb-2">
        <div class="progress" role="progressbar" :aria-valuenow="progress.percent" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" :style="{ width: progress.percent + '%' }">{{ progress.percent }}%</div>
        </div>
        <small class="text-muted">{{ progress.completed }}/{{ totalPages }} páginas</small>
      </div>
      <p class="mb-2">{{ $t('lastScore') }}: {{ workbook.lastScore }}/{{ workbook.totalExercises }}</p>
      <small v-if="workbook.avgSecondsPerExercise" class="text-muted">⏱ {{ workbook.avgSecondsPerExercise }}s/ex</small>
      <div v-if="workbook.avgSecondsPerExercise" class="mt-1">
        <div class="progress" style="height:4px" role="progressbar" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" :class="speedGaugeClass" :style="{ width: speedGaugeWidth + '%' }"></div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2 mt-auto">
        <span v-if="workbook.completed" class="badge bg-success">{{ $t('completed') }}</span>
        <span v-if="workbook.comingSoon" class="badge bg-warning text-dark">{{ $t('comingSoon') }}</span>
        <button class="btn btn-primary ms-auto" :disabled="!canStart" :class="{ 'opacity-50': !canStart, disabled: !canStart }" @click.prevent="onStart">{{ $t('start') }}</button>
      </div>
    </div>
  </div>
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


