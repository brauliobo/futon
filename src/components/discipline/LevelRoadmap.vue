<template lang="pug">
  div(class="relative flex items-center overflow-hidden py-2")
    div(v-show="showLeftArrow" class="pointer-events-none absolute inset-y-0 left-0 z-[5] w-14 bg-gradient-to-r from-kid-surface via-kid-surface/90 to-transparent")
    div(v-show="showRightArrow" class="pointer-events-none absolute inset-y-0 right-0 z-[5] w-14 bg-gradient-to-l from-kid-surface via-kid-surface/90 to-transparent")
    button(
      class="absolute left-0 z-10 flex h-12 w-12 items-center justify-center rounded-full border theme-border bg-kid-surface text-lg font-bold text-kid-text shadow-sm transition hover:bg-[color:var(--kid-surface-2)] disabled:opacity-30 disabled:cursor-not-allowed"
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
        class="relative"
      )
        div(class="flex h-full flex-col gap-3 p-4")
          div(class="flex items-center justify-between")
            span(:class="numberClass(lvl)") {{ idx + 1 }}
            span(:class="tagClass(lvl)") {{ lvl }}
          div(class="flex-1")
            p(:class="nameClass(lvl)") {{ getName(lvl) }}
          Progress(:value="progressPercent(lvl)" height="6px" variant="success")
        div(v-if="!availableSet.has(lvl)" class="absolute inset-0 flex items-center justify-center rounded-2xl overlay-bg backdrop-blur-[1px]")
          span(class="text-2xl") 🔒
    button(
      class="absolute right-0 z-10 flex h-12 w-12 items-center justify-center rounded-full border theme-border bg-kid-surface text-lg font-bold text-kid-text shadow-sm transition hover:bg-[color:var(--kid-surface-2)] disabled:opacity-30 disabled:cursor-not-allowed"
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
    cardClass(lvl) {
      if (!this.availableSet.has(lvl)) return 'level-card level-card--locked';
      return lvl === this.active ? 'level-card level-card--active' : 'level-card level-card--idle';
    },
    numberClass(lvl) { return lvl === this.active ? 'level-card__number level-card__number--active' : 'level-card__number'; },
    tagClass(lvl)    { return lvl === this.active ? 'level-card__tag level-card__tag--active'       : 'level-card__tag'; },
    nameClass(lvl) {
      if (lvl === this.active) return 'level-card__name level-card__name--active';
      if (!this.availableSet.has(lvl)) return 'level-card__name level-card__name--locked';
      return 'level-card__name';
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
