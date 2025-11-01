<!-- src/components/set/Set.vue -->
<template lang="pug">
  div(class="set mb-2")
    div(class="rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl shadow-sky-900/20 backdrop-blur")
      div(class="px-6 py-4")
        div(v-if="currentPage && !isSubmitted" class="space-y-3")
          PageHeader(
            :page-number="currentPage.pageNumber || (currentPageIndex + 1)"
            :total-pages="totalPages || 1"
            :timer="prettyTimer"
            :progress="pageProgress"
          )
          
          div(class="space-y-4")
            ExampleAlert(v-if="set.example" :example="set.example")
            PageComponent(
              v-if="currentPage"
              :key="'page-' + currentPageIndex + '-' + resetKey"
              v-bind="pageProps"
              @update-page-status="handlePageStatus"
            )
            
            PageNavigation(
              :can-go-prev="currentPageIndex > 0"
              :can-go-next="canGoNextPage"
              @prev="prevPage"
              @next="nextPage"
            )
        
        div(v-if="isSubmitted" class="space-y-6")
          div(class="space-y-4")
            HistorySparkline(v-if="set.history?.length" :history="set.history")
            ExampleAlert(v-if="set.example" :example="set.example")
            PageComponent(
              v-if="currentPage"
              :key="'page-' + currentPageIndex + '-' + resetKey"
              v-bind="pageProps"
              @update-page-status="handlePageStatus"
            )
          
          div(class="border-t border-white/10 pt-4 mt-6 space-y-4")
            ResultsHeader(:status="set.status" @reset="resetSet")
            
            StatsGrid(
              :completed-pages="completedPages.length"
              :attempts="set.attempts"
              :last-score="set.lastScore"
              :total-exercises="set.totalExercises"
            )
            
            ScoreStats(
              :final-score="`${finalScore}/${attemptedCount}`"
              :grade="`${set.gradePercent || 0}%`"
              :speed="`${set.avgSecondsPerExercise || 0}s/ex`"
            )
            
            SpeedGauge(
              :width="speedGaugeWidth"
              :variant="speedGaugeVariant"
              :avg-seconds="set.avgSecondsPerExercise || 0"
              :target="speedTarget"
            )
            
            NeededSeries(:series="neededSeries")
</template>

<script>
import PageComponent from "./Page.vue";
import HistorySparkline from "./HistorySparkline.vue";
import PageHeader from "./PageHeader.vue";
import PageNavigation from "./PageNavigation.vue";
import ResultsHeader from "./ResultsHeader.vue";
import StatsGrid from "./StatsGrid.vue";
import ScoreStats from "./ScoreStats.vue";
import SpeedGauge from "./SpeedGauge.vue";
import NeededSeries from "./NeededSeries.vue";
import ExampleAlert from "./ExampleAlert.vue";
import { computeGradePercent, computeStatus } from "../../domain/scoring.js";
import { levelToSeries, setSeries } from "../../domain/sets.js";
import { formatTimer, calculateProgress } from "../../utils/formatting.js";
import { calculateFinalScore as calcFinalScore, calculateAttemptedCount as calcAttemptedCount, getPassCriteria } from "../../utils/scoringHelpers.js";
import { createLevelSeriesKey } from "../../utils/exerciseHelpers.js";
import { SetStorage } from "../../services/SetStorage.js";

export default {
  name: "Set",
  components: {
    PageComponent,
    HistorySparkline,
    PageHeader,
    PageNavigation,
    ResultsHeader,
    StatsGrid,
    ScoreStats,
    SpeedGauge,
    NeededSeries,
    ExampleAlert,
  },
  props: {
    set: {
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
      storage: new SetStorage(),
    };
  },
  computed: {
    pages() { return this.set.pages || []; },
    totalPages() { return this.pages.length; },
    currentPage() {
      return this.pages[this.currentPageIndex] || this.pages[0] || { pageNumber: 1, exercises: [] };
    },
    isLastPage() { return this.currentPageIndex === this.totalPages - 1; },
    canGoNextPage() { return this.isPageCompleted(this.currentPageIndex); },
    pageProgress() { return calculateProgress(this.currentPageIndex + 1, this.totalPages || 1); },
    pageProps() {
      return {
        page: this.currentPage,
        isSubmitted: this.isSubmitted,
        isReadOnly: this.isSubmitted,
        setInputType: this.set.inputType || 'auto',
      };
    },
    prettyTimer() { return formatTimer(this.pageSeconds); },
    passCriteria() { return getPassCriteria(this.set.passCriteria); },
    speedTarget() { return this.passCriteria.maxAvgSecondsPerExercise; },
    speedGaugeWidth() {
      const s = Number(this.set.avgSecondsPerExercise) || 0;
      const maxS = this.speedTarget;
      return Math.round(Math.max(0, Math.min(100, 100 * (1 - s / (maxS * 2)))));
    },
    speedGaugeVariant() {
      const s = Number(this.set.avgSecondsPerExercise) || 0;
      const maxS = this.speedTarget;
      if (s <= maxS) return 'success';
      if (s <= maxS * 1.2) return 'warning';
      return 'danger';
    },
    finalScore() {
      return calcFinalScore(this.set.pages || [], (score) => { this.set.lastScore = score; });
    },
    attemptedCount() {
      return calcAttemptedCount(this.set.pages || [], this.set.totalExercises);
    },
    neededSeries() {
      const key = createLevelSeriesKey(this.set.subject, this.set.level);
      const ids = levelToSeries[key] || [];
      return setSeries.filter(s => ids.includes(s.id));
    },
  },
  methods: {
    // Timer management
    restoreSetTimer() {
      const setTitle = this.set.title || 'default';
      const stored = this.storage.getTimer(setTitle);
      this.startedAt = stored ? parseInt(stored, 10) : Date.now();
      if (!stored) {
        this.storage.setTimer(setTitle, this.startedAt);
      }
    },
    clearTimerStorage() {
      const setTitle = this.set.title || 'default';
      this.storage.removeTimer(setTitle);
    },
    startTimer() {
      if (this.intervalId) clearInterval(this.intervalId);
      this.restoreSetTimer();
      this.intervalId = setInterval(() => {
        if (this.startedAt) {
          const elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
          this.pageSeconds = elapsed;
        } else {
          this.pageSeconds += 1;
        }
      }, 1000);
    },
    
    // Page navigation
    clampIndex(idx) {
      return Math.max(0, Math.min(idx, (this.totalPages || 1) - 1));
    },
    goToPage(idx) {
      const clamped = this.clampIndex(idx);
      if (clamped === this.currentPageIndex) return;
      this.currentPageIndex = clamped;
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
      if (this.currentPageIndex > 0) {
        this.goToPage(this.currentPageIndex - 1);
      }
    },
    isPageCompleted(index) {
      const page = this.pages[index] || this.pages[0] || { exercises: [] };
      return page.exercises.every(ex => String(ex.answer || '').trim() !== '');
    },
    handlePageStatus(payload) {
      const { pageNumber, isCompleted, answeredCount } = payload;
      this.answeredCount = answeredCount ?? this.answeredCount;
      
      const wasCompleted = this.completedPages.includes(pageNumber);
      if (isCompleted && !wasCompleted) {
        this.completedPages.push(pageNumber);
      } else if (!isCompleted && wasCompleted) {
        const idx = this.completedPages.indexOf(pageNumber);
        this.completedPages.splice(idx, 1);
      }
      
      this.persistProgress();
      
      // Auto-advance when finishing a page
      if (isCompleted && !wasCompleted && pageNumber - 1 === this.currentPageIndex && !this.isSubmitted) {
        if (this.isLastPage) {
          this.submitAnswers();
        } else {
          this.nextPage();
        }
      }
    },
    
    // Keyboard navigation
    onKeydown(e) {
      if (this.isSubmitted) return;
      
      if (e.key === 'ArrowRight' || (e.key.toLowerCase?.() === 'n' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        if (this.canGoNextPage) this.nextPage();
      }
      if (e.key === 'ArrowLeft' || (e.key.toLowerCase?.() === 'p' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        this.prevPage();
      }
    },
    
    // Progress persistence
    persistProgress() {
      this.$emit("update-set", {
        title: this.set.title,
        completedPages: this.completedPages,
        attempts: this.set.attempts,
        lastScore: this.set.lastScore,
      });
    },
    
    // Submission & scoring
    submitAnswers() {
      this.isSubmitted = true;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      const correct = this.finalScore;
      const attempted = this.attemptedCount;
      const accuracyPercent = attempted ? Math.round((correct / attempted) * 100) : 0;
      const endTs = Date.now();
      
      // Restore startedAt if not set (HMR recovery)
      if (!this.startedAt) {
        this.restoreSetTimer();
      }
      
      const elapsed = this.startedAt ? Math.round((endTs - this.startedAt) / 1000) : 0;
      const total = this.set.totalExercises || attempted;
      const avgSecondsPerExercise = total ? +(elapsed / total).toFixed(2) : 0;
      const pc = this.passCriteria;
      
      const meetsAccuracy = accuracyPercent >= pc.minAccuracyPercent;
      const meetsSpeed = avgSecondsPerExercise <= pc.maxAvgSecondsPerExercise;
      const completed = !!(meetsAccuracy && meetsSpeed);
      
      const gradePercent = computeGradePercent({
        accuracyPercent,
        avgSecondsPerExercise,
        maxAvgSecondsPerExercise: pc.maxAvgSecondsPerExercise,
      });
      
      const status = computeStatus({
        accuracyPercent,
        avgSecondsPerExercise,
        maxAvgSecondsPerExercise: pc.maxAvgSecondsPerExercise,
        minAccuracyPass: 95,
      });
      
      const historyEntry = {
        ts: endTs,
        correct,
        attempted,
        accuracyPercent,
        avgSecondsPerExercise,
        durationSeconds: elapsed,
        gradePercent,
        status,
        completed,
      };
      
      this.updateSetData({
        completed,
        durationSeconds: elapsed,
        avgSecondsPerExercise,
        gradePercent,
        status,
        historyEntry,
      });
      
      this.clearTimerStorage();
    },
    resetSet() {
      this.isSubmitted = false;
      this.currentPageIndex = 0;
      this.completedPages = [];
      
      this.pages.forEach(page => {
        page.exercises.forEach(ex => {
          ex.answer = "";
        });
      });
      
      this.clearTimerStorage();
      this.startedAt = Date.now();
      this.pageSeconds = 0;
      
      this.resetKey += 1;
      this.updateSetData({ gradePercent: 0, status: '' });
    },
    updateSetData(extra = {}) {
      this.$emit("update-set", {
        title: this.set.title,
        completedPages: this.completedPages,
        lastScore: this.set.lastScore,
        attempts: this.set.attempts + 1,
        ...extra,
      });
    },
  },
  mounted() {
    this.$emit('page-changed', this.currentPageIndex + 1);
    window.addEventListener('keydown', this.onKeydown);
    this.restoreSetTimer();
    this.startTimer();
  },
  unmounted() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.intervalId) clearInterval(this.intervalId);
  },
  watch: {
    currentPageIndex(newIdx, oldIdx) {
      const clamped = this.clampIndex(newIdx);
      if (clamped !== newIdx) { this.currentPageIndex = clamped; return; }
      if (clamped !== oldIdx) { this.$emit('page-changed', clamped + 1); }
    },
    initialPageIndex(newVal) {
      if (Number.isFinite(newVal)) this.currentPageIndex = this.clampIndex(newVal);
    }
  }
};
</script>


