<template lang="pug">
  Card(height="h-100" :variant="isActive ? 'primary' : ''")
    template(#body)
      h5.card-title {{ workbook.title }}
      p.mb-1 {{ $t('level') }}: {{ workbook.level }}
      .mb-2.d-flex.align-items-center.gap-2(v-if="workbook.status")
        Badge(variant="success" v-if="workbook.status === 'mastery'") ○ {{ $t('mastery') || 'Mastery' }}
        Badge(variant="warning" text-dark v-else-if="workbook.status === 'pass'") △ {{ $t('pass') || 'Pass' }}
        Badge(variant="danger" v-else) × {{ $t('retry') || 'Retry' }}
        Badge(variant="secondary" v-if="workbook.gradePercent").ms-auto {{ $t('grade') }}: {{ workbook.gradePercent }}%
      .mb-2
        Progress(:value="progress.percent" show-value)
        small.text-muted {{ progress.completed }}/{{ totalPages }} páginas
      p.mb-2 {{ $t('lastScore') }}: {{ workbook.lastScore }}/{{ workbook.totalExercises }}
      small.text-muted(v-if="workbook.avgSecondsPerExercise") ⏱ {{ workbook.avgSecondsPerExercise }}s/ex
      .mt-1(v-if="workbook.avgSecondsPerExercise")
        Progress(:value="speedGaugeWidth" :variant="speedGaugeVariant" height="4px")
      .d-flex.align-items-center.gap-2.mt-auto
        Badge(variant="success" v-if="workbook.completed") {{ $t('completed') }}
        Badge(variant="warning" text-dark v-if="workbook.comingSoon") {{ $t('comingSoon') }}
        Button(variant="primary" :disabled="!canStart" :class="{ 'opacity-50': !canStart, disabled: !canStart }" @click.prevent="onStart").ms-auto {{ $t('start') }}
</template>

<script>
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import Progress from "../ui/Progress.vue";
import Card from "../ui/Card.vue";

export default {
  name: 'WorkbookCard',
  components: {
    Button,
    Badge,
    Progress,
    Card,
  },
  props: {
    workbook: { type: Object, required: true },
    isActive: { type: Boolean, default: false },
  },
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
    speedGaugeVariant() {
      const s = Number(this.workbook.avgSecondsPerExercise) || 0;
      const maxS = Number(this.speedTarget) || 6;
      if (s <= maxS) return 'success';
      if (s <= maxS * 1.2) return 'warning';
      return 'danger';
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


