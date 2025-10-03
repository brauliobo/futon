<template lang="pug">
  .roadmap-container
    button.nav-arrow.nav-arrow--left(@click="scrollLeft" :disabled="!canScrollLeft" v-show="showLeftArrow")
      | ‹
    .roadmap.d-flex.align-items-stretch(ref="scroller")
      .level-card(v-for="(lvl, idx) in sequence" :key="lvl" :class="cardClass(lvl)")
        .level-card__inner(@click="onLevelClick($event, lvl)")
          .level-card__header
            .level-card__number {{ idx + 1 }}
            .level-card__level {{ lvl }}
          .level-card__content
            .level-card__name {{ getName(lvl) }}
          .level-card__footer
            Progress.level-card__progress(:value="progressPercent(lvl)" height="6px" variant="success")
    button.nav-arrow.nav-arrow--right(@click="scrollRight" :disabled="!canScrollRight" v-show="showRightArrow")
      | ›
</template>

<script>
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import Progress from "../ui/Progress.vue";
import Card from "../ui/Card.vue";

export default {
  name: 'LevelRoadmap',
  components: {
    Button,
    Badge,
    Progress,
    Card,
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
      cardWidth: 162, // min card width + gap
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
      
      return {
        'level-card--active': lvl === this.active,
        'level-card--disabled': !this.availableSet.has(lvl),
        'level-card--available': this.availableSet.has(lvl),
        'level-card--past': isPast,
        'level-card--future': isFuture
      };
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
      const cards = this.$el.querySelectorAll('.level-card');
      const el = cards && cards[activeIndex];
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }
}
</script>

<style scoped>
.roadmap-container {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 8px 0;
}

.roadmap {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 0 48px; /* room for arrows */
  scroll-padding-inline: 48px;
}

.roadmap::-webkit-scrollbar { display: none; }
.roadmap { -ms-overflow-style: none; scrollbar-width: none; }

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

.level-card {
  min-width: 150px;
  max-width: 180px;
  flex: 0 0 auto;
  scroll-snap-align: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.level-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #6c757d, #495057);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.level-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 123, 255, 0.3);
}

.level-card:hover::before {
  opacity: 1;
}

.level-card--active {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-color: #2196f3;
  box-shadow: 0 4px 20px rgba(33, 150, 243, 0.25);
  transform: translateY(-2px);
}

.level-card--active::before {
  opacity: 1;
  background: linear-gradient(90deg, #2196f3, #1976d2);
}

.level-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}

.level-card--disabled:hover {
  transform: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.level-card--past,
.level-card--future {
  opacity: 0.4;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #6c757d;
}

.level-card--past .level-card__name,
.level-card--future .level-card__name {
  color: #adb5bd;
}

.level-card--past .level-card__number,
.level-card--future .level-card__number {
  background: #6c757d;
  box-shadow: none;
}

.level-card--past .level-card__level,
.level-card--future .level-card__level {
  background: rgba(108, 117, 125, 0.1);
  color: #adb5bd;
}

.level-card--past:hover,
.level-card--future:hover {
  opacity: 0.6;
  transform: translateY(-2px);
}

.level-card__inner {
  padding: 20px 16px 16px 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.level-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.level-card__number {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  font-weight: 700;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.level-card--active .level-card__number {
  background: linear-gradient(135deg, #28a745, #20c997);
  box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
}

.level-card--disabled .level-card__number {
  background: #6c757d;
  box-shadow: none;
}

.level-card__level {
  background: rgba(108, 117, 125, 0.1);
  color: #495057;
  font-weight: 600;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.level-card--active .level-card__level {
  background: rgba(33, 150, 243, 0.15);
  color: #1976d2;
}

.level-card__content {
  flex: 1;
  display: flex;
  align-items: center;
}

.level-card__name {
  color: #2c3e50;
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.3;
  text-align: center;
  width: 100%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.level-card--active .level-card__name {
  color: #1565c0;
}

.level-card--disabled .level-card__name {
  color: #6c757d;
}

.level-card__footer {
  margin-top: auto;
}

.level-card__progress {
  border-radius: 3px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .level-card {
    min-width: 120px;
    max-width: 140px;
  }
  
  .level-card__inner {
    padding: 16px 12px 12px 12px;
  }
  
  .level-card__name {
    font-size: 0.85rem;
  }
  
  .level-card__number,
  .level-card__level {
    font-size: 0.7rem;
    padding: 3px 6px;
  }
}

/* Animation for new cards */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.level-card {
  animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>

 


