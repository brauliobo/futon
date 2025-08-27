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
        <Workbook :workbook="selectedWorkbook" @update-workbook="updateWorkbook" />
      </div>
    </main>
    <footer class="text-center py-4">
    </footer>
  </div>
</template>

<script>
import { c1 } from "./lessons/c1";
import fractionsMixed from "./lessons/fractions_mixed.json";
import fractions from "./lessons/fractions.json";
import Home from "./components/Home.vue";
import Workbook from "./components/Workbook.vue";

export default {
  name: "App",
  components: {
    Home,
    Workbook,
  },
  data() {
    const withMeta = (wb) => ({
      ...wb,
      attempts: 0,
      lastScore: 0,
      totalExercises: wb.pages.reduce((acc, page) => acc + page.exercises.length, 0),
    });
    // Sequência correta: Frações → Mistos → Caderno C
    return {
      workbooks: [withMeta(fractions), withMeta(fractionsMixed), withMeta(c1)],
      selectedWorkbook: null,
    };
  },
  computed: {
    topics() {
      const set = new Set();
      this.workbooks.forEach(wb => wb.pages.forEach(p => p.exercises.forEach(e => set.add(e.type))));
      return Array.from(set);
    },
  },
  methods: {
    selectWorkbook(wb) {
      this.selectedWorkbook = wb;
    },
    goHome() {
      this.selectedWorkbook = null;
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
      }
    },
  },
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

