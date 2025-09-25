<!-- src/App.vue -->
<template lang="pug">
  #app
    header.bg-primary.text-white.p-4.mb-4
      small.text-white-50.d-block.mb-1 Futon
      h1(v-if="!selectedSet") {{ $t('chooseNotebook') }}
      h1(v-else) {{ selectedSet.title }} ({{ $t('level') }}: {{ selectedSet.level }})
    main.container
      Home(v-if="!selectedSet" :sets="sets" :lastSelected="lastSelected" :selectedLevelBySubject="selectedLevelBySubject" @select-set="selectSet" @level-selected="onLevelSelected")
      div(v-else)
        Button(variant="link" @click="goHome").mb-3 ← {{ $t('back') }}
        Set(:set="selectedSet" :initialPageIndex="initialPageIndex" @update-set="updateSet" @page-changed="handlePageChange")
    footer.text-center.py-4
</template>

<script>
// Removed dynamic generators - all sets are now static YAML files
import { DisciplineManager } from "./services/DisciplineManager.js";
import { SetFactory } from "./services/SetFactory.js";
import Home from "./components/Home.vue";
import Set from "./components/set/Set.vue";
import Button from "./components/ui/Button.vue";
import { SetStorage } from "./services/SetStorage.js";

export default {
  name: "App",
  components: {
    Home,
    Set,
    Button,
  },
  data() {
    return {
      disciplineManager: null,
      selectedSet: null,
      initialPageIndex: 0,
      storage: new SetStorage(),
      lastSelected: null,
      selectedLevelBySubject: {},
      isLoading: true,
    };
  },
  async mounted() {
    try {
      const setFactory = new SetFactory();
      const withMeta = (wb) => setFactory.createSet(wb);
      const seedKey = 'futon_seed_addition';
      const existingSeed = localStorage.getItem(seedKey) || String(Math.random()).slice(2);
      localStorage.setItem(seedKey, existingSeed);
      
      this.disciplineManager = await DisciplineManager.create(
        withMeta, 
        {}, // No generators needed - all sets are static YAML files
        existingSeed
      );
      
      this.isLoading = false;
      this.loadSets();
      this.restoreFromRoute();
    } catch (error) {
      console.error('Failed to initialize disciplines:', error);
    }
  },
  computed: {
    sets() { return this.disciplineManager ? this.disciplineManager.getAllSets() : []; },
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
    selectSet(wb) {
      if (wb && wb.comingSoon) return; // lock placeholders
      this.selectedSet = wb;
      this.initialPageIndex = 0;
      this.lastSelected = { slug: this.slugOf(wb), level: wb.level, subject: wb.subject, page: 1 };
      this.$router.push({ name: 'set', params: { slug: this.slugOf(wb), page: 1 } });
      this.saveSets();
    },
    goHome() {
      const prev = this.selectedSet; const page = this.routePageNumber;
      this.selectedSet = null;
      if (prev) this.lastSelected = { slug: this.slugOf(prev), level: prev.level, subject: prev.subject, page };
      this.$router.push({ name: 'home' });
      // Preserve last opened set in storage when returning home
      this.storage.saveDisciplines(this.disciplineManager, prev || (this.lastSelected ? this.sets.find(wb => this.slugOf(wb) === this.lastSelected.slug) : null), prev ? page : (this.lastSelected?.page || 1), this.selectedLevelBySubject);
    },
    updateSet(updatedSet) {
      const allSets = this.disciplineManager.getAllSets();
      const index = allSets.findIndex(set => set.title === updatedSet.title);
      if (index !== -1) {
        const prev = allSets[index] || {};
        const history = Array.isArray(prev.history) ? prev.history.slice() : [];
        if (updatedSet.historyEntry) history.push(updatedSet.historyEntry);
        allSets[index] = {
          ...allSets[index],
          completedPages: updatedSet.completedPages,
          lastScore: updatedSet.lastScore,
          gradePercent: updatedSet.gradePercent ?? allSets[index].gradePercent,
          status: updatedSet.status ?? allSets[index].status,
          attempts: updatedSet.attempts,
          completed: updatedSet.completed ?? allSets[index].completed,
          durationSeconds: updatedSet.durationSeconds ?? allSets[index].durationSeconds,
          avgSecondsPerExercise: updatedSet.avgSecondsPerExercise ?? allSets[index].avgSecondsPerExercise,
          history,
        };
        if (this.selectedSet && this.selectedSet.title === updatedSet.title) {
          this.selectedSet = allSets[index];
        }
        this.saveSets();
      }
    },
    handlePageChange(newPageNumber) {
      if (!this.selectedSet) return;
      this.$router.push({ name: 'set', params: { slug: this.slugOf(this.selectedSet), page: newPageNumber }, hash: this.contextHash(this.selectedSet) });
      this.saveSets();
    },
    selectFromRoute() {
      const slug = this.$route.params.slug;
      if (!slug) return;
      const found = this.sets.find(wb => this.slugOf(wb) === slug);
      if (found) {
        this.selectedSet = found;
        this.initialPageIndex = this.routePageNumber - 1;
        this.$router.replace({ hash: this.contextHash(found) });
      }
    },
    saveSets() {
      this.storage.saveDisciplines(this.disciplineManager, this.selectedSet, this.selectedSet ? this.routePageNumber : 1, this.selectedLevelBySubject);
    },
    loadSets() {
      const saved = this.storage.loadDisciplines();
      const selectedSet = this.storage.mergeDisciplines(this.disciplineManager, saved);
      
      // Load selected levels
      if (saved && saved.selectedLevelBySubject) {
        this.selectedLevelBySubject = saved.selectedLevelBySubject;
      }
      
      // If there's a saved selected set, prefer highlighting on Home without auto-opening
      if (selectedSet) {
        const found = this.sets.find(wb => this.slugOf(wb) === selectedSet.slug);
        if (found) {
          if (this.$route.name === 'set') {
            this.selectedSet = found;
            this.initialPageIndex = Math.max(0, (selectedSet.page || 1) - 1);
          } else {
            this.lastSelected = { slug: selectedSet.slug, level: selectedSet.level, subject: selectedSet.subject, page: selectedSet.page || 1 };
          }
          return;
        } else {
          // Fallback: still set level/subject so Home can select the level even if slug didn't match
          this.lastSelected = { slug: selectedSet.slug || '', level: selectedSet.level, subject: selectedSet.subject, page: selectedSet.page || 1 };
          return;
        }
      }

      // Otherwise, highlight recommended set on Home
      const recommendedSet = this.disciplineManager.getRecommendedSet();
      if (recommendedSet && this.$route.name === 'home') {
        this.lastSelected = { slug: this.slugOf(recommendedSet), level: recommendedSet.level, subject: recommendedSet.subject, page: 1 };
      }
    },
    onLevelSelected(subject, level) {
      this.selectedLevelBySubject[subject] = level;
      this.saveSets();
    },
  },
  created() {
    if (this.$route.name === 'set') {
      this.selectFromRoute();
    }
    this.loadSets();
  },
  watch: {
    '$route'(to) {
      if (to.name === 'home') {
        this.selectedSet = null;
      } else if (to.name === 'set') {
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


