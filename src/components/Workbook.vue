<!-- src/components/Workbook.vue -->
<template>
  <div class="workbook mb-4">
    <div class="card">
      <div class="card-body">
        <h3 class="card-title">{{ workbook.title }} ({{ $t('level') }}: {{ workbook.level }})</h3>
        <div class="workbook-status mb-3">
          <Stat :label="$t('completedBlocks')" :value="completedPages.length" />
          <Stat :label="$t('attempts')" :value="workbook.attempts" />
          <Stat :label="$t('lastScore')" :value="`${workbook.lastScore}/${workbook.totalExercises}`" />
        </div>
        <div class="mb-3 d-flex justify-content-end">
          <button class="btn btn-outline-danger btn-sm" @click="resetWorkbook">{{ $t('reset') }}</button>
        </div>
        <div class="workbook-content">
          <div class="mb-2">
            <div class="progress" role="progressbar" :aria-valuenow="pageProgress" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-bar" :style="{ width: pageProgress + '%' }">{{ pageProgress }}%</div>
            </div>
            <small class="text-muted">{{ pageInfoText }} — {{ answeredCount }}/{{ currentPage.exercises.length }} • ⏱ {{ prettyTimer }}</small>
          </div>
          <div class="alert alert-info" role="alert" v-if="workbook.example">
            <strong>{{ $t('example') }}:</strong> {{ workbook.example }}
          </div>
          <Page
            :key="resetKey"
            :page="currentPage"
            :isSubmitted="isSubmitted"
            @update-page-status="handlePageStatus"
            :isReadOnly="isSubmitted"
          />
          <div class="navigation d-flex justify-content-between align-items-center">
            <button class="btn btn-secondary" @click="prevPage" :disabled="currentPageIndex === 0" aria-label="Previous page">{{ $t('previous') }}</button>
            <div class="d-flex align-items-center gap-2">
              <span>{{ pageInfoText }}</span>
              <select class="form-select form-select-sm" style="width:auto" v-model.number="currentPageIndex" aria-label="Select page">
                <option v-for="(p, idx) in workbook.pages" :key="'pgopt-'+idx" :value="idx">{{ idx + 1 }}</option>
              </select>
            </div>
            <button class="btn btn-secondary" @click="nextPage" :disabled="!canGoNextPage" aria-label="Next page">{{ $t('next') }}</button>
          </div>
          <div v-if="isSubmitted" class="final-score mt-3">
            <h4>{{ $t('finalScore') }}: {{ calculateFinalScore() }}/{{ calculateAttemptedCount() }}</h4>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Page from "./Page.vue";
import Stat from "./Stat.vue";
// import PrimaryButton from "./PrimaryButton.vue";

export default {
  name: "Workbook",
  components: {
    Page,
    Stat,
    // PrimaryButton,
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
    };
  },
  computed: {
    currentPage() {
      return this.workbook.pages[this.currentPageIndex];
    },
    pageInfoText() {
      const before = this.$t('pageInfo_before') || '';
      const after = this.$t('pageInfo_after') || '';
      return `${before}${this.currentPage.pageNumber}${after}${this.workbook.pages.length}`;
    },
    isLastPage() {
      return this.currentPageIndex === this.workbook.pages.length - 1;
    },
    canGoNextPage() {
      return this.isPageCompleted(this.currentPageIndex);
    },
    pageProgress() {
      const total = this.workbook.pages.length;
      return Math.round(((this.currentPageIndex + 1) / total) * 100);
    },
    prettyTimer() {
      const m = Math.floor(this.pageSeconds / 60);
      const s = this.pageSeconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    },
  },
  methods: {
    startTimer() {
      if (this.intervalId) clearInterval(this.intervalId);
      this.pageSeconds = 0;
      this.intervalId = setInterval(() => { this.pageSeconds += 1; }, 1000);
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
    nextPage() {
      if (this.isLastPage) {
        if (this.canGoNextPage && !this.isSubmitted) {
          this.submitAnswers();
        }
      } else if (this.currentPageIndex < this.workbook.pages.length - 1) {
        this.currentPageIndex += 1;
        this.startTimer();
      }
    },
    prevPage() {
      if (this.currentPageIndex > 0) {
        this.currentPageIndex -= 1;
        this.startTimer();
      }
    },
    handlePageStatus(payload) {
      const { pageNumber, isCompleted, answeredCount } = payload;
      this.answeredCount = answeredCount ?? this.answeredCount;
      const idx = this.completedPages.indexOf(pageNumber);
      if (isCompleted && idx === -1) this.completedPages.push(pageNumber);
      if (!isCompleted && idx !== -1) this.completedPages.splice(idx, 1);
      // auto-advance when finishing a page (not on last page and not submitted)
      if (isCompleted && pageNumber - 1 === this.currentPageIndex && !this.isSubmitted) {
        if (this.isLastPage) {
          this.submitAnswers();
        } else {
          this.nextPage();
        }
      }
    },
    isPageCompleted(index) {
      const page = this.workbook.pages[index];
      return page.exercises.every(ex => String(ex.answer || '').trim() !== '');
    },
    submitAnswers() {
      this.isSubmitted = true;
      this.calculateFinalScore();
      this.updateWorkbookData();
    },
    resetWorkbook() {
      this.isSubmitted = false;
      this.currentPageIndex = 0;
      this.completedPages = [];
      this.workbook.pages.forEach(page => {
        page.exercises.forEach(ex => {
          ex.answer = "";
        });
      });
      this.resetKey += 1;
      this.updateWorkbookData();
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
    updateWorkbookData() {
      // Emitir um evento para o componente pai atualizar o estado global
      this.$emit("update-workbook", {
        title: this.workbook.title,
        completedPages: this.completedPages,
        lastScore: this.workbook.lastScore,
        attempts: this.workbook.attempts + 1,
      });
    },
  },
  mounted() {
    this.$emit('page-changed', this.currentPageIndex + 1);
    window.addEventListener('keydown', this.onKeydown);
    this.startTimer();
  },
  unmounted() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.intervalId) clearInterval(this.intervalId);
  },
  watch: {
    currentPageIndex(newIdx) {
      this.$emit('page-changed', newIdx + 1);
    },
    initialPageIndex(newVal) {
      if (Number.isFinite(newVal) && newVal >= 0 && newVal < this.workbook.pages.length) {
        this.currentPageIndex = newVal;
      }
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

