<!-- src/components/set/Set.vue -->
<template lang="pug">
  div(class="set mb-2 space-y-4")
    div(class="rounded-3xl border theme-border bg-kid-surface shadow-sm")
      div(class="px-5 py-5")
        div(v-if="currentPage && !isSubmitted" class="space-y-4")
          PageHeader(
            :page-number="currentPage.pageNumber || (currentPageIndex + 1)"
            :total-pages="totalPages || 1"
            :timer="prettyTimer"
            :progress="pageProgress"
          )
          div(class="space-y-3")
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
              :is-last-page="isLastPage"
              @prev="prevPage"
              @next="nextPage"
            )

        div(v-if="isSubmitted" class="space-y-5")
          ResultsCelebration(
            :status="set.status"
            :correct="finalScore"
            :total="attemptedCount"
            :grade-percent="set.gradePercent || 0"
            :has-next-set="hasNextSet"
            @next-set="$emit('next-set')"
          )
          div(class="flex gap-3")
            button(@click="$emit('go-home')" class="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold bg-kid-surface border-2 theme-border-strong text-kid-text hover:border-kid-blue/40 hover:shadow-sm transition-all active:scale-95") ← {{ $t('back') }}
            button(@click="resetSet" class="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold surface-2 border-2 theme-border-strong text-kid-text hover:border-kid-blue/40 hover:shadow-sm transition-all active:scale-95") ↺ {{ $t('restart') }}
          HistorySparkline(v-if="set.history?.length" :history="set.history")
          div(class="border-t theme-border pt-4 space-y-3")
            h4(class="text-sm font-bold text-kid-muted uppercase tracking-wide") {{ $t('reviewAnswers') || 'Review Answers' }}
            ExampleAlert(v-if="set.example" :example="set.example")
            PageComponent(
              v-if="currentPage"
              :key="'page-' + currentPageIndex + '-' + resetKey"
              v-bind="pageProps"
              @update-page-status="handlePageStatus"
            )
          PageNavigation(
            :can-go-prev="currentPageIndex > 0"
            :can-go-next="currentPageIndex < totalPages - 1"
            @prev="prevPage"
            @next="goToPage(currentPageIndex + 1)"
          )
          SpeedGauge(
            :width="speedGaugeWidth"
            :variant="speedGaugeVariant"
            :avg-seconds="set.avgSecondsPerExercise || 0"
            :target="speedTarget"
          )
</template>

<script>
import PageComponent from "./Page.vue";
import HistorySparkline from "./HistorySparkline.vue";
import PageHeader from "./PageHeader.vue";
import PageNavigation from "./PageNavigation.vue";
import ResultsCelebration from "./ResultsCelebration.vue";
import SpeedGauge from "./SpeedGauge.vue";
import ExampleAlert from "./ExampleAlert.vue";
import { Formatter } from "../../utils/Formatter.js";
import { Scoring } from "../../utils/Scoring.js";
import { SpeedGauge as SpeedCalc } from "../../utils/SpeedGauge.js";
import { SetStorage } from "../../services/SetStorage.js";

export default {
  name: "Set",
  components: {
    PageComponent,
    HistorySparkline,
    PageHeader,
    PageNavigation,
    ResultsCelebration,
    SpeedGauge,
    ExampleAlert,
  },
  emits: ['update-set', 'page-changed', 'next-set', 'go-home'],
  props: {
    set: { type: Object, required: true },
    initialPageIndex: { type: Number, default: 0 },
    hasNextSet: { type: Boolean, default: false },
    profileId: { type: String, default: 'default' },
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
      storage: new SetStorage(this.profileId),
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
    pageProgress() { return Formatter.progress(this.currentPageIndex + 1, this.totalPages || 1); },
    pageProps() {
      return {
        page: this.currentPage,
        isSubmitted: this.isSubmitted,
        isReadOnly: this.isSubmitted,
        setInputType: this.set.inputType || 'auto',
      };
    },
    prettyTimer() { return Formatter.timer(this.pageSeconds); },
    passCriteria() { return Scoring.passCriteria(this.set.passCriteria); },
    speedTarget() { return this.passCriteria.maxAvgSecondsPerExercise; },
    speedGaugeWidth() { return SpeedCalc.width(Number(this.set.avgSecondsPerExercise) || 0, this.speedTarget); },
    speedGaugeVariant() { return SpeedCalc.variant(Number(this.set.avgSecondsPerExercise) || 0, this.speedTarget); },
    finalScore() {
      return Scoring.finalScore(this.set.pages || [], (score) => { this.set.lastScore = score; });
    },
    attemptedCount() {
      return Scoring.attemptedCount(this.set.pages || [], this.set.totalExercises);
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
      
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key === 'ArrowRight' || e.key.toLowerCase?.() === 'n') {
        e.preventDefault();
        if (this.canGoNextPage) this.nextPage();
      }
      if (e.key === 'ArrowLeft' || e.key.toLowerCase?.() === 'p') {
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
      
      const gradePercent = Scoring.gradePercent({
        accuracyPercent,
        avgSecondsPerExercise,
        maxAvgSecondsPerExercise: pc.maxAvgSecondsPerExercise,
      });
      
      const status = Scoring.status({
        accuracyPercent,
        avgSecondsPerExercise,
        maxAvgSecondsPerExercise: pc.maxAvgSecondsPerExercise,
        minAccuracyPass: pc.minAccuracyPercent,
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
      this.$emit("update-set", {
        title: this.set.title,
        completedPages: [],
        lastScore: 0,
        attempts: this.set.attempts,
        gradePercent: 0,
        status: '',
      });
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
    window.__futonSet = this;
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


