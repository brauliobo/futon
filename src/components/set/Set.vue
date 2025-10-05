<!-- src/components/set/Set.vue -->
<template lang="pug">
  div(class="set mb-4")
    div(class="rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl shadow-sky-900/20 backdrop-blur")
      div(class="px-6 py-5")
        div(class="mb-6 flex flex-wrap items-center justify-between gap-3")
          span(class="text-sm font-semibold uppercase tracking-wide text-slate-300") {{ $t('progress') || 'Progress' }}
          Button(variant="outline-secondary" size="sm" @click="resetSet" class="flex items-center gap-1 text-xs")
            span {{ $t('reset') }}
        div(class="mb-8 grid gap-4 md:grid-cols-3")
          div(class="rounded-2xl border border-white/5 bg-slate-900/70 p-5 text-center")
            span(class="text-2xl font-semibold text-sky-300") {{ completedPages.length }}
            span(class="text-xs uppercase tracking-wide text-slate-400") {{ $t('completedBlocks') }}
          div(class="rounded-2xl border border-white/5 bg-slate-900/70 p-5 text-center")
            span(class="text-2xl font-semibold text-sky-200") {{ set.attempts }}
            span(class="text-xs uppercase tracking-wide text-slate-400") {{ $t('attempts') }}
          div(class="rounded-2xl border border-white/5 bg-slate-900/70 p-5 text-center")
            span(class="text-2xl font-semibold text-emerald-300") {{ set.lastScore }}/{{ set.totalExercises }}
            span(class="text-xs uppercase tracking-wide text-slate-400") {{ $t('lastScore') }}
        div(v-if="neededSeries.length" class="space-y-4")
          div(class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400")
            span 📚
            span {{ $t('neededSets') }}:
          div(class="flex flex-wrap gap-2")
            Badge(variant="info" v-for="s in neededSeries" :key="s.id") {{ s.title }}
        div(v-if="currentPage" class="space-y-4")
          div(class="flex flex-wrap items-center justify-between gap-3")
            span(class="text-sm text-slate-300") {{ (currentPage.pageNumber || (currentPageIndex + 1)) }}/{{ totalPages || 1 }}
            div(class="flex items-center gap-2 text-sm font-mono text-sky-200")
              span ⏱
              span {{ prettyTimer }}
          Progress(:value="pageProgress" show-value height="8px")

          div(class="mt-6 space-y-6")
            div(v-if="set.history && set.history.length" class="mt-1")
              HistorySparkline(:history="set.history")
            Alert(variant="info" v-if="set.example")
              strong {{ $t('example') }}:
              |  {{ set.example }}
            Page(v-if="currentPage" :key="'page-' + currentPageIndex + '-' + resetKey" :page="currentPage" :isSubmitted="isSubmitted" @update-page-status="handlePageStatus" :isReadOnly="isSubmitted" :setInputType="set.inputType || 'auto'")
            div(class="flex flex-wrap items-center justify-between gap-3")
              Button(variant="secondary" @click="prevPage" :disabled="currentPageIndex === 0" aria-label="Previous page") {{ $t('previous') }}
              div(class="flex items-center gap-2")
                select(class="h-9 rounded-lg border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500" v-model.number="currentPageIndex" :max="(totalPages || 1) - 1" aria-label="Select page")
                  option(v-for="(p, idx) in pages" :key="'pgopt-'+idx" :value="idx") {{ idx + 1 }}
              Button(variant="secondary" @click="nextPage" :disabled="!canGoNextPage" aria-label="Next page") {{ $t('next') }}
            div(v-if="isSubmitted" class="space-y-4")
              div(class="flex flex-wrap items-center gap-2")
                Badge(variant="success" v-if="set.status === 'mastery'") ○ {{ $t('mastery') || 'Mastery' }}
                Badge(variant="warning" text-dark v-else-if="set.status === 'pass'") △ {{ $t('pass') || 'Pass' }}
                Badge(variant="danger" v-else) × {{ $t('retry') || 'Retry' }}
              div(class="grid gap-3 md:grid-cols-3")
                Stat(:label="$t('finalScore')" :value="`${calculateFinalScore()}/${calculateAttemptedCount()}`")
                Stat(:label="$t('grade')" :value="`${set.gradePercent || 0}%`")
                Stat(:label="$t('speed')" :value="`${set.avgSecondsPerExercise || 0}s/ex`")
              div
                Progress(:value="speedGaugeWidth" :variant="speedGaugeVariant" height="6px")
                small(class="block pt-2 text-xs text-slate-400") {{ $t('speed') + ':' }} {{ set.avgSecondsPerExercise || 0 }}s/ex — {{ $t('target') + ' ≤ ' + speedTarget + 's/ex' }}
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
    };
  },
  computed: {
    pages() { return this.set.pages || []; },
    totalPages() { return this.pages.length; },
    currentPage() {
      return this.pages[this.currentPageIndex] || this.pages[0] || { pageNumber: 1, exercises: [] };
    },
    neededSeries() {
      const key = `${String(this.set.subject || '').toLowerCase()}-${String(this.set.level || '').toUpperCase()}`;
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
  },
  methods: {
    startTimer() {
      if (this.intervalId) clearInterval(this.intervalId);
      this.pageSeconds = 0;
      this.intervalId = setInterval(() => { this.pageSeconds += 1; }, 1000);
    },
    persistProgress() {
      this.$emit("update-set", { title: this.set.title, completedPages: this.completedPages, attempts: this.set.attempts, lastScore: this.set.lastScore });
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
      const total = this.set.totalExercises || attempted;
      const avgSecondsPerExercise = total ? +(elapsed / total).toFixed(2) : 0;
      const defaults = { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 6 };
      const pc = { ...defaults, ...(this.set.passCriteria || {}) };
      const meetsAccuracy = accuracyPercent >= pc.minAccuracyPercent;
      const meetsSpeed = avgSecondsPerExercise <= pc.maxAvgSecondsPerExercise;
      const completed = !!(meetsAccuracy && meetsSpeed);
      const gradePercent = computeGradePercent({ accuracyPercent, avgSecondsPerExercise, maxAvgSecondsPerExercise: pc.maxAvgSecondsPerExercise });
      const status = computeStatus({ accuracyPercent, avgSecondsPerExercise, maxAvgSecondsPerExercise: pc.maxAvgSecondsPerExercise, minAccuracyPass: 95 });
      const historyEntry = { ts: endTs, correct, attempted, accuracyPercent, avgSecondsPerExercise, durationSeconds: elapsed, gradePercent, status, completed };
      this.updateSetData({ completed, durationSeconds: elapsed, avgSecondsPerExercise, gradePercent, status, historyEntry });
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
      this.resetKey += 1;
      this.updateSetData({ gradePercent: 0, status: '' });
    },
    calculateFinalScore() {
      const normalize = (s) => String(s).replace(/\s+/g, '').replace(/,/, '.').toLowerCase();
      let correctCount = 0;
      this.set.pages.forEach(page => {
        page.exercises.forEach(ex => {
          const userAns = ex.answer ?? '';
          if (typeof ex.correctAnswer === 'number') {
            if (Number(userAns) === ex.correctAnswer) correctCount += 1;
          } else if (normalize(userAns) === normalize(ex.correctAnswer)) {
            correctCount += 1;
          }
        });
      });
      this.set.lastScore = correctCount;
      return correctCount;
    },
    calculateAttemptedCount() {
      let attempted = 0;
      this.set.pages.forEach(page => {
        page.exercises.forEach(ex => {
          const userAns = ex.answer ?? '';
          if (String(userAns).trim() !== '') attempted += 1;
        });
      });
      return attempted || this.set.totalExercises;
    },
    updateSetData(extra = {}) {
      // Emitir um evento para o componente pai atualizar o estado global
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


