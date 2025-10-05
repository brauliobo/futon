<!-- src/components/Home.vue -->
<template lang="pug">
  div(class="space-y-8")
    nav(class="flex flex-wrap items-center gap-2")
      button(
        v-for="subject in availableSubjects"
        :key="subject"
        :class="tabButtonClass(subject)"
        @click="selectDiscipline(subject)"
      )
        span(class="text-sm font-semibold capitalize") {{ subjectLabel(subject) }}
    section(v-if="activeDiscipline" class="rounded-3xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur")
      header(class="flex flex-wrap items-end justify-between gap-4")
        div(class="space-y-1")
          h2(class="text-2xl font-semibold text-slate-100") {{ subjectLabel(activeDiscipline) }}
          span(class="text-xs font-semibold uppercase tracking-wide text-slate-400") {{ $t('levels') }}
        div(class="text-sm text-slate-400" v-if="activeLevelBySubject[activeDiscipline]")
          span {{ activeLevelLabel }}
      div(class="mt-6")
        LevelRoadmap(
          :sequence="levelSequenceBySubject(activeDiscipline)"
          :available="getAvailableLevels(activeDiscipline)"
          :active="activeLevelBySubject[activeDiscipline] || ''"
          :progressByLevel="{}"
          :getLevelName="(id) => levelNameBySubject(activeDiscipline, id)"
          @select="val => onLevelSelect(activeDiscipline, val)"
        )
      div(class="mt-8 space-y-4")
        div(class="flex flex-wrap items-center justify-between gap-3")
          h3(class="text-xl font-semibold text-slate-100") {{ setsHeader }}
        div(v-if="isLoadingLevel && !filteredSets(activeDiscipline).length" class="flex items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-800/50 px-4 py-3 text-sm text-slate-300")
          svg(class="h-4 w-4 animate-spin text-sky-300" viewBox="0 0 24 24" fill="none")
            circle(cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25")
            path(d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" class="opacity-75")
          span {{ $t('loading') || 'Loading...' }}
        LevelList(
          v-else
          :sets="filteredSets(activeDiscipline)"
          :activeSlug="activeSlugFor(activeDiscipline)"
          @start="$emit('select-set', $event)"
        )
</template>

<script>
import LevelRoadmap from "./discipline/LevelRoadmap.vue";
import LevelList from "./discipline/level/LevelList.vue";
import { subjectLabelKey, disciplines } from "../domain/disciplines.js";
import { getMathLevelOrder, getMathLevelName, getMathLevelI18nKey, getPortugueseLevelOrder, getPortugueseLevelName, getEnglishLevelOrder, getEnglishLevelName } from "../domain/levels.js";
export default {
  name: "Home",
  components: { LevelRoadmap, LevelList },
  emits: ['select-set', 'level-selected'],
  data() {
    return {
      activeLevelBySubject: {},
      activeDiscipline: null,
    };
  },
  props: {
    sets: {
      type: Array,
      required: true,
    },
    lastSelected: {
      type: Object,
      default: null,
    },
    selectedLevelBySubject: {
      type: Object,
      default: () => ({})
    },
    disciplineManager: {
      type: Object,
      default: null
    },
    isLoadingLevel: {
      type: Boolean,
      default: false
    }
  },
  mounted() {
    const hashContext = this.parseHashFromRoute();
    const savedDiscipline = localStorage.getItem('futon_active_discipline');
    if (hashContext && this.availableSubjects.includes(hashContext.subject)) {
      this.activeDiscipline = hashContext.subject;
    } else if (savedDiscipline && this.availableSubjects.includes(savedDiscipline)) {
      this.activeDiscipline = savedDiscipline;
    } else {
      this.activeDiscipline = this.availableSubjects[0] || null;
    }
    const subjects = this.availableSubjects;
    subjects.forEach(s => {
      const seq = this.levelSequenceBySubject(s);
      const saved = this.selectedLevelBySubject[s];
      const preset = this.lastSelected && this.lastSelected.subject === s ? String(this.lastSelected.level || '').toUpperCase() : '';
      if (hashContext && hashContext.subject === s) {
        this.activeLevelBySubject[s] = hashContext.level;
      } else {
        this.activeLevelBySubject[s] = saved || preset || seq[0] || '';
      }
    });
    if (hashContext) this.$emit('level-selected', hashContext.subject, hashContext.level);
  },
  created() {
    const subjects = this.availableSubjects;
    subjects.forEach(s => {
      const saved = this.selectedLevelBySubject[s];
      if (saved) {
        this.activeLevelBySubject[s] = saved;
      } else if (this.lastSelected && this.lastSelected.subject === s) {
        this.activeLevelBySubject[s] = String(this.lastSelected.level || '').toUpperCase();
      }
    });
  },
  methods: {
    tabButtonClass(subject) {
      const isActive = this.activeDiscipline === subject;
      const base = 'rounded-full px-4 py-2 text-sm font-semibold capitalize transition border border-white/5 backdrop-blur';
      const inactive = 'bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white';
      const active = 'bg-sky-500/20 text-white shadow-lg shadow-sky-900/30 ring-2 ring-sky-400/60';
      return `${base} ${isActive ? active : inactive}`;
    },
    parseHashFromRoute() {
      const hash = this.$route?.hash;
      if (!hash || hash.length <= 1) return null;
      const parts = hash.slice(1).split('-');
      if (parts.length < 2) return null;
      const subject = parts[0].toLowerCase();
      const level = parts.slice(1).join('-').toUpperCase();
      return { subject, level };
    },
    getAvailableLevels(subject) {
      const discipline = this.disciplineManager && this.disciplineManager.getDiscipline(subject);
      if (discipline?.availableLevels) return discipline.availableLevels.map(l => String(l).toUpperCase());
      const set = new Set((this.groupedBySubject[subject] || []).map(wb => String(wb.level || '').toUpperCase()));
      return Array.from(set);
    },
    async selectDiscipline(subject) {
      this.activeDiscipline = subject;
      localStorage.setItem('futon_active_discipline', subject);
      const level = this.activeLevelBySubject[subject];
      if (level && this.disciplineManager) {
        const discipline = this.disciplineManager.getDiscipline(subject);
        if (discipline) await discipline.ensureLevelLoaded(level);
      }
    },
    onLevelSelect(subject, val) {
      this.activeLevelBySubject[subject] = val;
      this.$emit('level-selected', subject, val);
      try { this.$router.replace({ hash: `#${String(subject).toLowerCase()}-${String(val).toUpperCase()}` }); } catch (e) {}
    },
    activeSlugFor(subject) {
      const list = this.filteredSets(subject);
      if (!list.length) return '';
      if (this.lastSelected && this.lastSelected.subject === subject) {
        const match = list.find(wb => this.slugOf(wb) === this.lastSelected.slug);
        if (match) return this.lastSelected.slug;
      }
      for (let i = 0; i < list.length; i++) {
        const wb = list[i];
        const progress = this.setProgress(wb);
        if (progress.percent < 100) return this.slugOf(wb);
      }
      return this.slugOf(list[0]);
    },
    filteredSets(subject) {
      return this.filteredByActiveLevel(subject, this.groupedBySubject[subject] || []);
    },
    slugOf(wb) { return String(wb?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); },
    filteredByActiveLevel(subject, list) {
      const active = (this.activeLevelBySubject[subject] || '').toUpperCase();
      return active ? list.filter(wb => String(wb.level || '').toUpperCase() === active) : list;
    },
    subjectLabel(key) {
      const label = this.$t(subjectLabelKey(key));
      return typeof label === 'string' ? label : key;
    },
    setProgress(wb) {
      const completed = (wb.completedPages || []).length;
      const percent = wb.pages && wb.pages.length ? Math.round((completed / wb.pages.length) * 100) : 0;
      return { completed, percent };
    },
  },
  watch: {
    lastSelected(val) {
      if (val && val.subject) this.activeLevelBySubject[val.subject] = String(val.level || '').toUpperCase();
    }
  },
  computed: {
    availableSubjects() {
      if (this.disciplineManager) {
        return Object.keys(this.disciplineManager.disciplines);
      }
      return Object.keys(this.groupedBySubject);
    },
    groupedBySubject() {
      const groups = {};
      this.sets.forEach(wb => {
        const subject = wb.subject || 'math';
        if (!groups[subject]) groups[subject] = [];
        groups[subject].push(wb);
      });
      return groups;
    },
    levelSequenceBySubject() { return (subject) => {
      if (subject === 'math') return getMathLevelOrder();
      if (subject === 'portuguese') return getPortugueseLevelOrder();
      if (subject === 'english') return getEnglishLevelOrder();
      return [];
    }; },
    levelNameBySubject() {
      return (subject, id) => {
        if (subject === 'math') {
          const key = getMathLevelI18nKey(id); const label = key ? this.$t(key) : '';
          return typeof label === 'string' && label !== key && label ? label : getMathLevelName(id);
        }
        if (subject === 'portuguese') return getPortugueseLevelName(id);
        if (subject === 'english') return getEnglishLevelName(id);
        return id;
      };
    },
    activeLevelLabel() {
      const level = this.activeLevelBySubject[this.activeDiscipline];
      if (!level) return '';
      return this.levelNameBySubject(this.activeDiscipline, level) || level;
    },
    setsHeader() {
      if (!this.activeDiscipline) return this.$t('sets') || 'Sets';
      return `${this.$t('sets') || 'Sets'} · ${this.activeLevelLabel}`.trim();
    }
  }
};
</script>


