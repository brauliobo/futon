<!-- src/components/Workbook.vue -->
<template lang="pug">
  .workbook.mb-4
    .card
      .card-body
        h3.card-title {{ workbook.title }} ({{ $t('level') }}: {{ workbook.level }})
        .workbook-status.mb-3
          Stat(:label="$t('completedBlocks')" :value="completedPages.length")
          Stat(:label="$t('attempts')" :value="workbook.attempts")
          Stat(:label="$t('lastScore')" :value="`${workbook.lastScore}/${workbook.totalExercises}`")
        .mb-2(v-if="neededSeries.length")
          small.text-muted {{ $t('neededWorkbooks') }}:
          span.ms-2(v-for="s in neededSeries" :key="s.id")
            Badge(variant="info" text-dark).me-1 {{ s.title }}
        .mb-3.d-flex.justify-content-end
          Button(variant="outline-danger" size="sm" @click="resetWorkbook") {{ $t('reset') }}
        .workbook-content
          .mb-2(v-if="currentPage")
            Progress(:value="pageProgress" show-value)
            small.text-muted {{ pageInfoText }} — {{ answeredCount }}/{{ (currentPage.exercises || []).length }} • ⏱ {{ prettyTimer }}
          .mt-1(v-if="workbook.history && workbook.history.length")
            HistorySparkline(:history="workbook.history")
          Alert(variant="info" v-if="workbook.example")
            strong {{ $t('example') }}:
            |  {{ workbook.example }}
          Page(v-if="currentPage" :key="'page-' + currentPageIndex + '-' + resetKey" :page="currentPage" :isSubmitted="isSubmitted" @update-page-status="handlePageStatus" :isReadOnly="isSubmitted")
          .navigation.d-flex.justify-content-between.align-items-center
            Button(variant="secondary" @click="prevPage" :disabled="currentPageIndex === 0" aria-label="Previous page") {{ $t('previous') }}
            .d-flex.align-items-center.gap-2
              span {{ pageInfoText }}
              select.form-select.form-select-sm(style="width:auto" v-model.number="currentPageIndex" :max="(totalPages || 1) - 1" aria-label="Select page")
                option(v-for="(p, idx) in pages" :key="'pgopt-'+idx" :value="idx") {{ idx + 1 }}
            Button(variant="secondary" @click="nextPage" :disabled="!canGoNextPage" aria-label="Next page") {{ $t('next') }}
          .final-score.mt-3(v-if="isSubmitted")
            .d-flex.align-items-center.gap-2.mb-2
              Badge(variant="success" v-if="workbook.status === 'mastery'") ○ {{ $t('mastery') || 'Mastery' }}
              Badge(variant="warning" text-dark v-else-if="workbook.status === 'pass'") △ {{ $t('pass') || 'Pass' }}
              Badge(variant="danger" v-else) × {{ $t('retry') || 'Retry' }}
            .row.g-2
              .col-12.col-md-4
                Stat(:label="$t('finalScore')" :value="`${calculateFinalScore()}/${calculateAttemptedCount()}`")
              .col-12.col-md-4
                Stat(:label="$t('grade')" :value="`${workbook.gradePercent || 0}%`")
              .col-12.col-md-4
                Stat(:label="$t('speed')" :value="`${workbook.avgSecondsPerExercise || 0}s/ex`")
            .mt-2
              .progress(style="height:6px" role="progressbar" :aria-valuenow="speedGaugeWidth" aria-valuemin="0" aria-valuemax="100")
                .progress-bar(:class="speedGaugeClass" :style="{ width: speedGaugeWidth + '%' }")
              small.text-muted {{ $t('speed') + ':' }} {{ workbook.avgSecondsPerExercise || 0 }}s/ex — {{ $t('target') + ' ≤ ' + speedTarget + 's/ex' }}
</template>

<script>
import Page from "./Page.vue";
import Stat from "./Stat.vue";
import HistorySparkline from "./HistorySparkline.vue";
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import Progress from "../ui/Progress.vue";
import Alert from "../ui/Alert.vue";
import { computeGradePercent, computeStatus } from "../../domain/scoring.js";
import { levelToSeries, workbookSeries } from "../../domain/workbooks.js";

export default {
  name: "Workbook",
  components: {
    Page,
    Stat,
    HistorySparkline,
    Button,
    Badge,
    Progress,
    Alert,
  },
  props: {
    workbook: {
      type: Object,
      required: true,
    },
    initialPageIndex: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      currentPageIndex: this.initialPageIndex,
      completedPages: [],
      isSubmitted: false,
      resetKey: 0,
      answeredCount: 0,
      pageSeconds: 0,
      intervalId: null,
      startedAt: 0,
    };
  },
  computed: {
    pages() { return this.workbook.pages || []; },
    totalPages() { return this.pages.length; },
    currentPage() {
      return this.pages[this.currentPageIndex] || this.pages[0] || { pageNumber: 1, exercises: [] };
    },
    neededSeries() {
      const key = `${String(this.workbook.subject || '').toLowerCase()}-${String(this.workbook.level || '').toUpperCase()}`;
      const ids = levelToSeries[key] || [];
      return workbookSeries.filter(s => ids.includes(s.id));
    },
    pageInfoText() {
      const before = this.$t('pageInfo_before') || '';
      const after = this.$t('pageInfo_after') || '';
      const pageNum = this.currentPage?.pageNumber || 1;
      return `${before}${pageNum}${after}${this.totalPages || 1}`;
    },
    isLastPage() { return this.currentPageIndex === this.totalPages - 1; },
    canGoNextPage() {
      return this.isPageCompleted(this.currentPageIndex);
    },
    pageProgress() {
      const total = this.totalPages || 1;
      return Math.round(((this.currentPageIndex + 1) / total) * 100);
    },
    prettyTimer() {
      const m = Math.floor(this.pageSeconds / 60);
      const s = this.pageSeconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    },
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
    startTimer() {
      if (this.intervalId) clearInterval(this.intervalId);
      this.pageSeconds = 0;
      this.intervalId = setInterval(() => { this.pageSeconds += 1; }, 1000);
    },
    persistProgress() {
      this.$emit("update-workbook", { title: this.workbook.title, completedPages: this.completedPages, attempts: this.workbook.attempts, lastScore: this.workbook.lastScore });
    },
    onKeydown(e) {
      if (this.isSubmitted) return;
      if (e.key === 'ArrowRight' || (e.key.toLowerCase?.() === 'n' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault(); if (this.canGoNextPage) this.nextPage();
      }
      if (e.key === 'ArrowLeft' || (e.key.toLowerCase?.() === 'p' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault(); this.prevPage();
      }
    },
    clampIndex(idx) { return Math.max(0, Math.min(idx, (this.totalPages || 1) - 1)); },
    goToPage(idx) {
      const clamped = this.clampIndex(idx);
      if (clamped === this.currentPageIndex) return;
      this.currentPageIndex = clamped;
      this.startTimer();
    },
    nextPage() {
      if (this.isLastPage) {
        if (this.canGoNextPage && !this.isSubmitted) {
          this.submitAnswers();
        }
      } else if (this.currentPageIndex < this.totalPages - 1) {
        this.goToPage(this.currentPageIndex + 1);
      }
    },
    prevPage() {
      if (this.currentPageIndex > 0) this.goToPage(this.currentPageIndex - 1);
    },
    handlePageStatus(payload) {
      const { pageNumber, isCompleted, answeredCount } = payload;
      this.answeredCount = answeredCount ?? this.answeredCount;
      const idx = this.completedPages.indexOf(pageNumber); // was completed before?
      if (isCompleted && idx === -1) this.completedPages.push(pageNumber);
      if (!isCompleted && idx !== -1) this.completedPages.splice(idx, 1);
      this.persistProgress();
      // auto-advance when finishing a page (not on last page and not submitted)
      if (isCompleted && idx === -1 && pageNumber - 1 === this.currentPageIndex && !this.isSubmitted) {
        if (this.isLastPage) {
          this.submitAnswers();
        } else {
          this.nextPage();
        }
      }
    },
    isPageCompleted(index) {
      const page = this.pages[index] || this.pages[0] || { exercises: [] };
      return page.exercises.every(ex => String(ex.answer || '').trim() !== '');
    },
    submitAnswers() {
      this.isSubmitted = true;
      if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
      const correct = this.calculateFinalScore();
      const attempted = this.calculateAttemptedCount();
      const accuracyPercent = attempted ? Math.round((correct / attempted) * 100) : 0;
      const endTs = Date.now();
      const elapsed = this.startedAt ? Math.round((endTs - this.startedAt) / 1000) : 0;
      const total = this.workbook.totalExercises || attempted;
      const avgSecondsPerExercise = total ? +(elapsed / total).toFixed(2) : 0;
      const defaults = { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 6 };
      const pc = { ...defaults, ...(this.workbook.passCriteria || {}) };
      const meetsAccuracy = accuracyPercent >= pc.minAccuracyPercent;
      const meetsSpeed = avgSecondsPerExercise <= pc.maxAvgSecondsPerExercise;
      const completed = !!(meetsAccuracy && meetsSpeed);
      const gradePercent = computeGradePercent({ accuracyPercent, avgSecondsPerExercise, maxAvgSecondsPerExercise: pc.maxAvgSecondsPerExercise });
      const status = computeStatus({ accuracyPercent, avgSecondsPerExercise, maxAvgSecondsPerExercise: pc.maxAvgSecondsPerExercise, minAccuracyPass: 95 });
      const historyEntry = { ts: endTs, correct, attempted, accuracyPercent, avgSecondsPerExercise, durationSeconds: elapsed, gradePercent, status, completed };
      this.updateWorkbookData({ completed, durationSeconds: elapsed, avgSecondsPerExercise, gradePercent, status, historyEntry });
    },
    resetWorkbook() {
      this.isSubmitted = false;
      this.currentPageIndex = 0;
      this.completedPages = [];
      this.pages.forEach(page => {
        page.exercises.forEach(ex => {
          ex.answer = "";
        });
      });
      this.resetKey += 1;
      this.updateWorkbookData({ gradePercent: 0, status: '' });
    },
    calculateFinalScore() {
      const normalize = (s) => String(s).replace(/\s+/g, '').replace(/,/, '.').toLowerCase();
      let correctCount = 0;
      this.workbook.pages.forEach(page => {
        page.exercises.forEach(ex => {
          const userAns = ex.answer ?? '';
          if (typeof ex.correctAnswer === 'number') {
            if (Number(userAns) === ex.correctAnswer) correctCount += 1;
          } else if (normalize(userAns) === normalize(ex.correctAnswer)) {
            correctCount += 1;
          }
        });
      });
      this.workbook.lastScore = correctCount;
      return correctCount;
    },
    calculateAttemptedCount() {
      let attempted = 0;
      this.workbook.pages.forEach(page => {
        page.exercises.forEach(ex => {
          const userAns = ex.answer ?? '';
          if (String(userAns).trim() !== '') attempted += 1;
        });
      });
      return attempted || this.workbook.totalExercises;
    },
    updateWorkbookData(extra = {}) {
      // Emitir um evento para o componente pai atualizar o estado global
      this.$emit("update-workbook", {
        title: this.workbook.title,
        completedPages: this.completedPages,
        lastScore: this.workbook.lastScore,
        attempts: this.workbook.attempts + 1,
        ...extra,
      });
    },
  },
  mounted() {
    this.$emit('page-changed', this.currentPageIndex + 1);
    window.addEventListener('keydown', this.onKeydown);
    this.startTimer();
    this.startedAt = Date.now();
  },
  unmounted() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.intervalId) clearInterval(this.intervalId);
  },
  watch: {
    currentPageIndex(newIdx, oldIdx) {
      const clamped = this.clampIndex(newIdx);
      if (clamped !== newIdx) { this.currentPageIndex = clamped; return; }
      if (clamped !== oldIdx) { this.$emit('page-changed', clamped + 1); this.startTimer(); }
    },
    initialPageIndex(newVal) {
      if (Number.isFinite(newVal)) this.currentPageIndex = this.clampIndex(newVal);
    }
  }
};
</script>

<style scoped>
.card-title {
  font-size: 1.75rem;
}

.final-score h4 {
  color: #28a745;
}

.submit-section button {
  width: 100%;
}

.workbook-content {
  margin-top: 15px;
}
</style>

