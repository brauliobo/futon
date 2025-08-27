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
        <PrimaryButton class="mb-3" @click="toggleWorkbook">
          {{ isOpen ? $t('closeNotebook') : $t('openNotebook') }}
        </PrimaryButton>
        <div v-if="isOpen" class="workbook-content">
          <Page
            :page="currentPage"
            :isSubmitted="isSubmitted"
            @update-page-status="handlePageStatus"
            :isReadOnly="isSubmitted"
          />
          <div class="navigation d-flex justify-content-between align-items-center">
            <button class="btn btn-secondary" @click="prevPage" :disabled="currentPageIndex === 0">{{ $t('previous') }}</button>
            <span>{{ $t('pageInfo', { current: currentPage.pageNumber, total: workbook.pages.length }) }}</span>
            <button class="btn btn-secondary" @click="nextPage" :disabled="!canGoNextPage">{{ $t('next') }}</button>
          </div>
          <div v-if="isLastPage && !isSubmitted" class="submit-section mt-3">
            <button class="btn btn-success" @click="submitAnswers">{{ $t('submitAnswers') }}</button>
          </div>
          <div v-if="isSubmitted" class="final-score mt-3">
            <h4>{{ $t('finalScore') }}: {{ calculateFinalScore() }}/{{ workbook.totalExercises }}</h4>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Page from "./Page.vue";
import Stat from "./Stat.vue";
import PrimaryButton from "./PrimaryButton.vue";

export default {
  name: "Workbook",
  components: {
    Page,
    Stat,
    PrimaryButton,
  },
  props: {
    workbook: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isOpen: false,
      currentPageIndex: 0,
      completedPages: [],
      scores: Array(this.workbook.pages.length).fill(0),
      isSubmitted: false,
    };
  },
  computed: {
    currentPage() {
      return this.workbook.pages[this.currentPageIndex];
    },
    isLastPage() {
      return this.currentPageIndex === this.workbook.pages.length - 1;
    },
    canGoNextPage() {
      return this.isPageCompleted(this.currentPageIndex);
    },
  },
  methods: {
    toggleWorkbook() {
      this.isOpen = !this.isOpen;
    },
    nextPage() {
      if (this.currentPageIndex < this.workbook.pages.length - 1) {
        this.currentPageIndex += 1;
      }
    },
    prevPage() {
      if (this.currentPageIndex > 0) {
        this.currentPageIndex -= 1;
      }
    },
    handlePageStatus(payload) {
      const { pageNumber, correct } = payload;
      if (!this.completedPages.includes(pageNumber)) {
        this.completedPages.push(pageNumber);
      }
      this.scores[pageNumber - 1] = correct ? 1 : 0;
      // Verificar se todos os exercícios da página atual estão concluídos
      if (this.isPageCompleted(this.currentPageIndex)) {
        // Permitir a navegação para a próxima página
      }
    },
    isPageCompleted(index) {
      const page = this.workbook.pages[index];
      return page.exercises.every((exercise, idx) => this.scores[idx] !== 0);
    },
    submitAnswers() {
      this.isSubmitted = true;
      this.calculateFinalScore();
      this.updateWorkbookData();
    },
    calculateFinalScore() {
      const total = this.scores.reduce((acc, curr) => acc + curr, 0);
      this.workbook.lastScore = total;
      return total;
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

