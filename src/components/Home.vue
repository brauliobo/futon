<!-- src/components/Home.vue -->
<template lang="pug">
  div(class="space-y-6")
    section(v-if="primarySet" class="rounded-3xl border-2 border-kid-blue/30 bg-kid-surface p-4 shadow-lg sm:p-6 animate-slide-up")
      div(class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between")
        div(class="min-w-0 flex-1 space-y-2")
          div(class="inline-flex items-center gap-2 rounded-full bg-kid-blue/10 px-3 py-1 text-sm font-black uppercase text-kid-blue")
            span {{ primarySetIcon }}
            span {{ primarySetEyebrow }}
          h1(class="text-2xl font-black leading-tight text-kid-text sm:text-4xl") {{ primarySet.title }}
          div(class="flex flex-wrap items-center gap-2 text-sm font-bold text-kid-muted sm:text-base")
            span(class="inline-flex items-center gap-1 rounded-full surface-2 px-3 py-1")
              span {{ subjectIcon(primarySet.subject) }}
              span {{ subjectLabel(primarySet.subject) }}
            span(class="inline-flex items-center rounded-full surface-2 px-3 py-1") {{ levelNameBySubject(primarySet.subject, primarySet.level) }}
            span(v-if="primarySetProgress.percent > 0" class="inline-flex items-center rounded-full surface-2 px-3 py-1") {{ primarySetProgress.completed }}/{{ primarySetTotalPages }} {{ $t('pages') || 'pages' }}
        div(class="flex w-full flex-col gap-3 lg:w-72")
          div(v-if="primarySetProgress.percent > 0" class="rounded-2xl border theme-border surface-2 p-3")
            div(class="mb-2 flex items-center justify-between text-sm font-black text-kid-muted")
              span {{ $t('progress') || 'Progress' }}
              span {{ primarySetProgress.percent }}%
            div(class="h-3 overflow-hidden rounded-full theme-track")
              div(class="h-full rounded-full bg-kid-blue transition-all duration-500" :style="{ width: primarySetProgress.percent + '%' }")
          button(@click="startPrimarySet" class="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-3xl bg-kid-blue px-5 py-4 text-xl font-black text-white shadow-lg transition-all hover:bg-kid-blue/90 hover:shadow-xl active:scale-95")
            span {{ primarySetButtonIcon }}
            span {{ primarySetButtonText }}

    div(data-testid="daily-goal" :class="['daily-goal', { 'daily-goal--complete': goalAchieved }]" :style="{ borderColor: goalAchieved ? 'var(--kid-green)' : 'var(--goal-border)' }")
      div(class="flex items-center gap-2")
        span(class="text-xl") {{ goalAchieved ? '🎉' : '🎯' }}
        span(class="text-base font-black text-kid-text uppercase tracking-wide") {{ goalAchieved ? ($t('goalComplete') || 'Goal smashed!') : ($t('todayGoal') || 'Today\'s Goal') }}
      div(class="flex items-center gap-1 ml-2")
        span(
          v-for="i in 3"
          :key="i"
          :class="i <= todaySets ? 'text-kid-gold star-glow animate-star-pop' : 'theme-star-empty'"
          :style="i <= todaySets ? { animationDelay: `${(i - 1) * 0.15}s` } : {}"
          class="text-2xl leading-none transition-all duration-300"
        ) ★
      span(:class="goalAchieved ? 'text-base font-black text-kid-green ml-1' : 'text-base font-bold text-kid-muted ml-1'") {{ todaySets }}/3
      div(v-if="streak > 1" class="ml-auto flex items-center gap-1.5 rounded-2xl streak-bg border px-3 py-1.5 text-base font-bold shadow-sm" :style="{ borderColor: 'var(--streak-border)', color: 'var(--streak-text)' }")
        span(class="animate-wiggle") 🔥
        span {{ streak }} {{ $t('dayStreak') || 'day streak' }}
    section(class="rounded-3xl border theme-border bg-kid-surface p-4 shadow-sm sm:p-5")
      div(class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between")
        div(class="space-y-1")
          h2(class="text-lg font-black text-kid-text") {{ $t('progressSnapshot') || 'Progress snapshot' }}
          p(class="text-sm font-bold text-kid-muted") {{ $t('progressSnapshotHint') || 'Compact parent and teacher view' }}
        div(class="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[720px]")
          div(v-for="stat in observabilityStats" :key="stat.label" class="rounded-2xl border theme-border surface-2 px-3 py-2.5")
            div(class="text-xs font-black uppercase text-kid-muted") {{ stat.label }}
            div(:class="['mt-1 text-2xl font-black', stat.color]") {{ stat.value }}
            div(class="text-xs font-bold text-kid-muted") {{ stat.detail }}
      div(v-if="recentAttempts.length" class="mt-4 border-t theme-border pt-4")
        div(class="mb-2 flex items-center justify-between gap-3")
          h3(class="text-sm font-black uppercase text-kid-muted") {{ $t('recentAttempts') || 'Recent attempts' }}
          span(v-if="needsPracticeCount" class="rounded-full bg-kid-red/10 px-3 py-1 text-xs font-black text-kid-red") {{ needsPracticeCount }} {{ $t('needPractice') || 'need practice' }}
        div(class="grid gap-2 md:grid-cols-3")
          div(v-for="attempt in recentAttempts" :key="attempt.key" class="rounded-2xl border theme-border bg-kid-surface px-3 py-2")
            div(class="flex items-center justify-between gap-2")
              p(class="truncate text-sm font-black text-kid-text") {{ attempt.title }}
              span(:class="attempt.badgeClass" class="shrink-0 rounded-full px-2 py-0.5 text-xs font-black") {{ attempt.statusLabel }}
            div(class="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-kid-muted")
              span {{ subjectLabel(attempt.subject) }}
              span {{ attempt.accuracy }}
              span(v-if="attempt.speed") {{ attempt.speed }}
    nav(class="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3")
      button(
        v-for="subject in availableSubjects"
        :key="subject"
        :class="['subject-tab', `subject-tab--${subject}`, activeDiscipline === subject ? 'subject-tab--active' : 'subject-tab--idle']"
        @click="selectDiscipline(subject)"
      )
        span(class="text-xl leading-none") {{ subjectIcon(subject) }}
        span(class="text-[11px] sm:text-base font-bold capitalize leading-tight text-center") {{ subjectLabel(subject) }}
    section(v-if="activeDiscipline" class="rounded-3xl border theme-border bg-kid-surface shadow-sm p-3 sm:p-6")
      header(class="flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3 sm:gap-4 px-2 sm:px-0")
        div(class="space-y-0.5")
          h2(class="text-xl sm:text-2xl font-black" :style="{ color: subjectColor(activeDiscipline) }") {{ subjectLabel(activeDiscipline) }}
        div(class="mode-switch")
          button(:class="['mode-tab', { 'mode-tab--active': mode === 'campaign' }]" @click="mode = 'campaign'")
            span 🗺
            span {{ $t('campaign') || 'Campaign' }}
          button(:class="['mode-tab', { 'mode-tab--active': mode === 'themes' }]" @click="mode = 'themes'")
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
    subjectIcon(s) { return SubjectBranding.icon(s); },
    subjectColor(s) { return SubjectBranding.color(s); },
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
    startPrimarySet() {
      if (!this.primarySet) return;
      this.activeDiscipline = this.primarySet.subject;
      this.activeLevelBySubject[this.primarySet.subject] = String(this.primarySet.level || '').toUpperCase();
      localStorage.setItem('futon_active_discipline', this.primarySet.subject);
      this.$emit('select-set', this.primarySet);
    },
    isSetAvailableInList(list, index) {
      return index === 0 || list[index - 1]?.status === 'mastery';
    },
    firstAvailableSet(list) {
      return list.find((wb, index) => this.isSetAvailableInList(list, index) && wb.status !== 'mastery') || null;
    },
    setHistoryEntries(wb) {
      return (wb.history || []).map((entry, index) => ({ wb, entry, index }));
    },
    statusLabel(status) {
      if (status === 'mastery') return this.$t('statusMasteryShort') || 'Mastered';
      if (status === 'pass') return this.$t('statusPassShort') || 'Passed';
      if (status === 'retry') return this.$t('statusRetryShort') || 'Retry';
      return this.$t('dashboardAttempt') || 'Attempt';
    },
    statusBadgeClass(status) {
      if (status === 'mastery') return 'bg-kid-green/15 text-kid-green';
      if (status === 'pass') return 'bg-kid-gold/20 text-amber-600';
      if (status === 'retry') return 'bg-kid-red/10 text-kid-red';
      return 'bg-kid-blue/10 text-kid-blue';
    },
  },
  watch: {
    lastSelected(val) {
      if (val && val.subject) this.activeLevelBySubject[val.subject] = String(val.level || '').toUpperCase();
    },
    mode(val) { localStorage.setItem('futon_active_mode', val); },
  },
  computed: {
    goalAchieved() { return this.todaySets >= 3; },
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
      const registry = Levels[subject];
      return registry?.order ? registry.order() : [];
    }; },
    levelNameBySubject() {
      return (subject, id) => {
        const registry = Levels[subject];
        if (!registry) return id;
        const key = registry.i18nKey(id);
        const label = key ? this.$t(key) : '';
        return typeof label === 'string' && label !== key && label ? label : registry.name(id);
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
    },
    primarySet() {
      if (!this.sets.length) return null;
      if (this.lastSelected?.slug) {
        const last = this.sets.find(wb => this.slugOf(wb) === this.lastSelected.slug);
        if (last && last.status !== 'mastery') return last;
      }
      const activeList = this.activeDiscipline ? this.filteredSets(this.activeDiscipline) : [];
      const activeCandidate = this.firstAvailableSet(activeList);
      if (activeCandidate) return activeCandidate;
      for (const subject of this.availableSubjects) {
        const candidate = this.firstAvailableSet(this.filteredSets(subject));
        if (candidate) return candidate;
      }
      return this.sets.find(wb => wb.status !== 'mastery') || this.sets[0] || null;
    },
    primarySetProgress() {
      return this.primarySet ? this.setProgress(this.primarySet) : { completed: 0, percent: 0 };
    },
    primarySetTotalPages() {
      return this.primarySet?.pages?.length || 0;
    },
    primarySetIcon() {
      if (this.primarySetProgress.percent > 0) return '▶';
      return '⭐';
    },
    primarySetEyebrow() {
      if (this.primarySetProgress.percent > 0) return this.$t('continueNextSet') || 'Continue next set';
      return this.$t('nextSetReady') || 'Next set ready';
    },
    primarySetButtonIcon() {
      return this.primarySetProgress.percent > 0 || this.primarySet?.attempts > 0 ? '▶' : '➜';
    },
    primarySetButtonText() {
      if (this.primarySetProgress.percent > 0) return this.$t('continueNextSet') || 'Continue next set';
      if (this.primarySet?.attempts > 0) return this.$t('tryAgain') || 'Try again';
      return this.$t('startNextSet') || 'Start next set';
    },
    attemptedSets() {
      return this.sets.filter(wb => (wb.attempts || 0) > 0 || (wb.history || []).length > 0);
    },
    masteredCount() {
      return this.sets.filter(wb => wb.status === 'mastery').length;
    },
    needsPracticeCount() {
      return this.sets.filter(wb => ['retry', 'pass'].includes(wb.status)).length;
    },
    allHistoryEntries() {
      return this.sets.flatMap(wb => this.setHistoryEntries(wb));
    },
    averageAccuracy() {
      const entries = this.allHistoryEntries.filter(({ entry }) => Number.isFinite(Number(entry.accuracyPercent)));
      if (!entries.length) return null;
      const total = entries.reduce((sum, { entry }) => sum + Number(entry.accuracyPercent), 0);
      return Math.round(total / entries.length);
    },
    averageSpeed() {
      const speeds = this.sets
        .map(wb => Number(wb.avgSecondsPerExercise || wb.history?.at(-1)?.avgSecondsPerExercise || 0))
        .filter(n => Number.isFinite(n) && n > 0);
      if (!speeds.length) return null;
      return Math.round(speeds.reduce((sum, value) => sum + value, 0) / speeds.length);
    },
    observabilityStats() {
      return [
        {
          label: this.$t('dashboardMastery') || 'Mastery',
          value: `${this.masteredCount}/${this.sets.length || 0}`,
          detail: this.$t('sets') || 'Sets',
          color: 'text-kid-green',
        },
        {
          label: this.$t('dashboardAccuracy') || 'Accuracy',
          value: this.averageAccuracy === null ? '—' : `${this.averageAccuracy}%`,
          detail: `${this.attemptedSets.length} ${this.$t('dashboardAttempted') || 'attempted'}`,
          color: 'text-kid-blue',
        },
        {
          label: this.$t('dashboardPace') || 'Pace',
          value: this.averageSpeed === null ? '—' : `${this.averageSpeed}s`,
          detail: this.$t('dashboardPerExercise') || 'per exercise',
          color: 'text-amber-500',
        },
        {
          label: this.$t('dashboardToday') || 'Today',
          value: `${this.todaySets}/3`,
          detail: this.streak > 1 ? `${this.streak} ${this.$t('dayStreak') || 'day streak'}` : (this.$t('dashboardDailyGoal') || 'daily goal'),
          color: this.goalAchieved ? 'text-kid-green' : 'text-kid-text',
        },
      ];
    },
    recentAttempts() {
      return this.allHistoryEntries
        .slice()
        .sort((a, b) => Number(b.entry.ts || 0) - Number(a.entry.ts || 0))
        .slice(0, 3)
        .map(({ wb, entry, index }) => ({
          key: `${this.slugOf(wb)}-${entry.ts || index}`,
          title: wb.title,
          subject: wb.subject,
          statusLabel: this.statusLabel(entry.status || wb.status),
          badgeClass: this.statusBadgeClass(entry.status || wb.status),
          accuracy: Number.isFinite(Number(entry.accuracyPercent)) ? `${Math.round(Number(entry.accuracyPercent))}%` : (this.$t('dashboardNoScore') || 'No score'),
          speed: Number(entry.avgSecondsPerExercise) ? `${Math.round(Number(entry.avgSecondsPerExercise))}s` : '',
        }));
    },
  }
};
</script>
