<template lang="pug">
  .level-list
    .sets-container-wrapper
      button.nav-arrow.nav-arrow--left(@click="scrollLeft" :disabled="!canScrollLeft" v-show="showLeftArrow")
        | ‹
      .sets-container(:style="{ transform: `translateX(-${scrollOffset}px)` }")
        .set-card(
          v-for="(set, index) in sets" 
          :key="set.id || set.title"
          :class="{ 'set-card--faded': slugOf(set) !== activeSlug }"
        )
          SetCard(
            :set="set"
            :is-active="slugOf(set) === activeSlug"
            :class="{ 'set-card--faded': slugOf(set) !== activeSlug }"
            @start="$emit('start', $event)"
          )
      button.nav-arrow.nav-arrow--right(@click="scrollRight" :disabled="!canScrollRight" v-show="showRightArrow")
        | ›
</template>

<script>
import SetCard from "../../set/SetCard.vue";
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
      cardWidth: 324, // min-width + gap
      containerWidth: 0
    };
  },
  computed: {
    currentSetIndex() {
      if (!this.activeSlug) return 0;
      const index = this.sets.findIndex(wb => this.slugOf(wb) === this.activeSlug);
      return index >= 0 ? index : 0;
    },
    maxScrollOffset() {
      const totalWidth = this.sets.length * this.cardWidth;
      return Math.max(0, totalWidth - this.containerWidth);
    },
    canScrollLeft() {
      return this.scrollOffset > 0;
    },
    canScrollRight() {
      return this.scrollOffset < this.maxScrollOffset;
    },
    showLeftArrow() {
      return this.maxScrollOffset > 0;
    },
    showRightArrow() {
      return this.maxScrollOffset > 0;
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
      console.log(`[LevelList] activeSlug changed from ${oldSlug} to ${newSlug}`);
      if (this.sets.length) {
        console.log('[LevelList] Set slugs:', this.sets.map(wb => this.slugOf(wb)));
        console.log('[LevelList] Active matches:', this.sets.filter(wb => this.slugOf(wb) === newSlug).map(wb => wb.title));
      }
      if (newSlug && newSlug !== oldSlug) {
        this.$nextTick(() => this.scrollToActiveSet());
      }
    }
  },
  methods: {
    slugOf(wb) { return String(wb?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); },
    scrollLeft() {
      const newOffset = Math.max(0, this.scrollOffset - this.cardWidth * 2);
      this.scrollOffset = newOffset;
    },
    scrollRight() {
      const newOffset = Math.min(this.maxScrollOffset, this.scrollOffset + this.cardWidth * 2);
      this.scrollOffset = newOffset;
    },
    updateContainerWidth() {
      const container = this.$el.querySelector('.sets-container-wrapper');
      if (container) {
        this.containerWidth = container.offsetWidth - 80; // Account for arrow buttons
      }
    },
    scrollToActiveSet() {
      if (!this.activeSlug) return;
      const activeIndex = this.currentSetIndex;
      if (activeIndex >= 0) {
        const targetOffset = Math.max(0, (activeIndex * this.cardWidth) - (this.containerWidth / 2));
        this.scrollOffset = Math.min(targetOffset, this.maxScrollOffset);
      }
    }
  }
};
</script>

<style scoped>
.sets-container-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 16px 0;
}

.sets-container {
  display: flex;
  gap: 24px;
  transition: transform 0.3s ease;
  align-items: stretch;
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dee2e6;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: #495057;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-arrow:hover:not(:disabled) {
  background: #007bff;
  color: white;
  transform: translateY(-50%) scale(1.1);
}

.nav-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-arrow--left {
  left: 0;
}

.nav-arrow--right {
  right: 0;
}

.set-card {
  min-width: 300px;
  max-width: 400px;
  flex: 0 0 auto;
  transition: all 0.3s ease;
}

.set-card--faded {
  opacity: 0.5;
  transform: scale(0.95);
  pointer-events: none;
}

.set-card--faded:hover {
  opacity: 0.7;
}

.set-card--faded {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
  color: #6c757d !important;
}

.set-card--faded * {
  color: #adb5bd !important;
}

.set-card--faded .lesson-card__title {
  color: #6c757d !important;
}

.set-card--faded .lesson-card__button {
  background: #6c757d !important;
  opacity: 0.7;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .sets-container {
    gap: 16px;
    padding: 12px 0;
  }
  
  .set-card {
    min-width: 280px;
  }
}

@media (max-width: 576px) {
  .sets-container {
    gap: 12px;
  }
  
  .set-card {
    min-width: 250px;
  }
}
</style>



