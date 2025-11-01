<!-- src/App.vue -->
<template lang="pug">
  #app.flex.flex-col.min-h-screen.bg-slate-950.text-slate-100
    header(class="bg-slate-950/90 text-slate-100 w-full")
      div(class="mx-auto flex w-full max-w-[1920px] flex-col gap-1 px-2 pt-3 pb-1 sm:px-3 sm:pt-3 sm:pb-1")
        small(class="block text-xs uppercase tracking-[0.3em] text-slate-400") Futon
        h1(v-if="selectedSet" class="text-xl font-semibold sm:text-2xl") {{ selectedSet.title }} ({{ $t('level') }}: {{ selectedSet.level }})
    main.flex-1.w-full
      div(class="mx-auto w-full max-w-[1920px] px-2 pt-6 pb-3 sm:px-3 sm:pt-10 sm:pb-4")
        div(v-if="isLoading" class="flex flex-col items-center justify-center gap-4 py-14")
          svg(class="h-10 w-10 animate-spin text-sky-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24")
            circle(class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4")
            path(class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z")
          p(class="text-sm text-sky-100/80") {{ $t('loading') || 'Loading...' }}
        Home(v-else-if="!selectedSet" :sets="sets" :lastSelected="lastSelected" :selectedLevelBySubject="selectedLevelBySubject" :disciplineManager="disciplineManager" :isLoadingLevel="isLoadingLevel" @select-set="selectSet" @level-selected="onLevelSelected" class="space-y-6")
        div(v-else)
          Button(variant="link" @click="goHome" class="group inline-flex items-center gap-1 mb-3 text-sm text-sky-200 hover:text-white transition")
            span(class="text-base transition-transform group-hover:-translate-x-0.5" aria-hidden="true") ←
            span {{ $t('back') }}
          Set(:set="selectedSet" :initialPageIndex="initialPageIndex" @update-set="updateSet" @page-changed="handlePageChange")
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
      loadedSetsVersion: 0,
      isLoadingLevel: false,
    };
  },
  async mounted() {
    try {
      const setFactory = new SetFactory();
      const withMeta = (wb) => setFactory.createSet(wb);
      const seedKey = 'futon_seed_addition';
      const existingSeed = localStorage.getItem(seedKey) || String(Math.random()).slice(2);
      localStorage.setItem(seedKey, existingSeed);
      
      this.disciplineManager = DisciplineManager.create(
        withMeta, 
        {},
        existingSeed
      );
      
      await this.loadInitialDataWithHash();
      this.isLoading = false;
      this.loadSets();
      this.restoreFromRoute();
    } catch (error) {
      console.error('Failed to initialize disciplines:', error);
      this.isLoading = false;
    }
  },
  computed: {
    sets() { 
      this.loadedSetsVersion;
      return this.disciplineManager ? this.disciplineManager.getAllSets() : []; 
    },
    routePageNumber() {
      const p = Number(this.$route.params.page || 1);
      return Number.isFinite(p) && p > 0 ? p : 1;
    },
  },
  methods: {
    parseHashToContext() {
      const hash = this.$route.hash;
      if (!hash || hash.length <= 1) return null;
      const parts = hash.slice(1).split('-');
      if (parts.length < 2) return null;
      const subject = parts[0].toLowerCase();
      const level = parts.slice(1).join('-').toUpperCase();
      return { subject, level };
    },
    async loadInitialDataWithHash() {
      const saved = this.storage.loadDisciplines();
      const preferred = saved?.selectedLevelBySubject || {};
      const hashContext = this.parseHashToContext();
      const subjects = Object.keys(this.disciplineManager.disciplines || {});
      await Promise.all(subjects.map(async (subject) => {
        const d = this.disciplineManager.getDiscipline(subject);
        if (!d) return;
        let level = preferred[subject] || d.currentLevel;
        if (hashContext && hashContext.subject === subject) level = hashContext.level;
        if (level) {
          await d.ensureLevelLoaded(level);
          this.loadedSetsVersion++;
        }
      }));
      if (hashContext) this.selectedLevelBySubject[hashContext.subject] = hashContext.level;
    },
    async loadInitialData() {
      const saved = this.storage.loadDisciplines();
      const preferred = saved?.selectedLevelBySubject || {};
      const subjects = Object.keys(this.disciplineManager.disciplines || {});
      await Promise.all(subjects.map(async (subject) => {
        const d = this.disciplineManager.getDiscipline(subject);
        if (!d) return;
        const level = preferred[subject] || d.currentLevel;
        if (level) {
          await d.ensureLevelLoaded(level);
          this.loadedSetsVersion++;
        }
      }));
    },
    contextHash(wb) {
      const s = String(wb?.subject || '').toLowerCase();
      const l = String(wb?.level || '').toUpperCase();
      return `#${s}-${l}`;
    },
    slugOf(wb) {
      return String(wb.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    },
    selectSet(wb) {
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
      const hashContext = this.parseHashToContext();
      const found = this.sets.find(wb => this.slugOf(wb) === slug);
      if (found) {
        this.selectedSet = found;
        this.initialPageIndex = this.routePageNumber - 1;
        if (!hashContext || hashContext.subject !== found.subject || hashContext.level !== found.level) {
          this.$router.replace({ hash: this.contextHash(found) });
        }
      }
    },
    restoreFromRoute() {
      if (this.$route.name === 'set') {
        this.selectFromRoute();
      }
    },
    saveSets() {
      if (!this.disciplineManager) {
        console.warn('saveSets() called before disciplineManager is ready');
        return;
      }
      this.storage.saveDisciplines(this.disciplineManager, this.selectedSet, this.selectedSet ? this.routePageNumber : 1, this.selectedLevelBySubject);
    },
    loadSets() {
      if (!this.disciplineManager) {
        console.warn('loadSets() called before disciplineManager is ready');
        return;
      }
      const saved = this.storage.loadDisciplines();
      const selectedSet = this.storage.mergeDisciplines(this.disciplineManager, saved);
      const hashContext = this.parseHashToContext();
      
      // Load selected levels - prioritize hash over saved state
      if (hashContext) {
        this.selectedLevelBySubject[hashContext.subject] = hashContext.level;
      } else if (saved && saved.selectedLevelBySubject) {
        this.selectedLevelBySubject = saved.selectedLevelBySubject;
      }
      
      // If there's a hash context, it overrides saved state
      if (hashContext && this.$route.name !== 'set') {
        const matchingSets = this.sets.filter(wb => wb.subject === hashContext.subject && String(wb.level).toUpperCase() === hashContext.level);
        if (matchingSets.length > 0) {
          const preferredSet = matchingSets.find(wb => this.slugOf(wb) === selectedSet?.slug) || matchingSets[0];
          this.lastSelected = { slug: this.slugOf(preferredSet), level: preferredSet.level, subject: preferredSet.subject, page: 1 };
          return;
        }
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
    async onLevelSelected(subject, level) {
      this.selectedLevelBySubject[subject] = level;
      this.isLoadingLevel = true;
      await this.disciplineManager.getSetsBySubjectAsync(subject, level);
      this.loadedSetsVersion++;
      this.isLoadingLevel = false;
      this.saveSets();
    },
  },
  created() {
    // Route handling moved to restoreFromRoute() in mounted() after disciplineManager is ready
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



