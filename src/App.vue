<!-- src/App.vue -->
<template>
  <div id="app">
    <header class="bg-primary text-white p-4 mb-4">
      <h1 v-if="!selectedWorkbook">{{ $t('chooseNotebook') }}</h1>
      <h1 v-else>
        {{ selectedWorkbook.title }} ({{ $t('level') }}: {{ selectedWorkbook.level }})
      </h1>
    </header>
    <main class="container">
      <Home
        v-if="!selectedWorkbook"
        :workbooks="workbooks"
        :topics="topics"
        @select-workbook="selectWorkbook"
      />
      <div v-else>
        <button class="btn btn-link mb-3" @click="goHome">← {{ $t('back') }}</button>
        <Workbook
          :workbook="selectedWorkbook"
          :initialPageIndex="initialPageIndex"
          @update-workbook="updateWorkbook"
          @page-changed="handlePageChange"
        />
      </div>
    </main>
    <footer class="text-center py-4">
    </footer>
  </div>
</template>

<script>
import { c1 } from "./lessons/c1";
import addition from "./lessons/addition.json";
import addition2 from "./lessons/addition_2.json";
import addition3 from "./lessons/addition_3.json";
import addition4 from "./lessons/addition_4.json";
import addition5 from "./lessons/addition_5.json";
import subtraction from "./lessons/subtraction.json";
import subtraction2 from "./lessons/subtraction_2.json";
import subtraction3 from "./lessons/subtraction_3.json";
import subtraction4 from "./lessons/subtraction_4.json";
import subtraction5 from "./lessons/subtraction_5.json";
import multiplication from "./lessons/multiplication.json";
import multiplication2 from "./lessons/multiplication_2.json";
import multiplication3 from "./lessons/multiplication_3.json";
import multiplication4 from "./lessons/multiplication_4.json";
import multiplication5 from "./lessons/multiplication_5.json";
import division from "./lessons/division.json";
import division2 from "./lessons/division_2.json";
import division3 from "./lessons/division_3.json";
import division4 from "./lessons/division_4.json";
import division5 from "./lessons/division_5.json";
import fractions from "./lessons/fractions.json";
import fractionsMixed from "./lessons/fractions_mixed.json";
import portugueseReading from "./lessons/reading_comprehension.json";
import portugueseGrammar from "./lessons/grammar.json";
import portugueseReading2 from "./lessons/reading_comprehension_2.json";
import portugueseGrammar2 from "./lessons/grammar_2.json";
import englishBasics from "./lessons/english_basics.json";
import englishPhrases from "./lessons/english_phrases.json";
import englishVocab2 from "./lessons/english_vocab_2.json";
import englishPhrases2 from "./lessons/english_phrases_2.json";
import Home from "./components/Home.vue";
import Workbook from "./components/Workbook.vue";

export default {
  name: "App",
  components: {
    Home,
    Workbook,
  },
  data() {
    const deep = (o) => JSON.parse(JSON.stringify(o));
    const expandRepetitions = (wb) => {
      const sourcePages = wb.pages.flatMap((p) => {
        const times = Number.isFinite(p.repeat) && p.repeat > 1 ? Math.floor(p.repeat) : 1;
        return Array.from({ length: times }, () => deep({ ...p, repeat: undefined }));
      });
      const allTimes = Number.isFinite(wb.repeatAll) && wb.repeatAll > 1 ? Math.floor(wb.repeatAll) : 1;
      let pages = sourcePages;
      for (let t = 1; t < allTimes; t += 1) pages = pages.concat(sourcePages.map((p) => deep(p)));
      pages.forEach((p, i) => { p.pageNumber = i + 1; });
      return { ...wb, pages };
    };
    const withMeta = (wb) => {
      const expanded = expandRepetitions(wb);
      return {
        ...expanded,
        attempts: 0,
        lastScore: 0,
        totalExercises: expanded.pages.reduce((acc, page) => acc + page.exercises.length, 0),
      };
    };
    // Sequência correta: Adição → Subtração → Multiplicação → Divisão → Frações → Mistos → Caderno C
    return {
      workbooks: [
        withMeta(addition), withMeta(addition2), withMeta(addition3), withMeta(addition4), withMeta(addition5),
        withMeta(subtraction2), withMeta(subtraction3), withMeta(subtraction4), withMeta(subtraction5), withMeta(subtraction),
        withMeta(multiplication2), withMeta(multiplication3), withMeta(multiplication4), withMeta(multiplication5), withMeta(multiplication),
        withMeta(division2), withMeta(division3), withMeta(division4), withMeta(division5), withMeta(division),
        withMeta(fractions), withMeta(fractionsMixed), withMeta(c1),
        withMeta(portugueseReading), withMeta(portugueseGrammar), withMeta(portugueseReading2), withMeta(portugueseGrammar2),
        withMeta(englishBasics), withMeta(englishPhrases), withMeta(englishVocab2), withMeta(englishPhrases2)
      ],
      selectedWorkbook: null,
      initialPageIndex: 0,
    };
  },
  computed: {
    topics() {
      const set = new Set();
      this.workbooks.forEach(wb => wb.pages.forEach(p => p.exercises.forEach(e => set.add(e.type))));
      return Array.from(set);
    },
    routePageNumber() {
      const p = Number(this.$route.params.page || 1);
      return Number.isFinite(p) && p > 0 ? p : 1;
    },
  },
  methods: {
    slugOf(wb) {
      return String(wb.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    },
    selectWorkbook(wb) {
      this.selectedWorkbook = wb;
      this.initialPageIndex = 0;
      this.$router.push({ name: 'workbook', params: { slug: this.slugOf(wb), page: 1 } });
      this.saveWorkbooks();
    },
    goHome() {
      this.selectedWorkbook = null;
      this.$router.push({ name: 'home' });
      this.saveWorkbooks();
    },
    updateWorkbook(updatedWorkbook) {
      const index = this.workbooks.findIndex(workbook => workbook.title === updatedWorkbook.title);
      if (index !== -1) {
        this.workbooks[index] = {
          ...this.workbooks[index],
          completedPages: updatedWorkbook.completedPages,
          lastScore: updatedWorkbook.lastScore,
          attempts: updatedWorkbook.attempts,
        };
        if (this.selectedWorkbook && this.selectedWorkbook.title === updatedWorkbook.title) {
          this.selectedWorkbook = this.workbooks[index];
        }
        this.saveWorkbooks();
      }
    },
    handlePageChange(newPageNumber) {
      if (!this.selectedWorkbook) return;
      this.$router.replace({ name: 'workbook', params: { slug: this.slugOf(this.selectedWorkbook), page: newPageNumber } });
      this.saveWorkbooks();
    },
    selectFromRoute() {
      const slug = this.$route.params.slug;
      if (!slug) return;
      const found = this.workbooks.find(wb => this.slugOf(wb) === slug);
      if (found) {
        this.selectedWorkbook = found;
        this.initialPageIndex = this.routePageNumber - 1;
      }
    },
    saveWorkbooks() {
      try {
        const key = 'futon_state_v1';
        const payload = {
          workbooks: this.workbooks.map(wb => ({
            title: wb.title,
            attempts: wb.attempts,
            lastScore: wb.lastScore,
            completedPages: wb.completedPages || [],
            pages: wb.pages.map(p => ({
              pageNumber: p.pageNumber,
              exercises: p.exercises.map(e => ({ answer: e.answer ?? '' }))
            }))
          })),
          selectedSlug: this.selectedWorkbook ? this.slugOf(this.selectedWorkbook) : null,
          selectedPage: this.selectedWorkbook ? (this.routePageNumber) : 1,
        };
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (e) { /* ignore */ }
    },
    loadWorkbooks() {
      try {
        const raw = localStorage.getItem('futon_state_v1');
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved || !Array.isArray(saved.workbooks)) return;
        // merge answers and stats by title
        this.workbooks = this.workbooks.map(wb => {
          const match = saved.workbooks.find(s => s.title === wb.title);
          if (!match) return wb;
          const pages = wb.pages.map(p => {
            const sp = (match.pages || []).find(x => x.pageNumber === p.pageNumber);
            if (!sp) return p;
            return {
              ...p,
              exercises: p.exercises.map((ex, idx) => ({ ...ex, answer: (sp.exercises[idx] && sp.exercises[idx].answer) || '' }))
            };
          });
          return {
            ...wb,
            attempts: match.attempts ?? wb.attempts,
            lastScore: match.lastScore ?? wb.lastScore,
            completedPages: match.completedPages || [],
            pages,
          };
        });
        if (saved.selectedSlug) {
          const found = this.workbooks.find(wb => this.slugOf(wb) === saved.selectedSlug);
          if (found) {
            this.selectedWorkbook = found;
            this.initialPageIndex = Math.max(0, (saved.selectedPage || 1) - 1);
          }
        }
      } catch (e) { /* ignore */ }
    },
  },
  created() {
    if (this.$route.name === 'workbook') {
      this.selectFromRoute();
    }
    this.loadWorkbooks();
  },
  watch: {
    '$route'(to) {
      if (to.name === 'home') {
        this.selectedWorkbook = null;
      } else if (to.name === 'workbook') {
        this.selectFromRoute();
      }
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
}

header h1 {
  font-size: 2.5rem;
}

footer p {
  margin: 0;
  color: #6c757d;
}
</style>


