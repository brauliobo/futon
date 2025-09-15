<!-- src/App.vue -->
<template lang="pug">
  #app
    header.bg-primary.text-white.p-4.mb-4
      h1(v-if="!selectedWorkbook") {{ $t('chooseNotebook') }}
      h1(v-else) {{ selectedWorkbook.title }} ({{ $t('level') }}: {{ selectedWorkbook.level }})
    main.container
      Home(v-if="!selectedWorkbook" :workbooks="workbooks" @select-workbook="selectWorkbook")
      div(v-else)
        Button(variant="link" @click="goHome").mb-3 ← {{ $t('back') }}
        Workbook(:workbook="selectedWorkbook" :initialPageIndex="initialPageIndex" @update-workbook="updateWorkbook" @page-changed="handlePageChange")
    footer.text-center.py-4
</template>

<script>
import { generateAdditionWorkbook, generateSubtractionWorkbook, generateMultiplicationWorkbook, generateDivisionWorkbook } from "./utils/generatorMath.js";
import { DisciplineManager } from "./services/DisciplineManager.js";
import Home from "./components/Home.vue";
import Workbook from "./components/workbook/Workbook.vue";
import Button from "./components/ui/Button.vue";
import { WorkbookStorage } from "./services/WorkbookStorage.js";

export default {
  name: "App",
  components: {
    Home,
    Workbook,
    Button,
  },
  data() {
    const deep = (o) => JSON.parse(JSON.stringify(o));
    const defaultPassCriteria = { minAccuracyPercent: 85, maxAvgSecondsPerExercise: 6 };
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
        passCriteria: expanded.passCriteria || defaultPassCriteria,
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
    
    const disciplineManager = new DisciplineManager(
      withMeta, 
      { generateAdditionWorkbook, generateSubtractionWorkbook, generateMultiplicationWorkbook, generateDivisionWorkbook }, 
      existingSeed
    );
    
    return {
      disciplineManager,
      selectedWorkbook: null,
      initialPageIndex: 0,
      storage: new WorkbookStorage(),
    };
  },
  computed: {
    workbooks() { return this.disciplineManager.getAllWorkbooks(); },
    routePageNumber() {
      const p = Number(this.$route.params.page || 1);
      return Number.isFinite(p) && p > 0 ? p : 1;
    },
  },
  methods: {
    contextHash(wb) {
      const s = String(wb?.subject || '').toLowerCase();
      const l = String(wb?.level || '').toUpperCase();
      return `#${s}-${l}`;
    },
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
      const allWorkbooks = this.disciplineManager.getAllWorkbooks();
      const index = allWorkbooks.findIndex(workbook => workbook.title === updatedWorkbook.title);
      if (index !== -1) {
        const prev = allWorkbooks[index] || {};
        const history = Array.isArray(prev.history) ? prev.history.slice() : [];
        if (updatedWorkbook.historyEntry) history.push(updatedWorkbook.historyEntry);
        allWorkbooks[index] = {
          ...allWorkbooks[index],
          completedPages: updatedWorkbook.completedPages,
          lastScore: updatedWorkbook.lastScore,
          gradePercent: updatedWorkbook.gradePercent ?? allWorkbooks[index].gradePercent,
          status: updatedWorkbook.status ?? allWorkbooks[index].status,
          attempts: updatedWorkbook.attempts,
          completed: updatedWorkbook.completed ?? allWorkbooks[index].completed,
          durationSeconds: updatedWorkbook.durationSeconds ?? allWorkbooks[index].durationSeconds,
          avgSecondsPerExercise: updatedWorkbook.avgSecondsPerExercise ?? allWorkbooks[index].avgSecondsPerExercise,
          history,
        };
        if (this.selectedWorkbook && this.selectedWorkbook.title === updatedWorkbook.title) {
          this.selectedWorkbook = allWorkbooks[index];
        }
        this.saveWorkbooks();
      }
    },
    handlePageChange(newPageNumber) {
      if (!this.selectedWorkbook) return;
      this.$router.push({ name: 'workbook', params: { slug: this.slugOf(this.selectedWorkbook), page: newPageNumber }, hash: this.contextHash(this.selectedWorkbook) });
      this.saveWorkbooks();
    },
    selectFromRoute() {
      const slug = this.$route.params.slug;
      if (!slug) return;
      const found = this.workbooks.find(wb => this.slugOf(wb) === slug);
      if (found) {
        this.selectedWorkbook = found;
        this.initialPageIndex = this.routePageNumber - 1;
        this.$router.replace({ hash: this.contextHash(found) });
      }
    },
    saveWorkbooks() {
      this.storage.saveDisciplines(this.disciplineManager, this.selectedWorkbook, this.selectedWorkbook ? this.routePageNumber : 1);
    },
    loadWorkbooks() {
      const saved = this.storage.loadDisciplines();
      const selectedWorkbook = this.storage.mergeDisciplines(this.disciplineManager, saved);
      
      // If there's a saved selected workbook, use it
      if (selectedWorkbook) {
        const found = this.workbooks.find(wb => this.slugOf(wb) === selectedWorkbook.slug);
        if (found) {
          this.selectedWorkbook = found;
          this.initialPageIndex = Math.max(0, (selectedWorkbook.page || 1) - 1);
          return;
        }
      }
      
      // Otherwise, auto-select the recommended workbook based on progress
      const recommendedWorkbook = this.disciplineManager.getRecommendedWorkbook();
      if (recommendedWorkbook && this.$route.name === 'home') {
        this.selectedWorkbook = recommendedWorkbook;
        this.initialPageIndex = 0;
      }
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


