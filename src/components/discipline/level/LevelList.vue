<template lang="pug">
  div(class="carousel")
    div(v-show="showLeftArrow" class="carousel-fade carousel-fade--left")
    div(v-show="showRightArrow" class="carousel-fade carousel-fade--right")
    button(class="carousel-arrow carousel-arrow--left" @click="scrollBy(-1)" :disabled="!canScrollLeft" v-show="showLeftArrow") ‹
    div(ref="scroller" class="carousel-scroller" @scroll.passive="onScroll")
      div(
        v-for="(set, index) in sets"
        :key="set.id || set.title"
        :data-set-slug="slugOf(set)"
        :class="['set-card-slot', { 'set-card-slot--inactive': slugOf(set) !== activeSlug }]"
      )
        div(v-if="!isSetAvailable(index)" class="relative")
          SetCard(:set="set" :is-active="false" class="set-card--locked")
          div(class="set-lock-overlay")
            div(class="set-lock-icon")
              span(class="text-3xl animate-bounce-in") 🔒
            span(class="set-lock-hint") {{ $t('unlockHint') || 'Keep going to unlock!' }}
        SetCard(v-else :set="set" :is-active="slugOf(set) === activeSlug" @start="$emit('start', $event)")
    button(class="carousel-arrow carousel-arrow--right" @click="scrollBy(1)" :disabled="!canScrollRight" v-show="showRightArrow") ›
</template>

<script>
import SetCard from "../../set/SetCard.vue";
import { Formatter } from "../../../utils/Formatter.js";
export default {
  name: 'LevelList',
  components: { SetCard },
  props: {
    sets: { type: Array, required: true },
    activeSlug: { type: String, default: '' },
  },
  data() {
    return { scrollLeft: 0, maxScroll: 0 };
  },
  computed: {
    canScrollLeft() { return this.scrollLeft > 0; },
    canScrollRight() { return this.scrollLeft < this.maxScroll - 1; },
    showLeftArrow() { return this.maxScroll > 0; },
    showRightArrow() { return this.maxScroll > 0; },
  },
  mounted() {
    this.$nextTick(() => { this.updateMetrics(); this.scrollToActiveSet(); });
    window.addEventListener('resize', this.updateMetrics);
  },
  unmounted() { window.removeEventListener('resize', this.updateMetrics); },
  watch: {
    activeSlug(v, prev) { if (v && v !== prev) this.$nextTick(() => this.scrollToActiveSet()); },
    sets: { deep: true, handler() { this.$nextTick(() => { this.updateMetrics(); this.scrollToActiveSet(); }); } },
  },
  methods: {
    slugOf(wb) { return Formatter.slugify(wb?.title); },
    isSetAvailable(index) { return index === 0 || this.sets[index - 1]?.status === 'mastery'; },
    onScroll() { const el = this.$refs.scroller; if (el) this.scrollLeft = el.scrollLeft; },
    updateMetrics() {
      const el = this.$refs.scroller; if (!el) return;
      this.scrollLeft = el.scrollLeft;
      this.maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    },
    scrollBy(direction) {
      const el = this.$refs.scroller; if (!el) return;
      el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
    },
    scrollToActiveSet() {
      const el = this.$refs.scroller; if (!el || !this.activeSlug) return;
      const target = el.querySelector(`[data-set-slug="${this.activeSlug}"]`);
      target?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    },
  }
};
</script>
