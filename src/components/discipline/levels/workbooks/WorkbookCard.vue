<template>
  <div class="card h-100">
    <div class="card-body d-flex flex-column">
      <h5 class="card-title">{{ workbook.title }}</h5>
      <p class="mb-1">{{ $t('level') }}: {{ workbook.level }}</p>
      <div class="mb-2">
        <div class="progress" role="progressbar" :aria-valuenow="progress.percent" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" :style="{ width: progress.percent + '%' }">{{ progress.percent }}%</div>
        </div>
        <small class="text-muted">{{ progress.completed }}/{{ totalPages }} páginas</small>
      </div>
      <p class="mb-3">{{ $t('lastScore') }}: {{ workbook.lastScore }}/{{ workbook.totalExercises }}</p>
      <div class="d-flex align-items-center gap-2 mt-auto">
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


