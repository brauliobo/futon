<!-- src/components/Home.vue -->
<template lang="pug">
  div(class="space-y-6")
    div(data-testid="daily-goal" class="flex flex-wrap items-center gap-3 rounded-3xl goal-bg border shadow-sm px-5 py-4 animate-slide-up" :style="{ borderColor: 'var(--goal-border)' }")
      div(class="flex items-center gap-2")
        span(class="text-xl") 🎯
        span(class="text-base font-black text-kid-text uppercase tracking-wide") {{ $t('todayGoal') || 'Today\'s Goal' }}
      div(class="flex items-center gap-1 ml-2")
        span(
          v-for="i in 3"
          :key="i"
          :class="i <= todaySets ? 'text-kid-gold star-glow animate-star-pop' : 'theme-star-empty'"
          :style="i <= todaySets ? { animationDelay: `${(i - 1) * 0.15}s` } : {}"
          class="text-2xl leading-none transition-all duration-300"
        ) ★
      span(class="text-base font-bold text-kid-muted ml-1") {{ todaySets }}/3
      div(v-if="streak > 1" class="ml-auto flex items-center gap-1.5 rounded-2xl streak-bg border px-3 py-1.5 text-base font-bold shadow-sm" :style="{ borderColor: 'var(--streak-border)', color: 'var(--streak-text)' }")
        span(class="animate-wiggle") 🔥
        span {{ streak }} {{ $t('dayStreak') || 'day streak' }}
    nav(class="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3")
      button(
        v-for="subject in availableSubjects"
        :key="subject"
        :class="tabButtonClass(subject)"
        @click="selectDiscipline(subject)"
      )
        span(class="text-xl leading-none") {{ subjectIcon(subject) }}
        span(class="text-[11px] sm:text-base font-bold capitalize leading-tight text-center") {{ subjectLabel(subject) }}
    section(v-if="activeDiscipline" class="rounded-3xl border theme-border bg-kid-surface shadow-sm p-6")
      header(class="flex flex-wrap items-end justify-between gap-4")
        div(class="space-y-0.5")
          h2(class="text-2xl font-black" :style="{ color: subjectColor(activeDiscipline) }") {{ subjectLabel(activeDiscipline) }}
        div(class="flex gap-2")
          button(:class="modeTabClass('campaign')" @click="mode = 'campaign'")
            span 🗺
            span {{ $t('campaign') || 'Campaign' }}
          button(:class="modeTabClass('themes')" @click="mode = 'themes'")
            span 🎯
            span {{ $t('themes') || 'Themes' }}

      //- Campaign mode (existing)
      template(v-if="mode === 'campaign'")
        div(class="mt-5")
          LevelRoadmap(
            :sequence="levelSequenceBySubject(activeDiscipline)"
            :available="getAvailableLevels(activeDiscipline)"
            :active="activeLevelBySubject[activeDiscipline] || ''"
            :progressByLevel="{}"
            :getLevelName="(id) => levelNameBySubject(activeDiscipline, id)"
            @select="val => onLevelSelect(activeDiscipline, val)"
          )
        div(class="mt-6 space-y-3")
          h3(class="text-lg font-bold text-kid-text") {{ setsHeader }}
          div(v-if="isLoadingLevel && !filteredSets(activeDiscipline).length" class="flex items-center gap-2 rounded-2xl border border-kid-blue/20 bg-kid-blue/5 px-4 py-3 text-base font-semibold text-kid-blue")
            Spinner
            span {{ $t('loading') || 'Loading...' }}
          LevelList(
            v-else
            :sets="filteredSets(activeDiscipline)"
            :activeSlug="activeSlugFor(activeDiscipline)"
            @start="$emit('select-set', $event)"
          )

      //- Themes mode (skill tree)
      SkillTreeView(
        v-else
        class="mt-5"
        :subject="activeDiscipline"
        :sets="allSetsForSubject(activeDiscipline)"
        @start-set="$emit('select-set', $event)"
        @load-levels="loadLevel"
      )
</template>

<script>
import LevelRoadmap from "./discipline/LevelRoadmap.vue";
import LevelList from "./discipline/level/LevelList.vue";
import SkillTreeView from "./discipline/SkillTreeView.vue";
import Spinner from "./ui/Spinner.vue";
import { Discipline } from "../domain/disciplines.js";
import { Levels } from "../domain/levels.js";
import { SubjectBranding } from "../utils/SubjectBranding.js";
import { Formatter } from "../utils/Formatter.js";
export default {
  name: "Home",
  components: { LevelRoadmap, LevelList, SkillTreeView, Spinner },
  emits: ['select-set', 'level-selected'],
  data() {
    return {
      activeLevelBySubject: {},
      activeDiscipline: null,
      mode: localStorage.getItem('futon_active_mode') || 'campaign',
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
    },
    streak: {
      type: Number,
      default: 0
    },
    todaySets: {
      type: Number,
      default: 0
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
      const base = 'flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 rounded-2xl px-2 sm:px-5 py-2 sm:py-3.5 font-bold capitalize transition-all duration-200 border-2 active:scale-95';
      if (isActive) {
        const colors = { math: 'bg-kid-blue text-white border-kid-blue shadow-lg shadow-kid-blue/30', portuguese: 'bg-kid-green text-white border-kid-green shadow-lg shadow-kid-green/30', english: 'bg-orange-400 text-white border-orange-400 shadow-lg shadow-orange-300/40', japanese: 'bg-kid-red text-white border-kid-red shadow-lg shadow-kid-red/30' };
        return `${base} ${colors[subject] || 'bg-kid-blue text-white border-kid-blue shadow-lg'} scale-[1.02]`;
      }
      return `${base} bg-kid-surface text-kid-muted theme-border shadow-sm hover:border-kid-blue/40 hover:text-kid-blue hover:-translate-y-0.5 hover:shadow-md`;
    },
    subjectIcon(s) { return SubjectBranding.icon(s); },
    subjectColor(s) { return SubjectBranding.color(s); },
    modeTabClass(m) {
      const base = 'flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-200 border-2 active:scale-95';
      if (this.mode === m) return `${base} border-kid-blue bg-kid-blue/10 text-kid-blue shadow-sm`;
      return `${base} border-transparent text-kid-muted hover:text-kid-text hover:bg-[color:var(--kid-surface-2)]`;
    },
    allSetsForSubject(subject) {
      return (this.groupedBySubject[subject] || []);
    },
    async loadLevel(level) {
      this.$emit('level-selected', this.activeDiscipline, level);
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
    slugOf(wb) { return Formatter.slugify(wb?.title); },
    filteredByActiveLevel(subject, list) {
      const active = (this.activeLevelBySubject[subject] || '').toUpperCase();
      return active ? list.filter(wb => String(wb.level || '').toUpperCase() === active) : list;
    },
    subjectLabel(key) {
      const label = this.$t(Discipline.labelKey(key));
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
    },
    mode(val) { localStorage.setItem('futon_active_mode', val); },
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
      if (subject === 'math') return Levels.math.order();
      if (subject === 'portuguese') return Levels.portuguese.order();
      if (subject === 'english') return Levels.english.order();
      if (subject === 'japanese') return Levels.japanese.order();
      return [];
    }; },
    levelNameBySubject() {
      return (subject, id) => {
        if (subject === 'math') {
          const key = Levels.math.i18nKey(id); const label = key ? this.$t(key) : '';
          return typeof label === 'string' && label !== key && label ? label : Levels.math.name(id);
        }
        if (subject === 'portuguese') return Levels.portuguese.name(id);
        if (subject === 'english') return Levels.english.name(id);
        if (subject === 'japanese') return Levels.japanese.name(id);
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


