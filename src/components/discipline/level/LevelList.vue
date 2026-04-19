<template lang="pug">
  div(class="carousel")
    div(v-show="showLeftArrow" class="carousel-fade carousel-fade--left")
    div(v-show="showRightArrow" class="carousel-fade carousel-fade--right")
    button(class="carousel-arrow carousel-arrow--left" @click="scrollLeft" :disabled="!canScrollLeft" v-show="showLeftArrow") ‹
    div(class="carousel-viewport" ref="wrapper")
      div(class="carousel-track" :style="{ transform: `translateX(-${scrollOffset}px)` }" ref="track")
        div(
          v-for="(set, index) in sets"
          :key="set.id || set.title"
          :class="['set-card-slot', { 'set-card-slot--inactive': slugOf(set) !== activeSlug }]"
        )
          div(v-if="!isSetAvailable(index)" class="relative")
            SetCard(:set="set" :is-active="false" class="set-card--locked")
            div(class="set-lock-overlay")
              div(class="set-lock-icon")
                span(class="text-3xl animate-bounce-in") 🔒
              span(class="set-lock-hint") {{ $t('unlockHint') || 'Keep going to unlock!' }}
          SetCard(v-else :set="set" :is-active="slugOf(set) === activeSlug" @start="$emit('start', $event)")
    button(class="carousel-arrow carousel-arrow--right" @click="scrollRight" :disabled="!canScrollRight" v-show="showRightArrow") ›
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
    return {
      scrollOffset: 0,
      gap: 24,
      containerWidth: 0,
      cardWidth: 280,
    };
  },
  computed: {
    currentSetIndex() {
      if (!this.activeSlug) return 0;
      const index = this.sets.findIndex(wb => this.slugOf(wb) === this.activeSlug);
      return index >= 0 ? index : 0;
    },
    maxScrollOffset() {
      const totalWidth = this.sets.length * (this.cardWidth + this.gap);
      return Math.max(0, totalWidth - this.containerWidth);
    },
    canScrollLeft() {
      return this.scrollOffset > 0;
    },
    canScrollRight() {
      return this.scrollOffset < this.maxScrollOffset - 1;
    },
    showLeftArrow() {
      return this.maxScrollOffset > 0;
    },
    showRightArrow() {
      return this.maxScrollOffset > 0;
    },
    setAvailability() {
      const availability = {};
      this.sets.forEach((set, index) => {
        availability[index] = index === 0 || this.sets[index - 1]?.status === 'mastery';
      });
      return availability;
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.updateContainerWidth();
      this.scrollToActiveSet();
    });
    window.addEventListener('resize', this.updateContainerWidth);
  },
  unmounted() {
    window.removeEventListener('resize', this.updateContainerWidth);
  },
  watch: {
    activeSlug(newSlug, oldSlug) {
      if (newSlug && newSlug !== oldSlug) {
        this.$nextTick(() => this.scrollToActiveSet());
      }
    },
    sets: {
      handler() {
        this.$nextTick(() => {
          this.updateContainerWidth();
          this.scrollToActiveSet();
        });
      },
      deep: true
    }
  },
  methods: {
    slugOf(wb) { return Formatter.slugify(wb?.title); },
    scrollLeft() {
      const delta = this.cardWidth + this.gap;
      this.scrollOffset = Math.max(0, this.scrollOffset - delta);
    },
    scrollRight() {
      const delta = this.cardWidth + this.gap;
      this.scrollOffset = Math.min(this.maxScrollOffset, this.scrollOffset + delta);
    },
    updateContainerWidth() {
      const wrapper = this.$refs.wrapper;
      if (wrapper) this.containerWidth = wrapper.offsetWidth;
      const firstCard = this.$refs.track?.firstElementChild;
      if (firstCard) this.cardWidth = firstCard.offsetWidth;
    },
    scrollToActiveSet() {
      if (!this.activeSlug) return;
      const index = this.currentSetIndex;
      const delta = this.cardWidth + this.gap;
      const targetOffset = Math.max(0, (index * delta) - (this.containerWidth / 2) + (this.cardWidth / 2));
      this.scrollOffset = Math.min(targetOffset, this.maxScrollOffset);
    },
    isSetAvailable(index) {
      return this.setAvailability[index] ?? false;
    }
  }
};
</script>




