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
import { c1 } from "./lessons/math/C/c1.js";
import addition from "./lessons/math/A/addition.json";
import addition2 from "./lessons/math/A/addition_2.json";
import addition3 from "./lessons/math/A/addition_3.json";
import addition4 from "./lessons/math/A/addition_4.json";
import addition5 from "./lessons/math/A/addition_5.json";
import subtraction from "./lessons/math/B/subtraction.json";
import subtraction2 from "./lessons/math/B/subtraction_2.json";
import subtraction3 from "./lessons/math/B/subtraction_3.json";
import subtraction4 from "./lessons/math/B/subtraction_4.json";
import subtraction5 from "./lessons/math/B/subtraction_5.json";
import multiplication from "./lessons/math/C/multiplication.json";
import multiplication2 from "./lessons/math/C/multiplication_2.json";
import multiplication3 from "./lessons/math/C/multiplication_3.json";
import multiplication4 from "./lessons/math/C/multiplication_4.json";
import multiplication5 from "./lessons/math/C/multiplication_5.json";
import division from "./lessons/math/D/division.json";
import division2 from "./lessons/math/D/division_2.json";
import division3 from "./lessons/math/D/division_3.json";
import division4 from "./lessons/math/D/division_4.json";
import division5 from "./lessons/math/D/division_5.json";
import fractions from "./lessons/math/C/fractions.json";
import fractionsMixed from "./lessons/math/D/fractions_mixed.json";
import portugueseReading from "./lessons/portuguese/A/reading_comprehension.json";
import portugueseGrammar from "./lessons/portuguese/A/grammar.json";
import portugueseReading2 from "./lessons/portuguese/A/reading_comprehension_2.json";
import portugueseGrammar2 from "./lessons/portuguese/A/grammar_2.json";
import englishBasics from "./lessons/english/A/english_basics.json";
import englishPhrases from "./lessons/english/A/english_phrases.json";
import englishVocab2 from "./lessons/english/A/english_vocab_2.json";
import englishPhrases2 from "./lessons/english/A/english_phrases_2.json";
import level7ACount from "./lessons/math/7A/level_7A_count.json";
import level7ANextPrev from "./lessons/math/7A/level_7A_nextprev.json";
import level6ACount from "./lessons/math/6A/level_6A_count.json";
import level6ANextPrev from "./lessons/math/6A/level_6A_nextprev.json";
import level5ACount from "./lessons/math/5A/level_5A_count.json";
import level5ANextPrev from "./lessons/math/5A/level_5A_nextprev.json";
import level4ACount from "./lessons/math/4A/level_4A_count.json";
import level4AAddition from "./lessons/math/4A/level_4A_addition.json";
import { generateAdditionWorkbook, generateSubtractionWorkbook, generateMultiplicationWorkbook, generateDivisionWorkbook } from "./utils/generatorMath.js";
import { mathLevels, getMathLevelOrder } from "./domain/levels.js";
import { generateMathPlaceholder } from "./utils/placeholders.js";
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
    const derivePassCriteria = (wb) => {
      const subject = String(wb.subject || '').toLowerCase();
      const lvl = String(wb.level || '').toUpperCase();
      if (subject === 'math') {
        if (['7A'].includes(lvl)) return { minAccuracyPercent: 80, maxAvgSecondsPerExercise: 6 };
        if (['6A'].includes(lvl)) return { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 5 };
        if (['5A'].includes(lvl)) return { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 5 };
        if (['4A'].includes(lvl)) return { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4.5 };
        if (['3A','2A'].includes(lvl)) return { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 5 };
        if (['A'].includes(lvl)) return { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4.5 };
        if (['B'].includes(lvl)) return { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 4 };
        if (['C','D'].includes(lvl)) return { minAccuracyPercent: 92, maxAvgSecondsPerExercise: 4 };
        if (['E','F'].includes(lvl)) return { minAccuracyPercent: 90, maxAvgSecondsPerExercise: 5.5 };
        return { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 6 };
      }
      if (subject === 'portuguese') return { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 8 };
      if (subject === 'english') return { minAccuracyPercent: 80, maxAvgSecondsPerExercise: 7 };
      return { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 6 };
    };
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
        passCriteria: expanded.passCriteria || derivePassCriteria(expanded),
        attempts: 0,
        lastScore: 0,
        gradePercent: 0,
        status: '',
        completed: false,
        durationSeconds: 0,
        avgSecondsPerExercise: 0,
        totalExercises: expanded.pages.reduce((acc, page) => acc + page.exercises.length, 0),
      };
    };
    const seedKey = 'futon_seed_addition';
    const existingSeed = localStorage.getItem(seedKey) || String(Math.random()).slice(2);
    localStorage.setItem(seedKey, existingSeed);
    const dynamicAdditionA = withMeta(generateAdditionWorkbook({ seed: `${existingSeed}-A`, level: 'A', pages: 2 }));
    const dynamicAdditionB = withMeta(generateAdditionWorkbook({ seed: `${existingSeed}-B`, level: 'B', pages: 2 }));
    const dynamicSubtractionA = withMeta(generateSubtractionWorkbook({ seed: `${existingSeed}-S-A`, level: 'A', pages: 2 }));
    const dynamicMultiplicationA = withMeta(generateMultiplicationWorkbook({ seed: `${existingSeed}-M-A`, level: 'A', pages: 2 }));
    const dynamicDivisionA = withMeta(generateDivisionWorkbook({ seed: `${existingSeed}-D-A`, level: 'A', pages: 2 }));
    const implementedMathLevels = new Set(
      [
        addition, addition2, addition3, addition4, addition5,
        subtraction, subtraction2, subtraction3, subtraction4, subtraction5,
        multiplication, multiplication2, multiplication3, multiplication4, multiplication5,
        division, division2, division3, division4, division5,
        fractions, fractionsMixed,
        level7ACount, level7ANextPrev,
        level6ACount, level6ANextPrev,
        level5ACount, level5ANextPrev,
        level4ACount, level4AAddition
      ].map(w => w.level)
    );
    const allMathOrder = getMathLevelOrder();
    const mathPlaceholders = allMathOrder
      .filter(lvl => !implementedMathLevels.has(lvl))
      .map(lvl => withMeta(generateMathPlaceholder(lvl)));
    return {
      workbooks: [
        withMeta(level7ACount), withMeta(level7ANextPrev),
        withMeta(level6ACount), withMeta(level6ANextPrev),
        withMeta(level5ACount), withMeta(level5ANextPrev),
        withMeta(level4ACount), withMeta(level4AAddition),
        withMeta(addition), withMeta(addition2), withMeta(addition3), withMeta(addition4), withMeta(addition5),
        dynamicAdditionA, dynamicAdditionB,
        dynamicSubtractionA,
        dynamicMultiplicationA,
        dynamicDivisionA,
        withMeta(subtraction2), withMeta(subtraction3), withMeta(subtraction4), withMeta(subtraction5), withMeta(subtraction),
        withMeta(multiplication2), withMeta(multiplication3), withMeta(multiplication4), withMeta(multiplication5), withMeta(multiplication),
        withMeta(division2), withMeta(division3), withMeta(division4), withMeta(division5), withMeta(division),
        withMeta(fractions), withMeta(fractionsMixed),
        ...mathPlaceholders,
        withMeta(c1),
        withMeta(portugueseReading), withMeta(portugueseGrammar), withMeta(portugueseReading2), withMeta(portugueseGrammar2),
        withMeta(englishBasics), withMeta(englishPhrases), withMeta(englishVocab2), withMeta(englishPhrases2)
      ],
      selectedWorkbook: null,
      initialPageIndex: 0,
    };
  },
  computed: {
    
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
      if (wb && wb.comingSoon) return; // lock placeholders
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
          gradePercent: updatedWorkbook.gradePercent ?? this.workbooks[index].gradePercent,
          status: updatedWorkbook.status ?? this.workbooks[index].status,
          attempts: updatedWorkbook.attempts,
          completed: updatedWorkbook.completed ?? this.workbooks[index].completed,
          durationSeconds: updatedWorkbook.durationSeconds ?? this.workbooks[index].durationSeconds,
          avgSecondsPerExercise: updatedWorkbook.avgSecondsPerExercise ?? this.workbooks[index].avgSecondsPerExercise,
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
            gradePercent: wb.gradePercent || 0,
            status: wb.status || '',
            completed: !!wb.completed,
            durationSeconds: wb.durationSeconds || 0,
            avgSecondsPerExercise: wb.avgSecondsPerExercise || 0,
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
            gradePercent: match.gradePercent ?? wb.gradePercent,
            status: match.status ?? wb.status,
            completed: !!(match.completed ?? wb.completed),
            durationSeconds: match.durationSeconds ?? wb.durationSeconds,
            avgSecondsPerExercise: match.avgSecondsPerExercise ?? wb.avgSecondsPerExercise,
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


