<template lang="pug">
  div(class="relative py-4")
    div(v-show="showLeftArrow" class="pointer-events-none absolute inset-y-0 left-0 z-[5] w-14 bg-gradient-to-r from-kid-surface via-kid-surface/90 to-transparent")
    div(v-show="showRightArrow" class="pointer-events-none absolute inset-y-0 right-0 z-[5] w-14 bg-gradient-to-l from-kid-surface via-kid-surface/90 to-transparent")
    button(
      class="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border theme-border bg-kid-surface text-lg font-bold text-kid-text shadow-md backdrop-blur transition-all hover:bg-[color:var(--kid-surface-2)] hover:shadow-lg active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
      @click="scrollLeft"
      :disabled="!canScrollLeft"
      v-show="showLeftArrow"
    )
      | ‹
    div(class="overflow-hidden px-14 sm:px-8" ref="wrapper")
      div(class="flex items-stretch gap-6 transition-transform" :style="{ transform: `translateX(-${scrollOffset}px)` }" ref="track")
        div(
          v-for="(set, index) in sets"
          :key="set.id || set.title"
          :class="['set-card-slot', { 'set-card-slot--inactive': slugOf(set) !== activeSlug }]"
        )
          div(v-if="!isSetAvailable(index)" class="relative")
            SetCard(:set="set" :is-active="false" class="opacity-40 pointer-events-none select-none")
            div(class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl overlay-bg backdrop-blur-[3px] cursor-default")
              div(class="flex h-16 w-16 items-center justify-center rounded-full bg-kid-surface shadow-md border theme-border")
                span(class="text-3xl animate-bounce-in") 🔒
              span(class="px-4 text-center text-sm font-black text-kid-text") {{ $t('unlockHint') || 'Keep going to unlock!' }}
          SetCard(
            v-else
            :set="set"
            :is-active="slugOf(set) === activeSlug"
            @start="$emit('start', $event)"
          )
    button(
      class="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border theme-border bg-kid-surface text-lg font-bold text-kid-text shadow-md backdrop-blur transition-all hover:bg-[color:var(--kid-surface-2)] hover:shadow-lg active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
      @click="scrollRight"
      :disabled="!canScrollRight"
      v-show="showRightArrow"
    )
      | ›
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




