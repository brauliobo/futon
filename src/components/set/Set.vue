<!-- src/components/set/Set.vue -->
<template lang="pug">
  .set.mb-4
    // Enhanced Header Section
    .card.shadow-sm
      .card-header.bg-gradient-primary.text-white.py-3
        .row.align-items-center
          .col-md-8
            h2.mb-1.fw-bold {{ workbook.title }}
            small.text-white-75 {{ $t('level') }}: {{ workbook.level }}
          .col-md-4.text-md-end.text-center.mt-2.mt-md-0
            Button(variant="outline-light" size="sm" @click="resetWorkbook") 
              | ↻ {{ $t('reset') }}
      
      // Stats Dashboard
      .card-body.pb-2
        .row.g-3.mb-4
          .col-md-4
            .stat-card.text-center.p-3.bg-light.rounded
              .stat-value.h4.mb-1.text-primary {{ completedPages.length }}
              .stat-label.text-muted.small {{ $t('completedBlocks') }}
          .col-md-4
            .stat-card.text-center.p-3.bg-light.rounded
              .stat-value.h4.mb-1.text-info {{ workbook.attempts }}
              .stat-label.text-muted.small {{ $t('attempts') }}
          .col-md-4
            .stat-card.text-center.p-3.bg-light.rounded
              .stat-value.h4.mb-1.text-success {{ workbook.lastScore }}/{{ workbook.totalExercises }}
              .stat-label.text-muted.small {{ $t('lastScore') }}
        
        // Required Materials Section
        .mb-3(v-if="neededSeries.length")
          .d-flex.align-items-center.mb-2
            span.text-muted.me-2 📚
            small.text-muted.fw-semibold {{ $t('neededWorkbooks') }}:
          .d-flex.flex-wrap.gap-1
            Badge(variant="info" v-for="s in neededSeries" :key="s.id") {{ s.title }}
        // Progress Section
        .progress-section.mb-4(v-if="currentPage")
          .d-flex.justify-content-between.align-items-center.mb-2
            .progress-info
              span.fw-semibold.text-dark {{ pageInfoText }}
              span.text-muted.ms-2 {{ answeredCount }}/{{ (currentPage.exercises || []).length }}
            .timer-display.d-flex.align-items-center
              span.text-muted.me-1 ⏱
              span.fw-bold.text-primary {{ prettyTimer }}
          Progress(:value="pageProgress" show-value height="8px")
        
        .set-content
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
import { levelToSeries, setSeries } from "../../domain/sets.js";

export default {
  name: "Set",
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
      return setSeries.filter(s => ids.includes(s.id));
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
/* Enhanced Header Styles */
.bg-gradient-primary {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
}

.text-white-75 {
  color: rgba(255, 255, 255, 0.75) !important;
}

.card {
  border: none;
  overflow: hidden;
}

.card-header {
  border-bottom: none;
}

/* Stats Cards */
.stat-card {
  background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%) !important;
  border: 1px solid #dee2e6;
  transition: all 0.2s ease;
  cursor: default;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-weight: 700 !important;
}

.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

/* Progress Section */
.progress-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e9ecef;
}

.progress-info span {
  font-size: 0.9rem;
}

.timer-display {
  font-size: 0.85rem;
}

/* Legacy styles - keeping for compatibility */
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .stat-card {
    margin-bottom: 0.5rem;
  }
  
  .progress-section {
    padding: 0.75rem;
  }
}
</style>

