<template lang="pug">
  .roadmap.d-flex.align-items-stretch.overflow-auto
    .level-card(v-for="(lvl, idx) in sequence" :key="lvl" :class="cardClass(lvl)")
      .level-card__inner(@click="onLevelClick($event, lvl)")
        .level-card__header
          .level-card__number {{ idx + 1 }}
          .level-card__level {{ lvl }}
        .level-card__content
          .level-card__name {{ getName(lvl) }}
        .level-card__footer
          Progress.level-card__progress(:value="progressPercent(lvl)" height="6px" variant="success")
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
  computed: {
    availableSet() { return new Set(this.available); },
  },
  mounted() {
    this.$nextTick(() => this.scrollToActiveLevel());
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
      return {
        'level-card--active': lvl === this.active,
        'level-card--disabled': !this.availableSet.has(lvl),
        'level-card--available': this.availableSet.has(lvl)
      };
    },
    getName(id) { return this.getLevelName(id); },
    onLevelClick(event, lvl) {
      if (!this.availableSet.has(lvl)) return;
      this.$emit('select', lvl);
      // Scroll the level card to center of horizontal view
      const levelCard = event.target.closest('.level-card');
      if (levelCard) {
        levelCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    },
    scrollToActiveLevel() {
      if (!this.active) return;
      const activeCard = this.$el.querySelector('.level-card--active');
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }
}
</script>

<style scoped>
.roadmap {
  padding: 8px;
  gap: 12px;
}

.level-card {
  min-width: 150px;
  max-width: 180px;
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

 


