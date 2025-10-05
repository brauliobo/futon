<template lang="pug">
  div(class="relative flex items-center overflow-hidden py-2")
    button(
      class="absolute left-0 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/60 text-lg font-bold text-slate-200 shadow backdrop-blur transition hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed sm:flex"
      @click="scrollLeft"
      :disabled="!canScrollLeft"
      v-show="showLeftArrow"
    )
      | ‹
    div(ref="scroller" class="flex snap-x snap-mandatory gap-3 overflow-x-auto px-12 py-1 scrollbar-hide")
      div(
        v-for="(lvl, idx) in sequence"
        :key="lvl"
        :class="cardClass(lvl)"
        :data-level-card="lvl"
        @click="onLevelClick($event, lvl)"
      )
        div(class="flex h-full flex-col gap-3 p-4")
          div(class="flex items-center justify-between")
            span(:class="numberClass(lvl)") {{ idx + 1 }}
            span(:class="tagClass(lvl)") {{ lvl }}
          div(class="flex-1")
            p(:class="nameClass(lvl)") {{ getName(lvl) }}
          Progress(:value="progressPercent(lvl)" height="6px" variant="success")
    button(
      class="absolute right-0 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/60 text-lg font-bold text-slate-200 shadow backdrop-blur transition hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed sm:flex"
      @click="scrollRight"
      :disabled="!canScrollRight"
      v-show="showRightArrow"
    )
      | ›
</template>

<script>
import Progress from "../ui/Progress.vue";

export default {
  name: 'LevelRoadmap',
  components: {
    Progress,
  },
  emits: ['select'],
  props: {
    sequence: { type: Array, required: true },
    available: { type: Array, required: true },
    active: { type: String, default: '' },
    progressByLevel: { type: Object, default: () => ({}) },
    getLevelName: { type: Function, required: true },
  },
  data() {
    return {
      cardWidth: 162,
      scrollPos: 0,
      maxScroll: 0,
    };
  },
  computed: {
    availableSet() { return new Set(this.available); },
    getCurrentLevelIndex() {
      return this.sequence.indexOf(this.active);
    },
    canScrollLeft() { return this.scrollPos > 0; },
    canScrollRight() { return this.scrollPos < Math.max(0, this.maxScroll - 1); },
    showLeftArrow() { return this.maxScroll > 0; },
    showRightArrow() { return this.maxScroll > 0; }
  },
  mounted() {
    this.$nextTick(() => {
      this.updateMetrics();
      this.scrollToActiveLevel();
      const el = this.$refs.scroller;
      if (el) el.addEventListener('scroll', this.onScroll, { passive: true });
    });
    window.addEventListener('resize', this.updateMetrics);
  },
  unmounted() {
    window.removeEventListener('resize', this.updateMetrics);
    const el = this.$refs.scroller; if (el) el.removeEventListener('scroll', this.onScroll);
  },
  watch: {
    active(newActive, oldActive) {
      if (newActive && newActive !== oldActive) {
        this.$nextTick(() => this.scrollToActiveLevel());
      }
    }
  },
  methods: {
    progressPercent(key){ const p = this.progressByLevel[key]; return p && Number.isFinite(p.percent) ? p.percent : 0; },
    cardClass(lvl){
      const currentIndex = this.getCurrentLevelIndex;
      const levelIndex = this.sequence.indexOf(lvl);
      const isPast = levelIndex < currentIndex && currentIndex !== -1;
      const isFuture = levelIndex > currentIndex && currentIndex !== -1;
      const base = 'flex min-w-[150px] max-w-[180px] snap-center cursor-pointer rounded-2xl border border-white/10 bg-slate-900/60 shadow transition hover:-translate-y-1 hover:border-sky-400/50 hover:shadow-sky-900/40';
      const state = [];
      if (lvl === this.active) state.push('border-sky-400/60 bg-sky-500/10 shadow-sky-900/40');
      if (!this.availableSet.has(lvl)) state.push('cursor-not-allowed opacity-40 hover:translate-y-0 hover:border-white/10 hover:shadow-none');
      if (isPast) state.push('opacity-60');
      if (isFuture) state.push('opacity-80');
      return [base, ...state].join(' ');
    },
    numberClass(lvl) {
      const base = 'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow';
      if (lvl === this.active) return `${base} bg-emerald-500/90 text-slate-950 shadow-emerald-500/40`;
      return `${base} bg-sky-500/80 text-white shadow-sky-900/30`;
    },
    tagClass(lvl) {
      const base = 'rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide';
      if (lvl === this.active) return `${base} bg-sky-500/20 text-sky-200`;
      return `${base} bg-slate-800/60 text-slate-300`;
    },
    nameClass(lvl) {
      const base = 'text-center text-sm font-semibold text-slate-200';
      if (lvl === this.active) return `${base} text-sky-100`;
      if (!this.availableSet.has(lvl)) return `${base} text-slate-500`;
      return base;
    },
    getName(id) { return this.getLevelName(id); },
    onLevelClick(event, lvl) {
      if (!this.availableSet.has(lvl)) return;
      this.$emit('select', lvl);
      this.$nextTick(() => this.scrollToActiveLevel());
    },
    scrollLeft() { this.$refs.scroller?.scrollBy({ left: -this.cardWidth * 2, behavior: 'smooth' }); },
    scrollRight() { this.$refs.scroller?.scrollBy({ left: this.cardWidth * 2, behavior: 'smooth' }); },
    onScroll() { const el = this.$refs.scroller; if (!el) return; this.scrollPos = el.scrollLeft; this.maxScroll = Math.max(0, el.scrollWidth - el.clientWidth); },
    updateMetrics() { const el = this.$refs.scroller; if (!el) return; this.maxScroll = Math.max(0, el.scrollWidth - el.clientWidth); this.scrollPos = el.scrollLeft; },
    scrollToActiveLevel() {
      if (!this.active) return;
      const activeIndex = this.sequence.indexOf(this.active);
      if (activeIndex < 0) return;
      const container = this.$refs.scroller;
      if (!container) return;
      const target = container.querySelector(`[data-level-card="${this.active}"]`);
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }
}
</script>
