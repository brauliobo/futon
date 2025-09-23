<!-- src/components/discipline/Level.vue -->
<template lang="pug">
  .level.mt-4
    .sets-container(v-if="visibleSets.length")
      .set-card(
        v-for="(setItem, index) in visibleSets" 
        :key="setItem.workbook.id || setItem.workbook.title"
        :class="{ 'set-card--faded': setItem.type !== 'current' }"
      )
        WorkbookCard(
          :workbook="setItem.workbook"
          :is-active="activeWorkbook && activeWorkbook.id === setItem.workbook.id"
          :class="{ 'workbook-card--faded': setItem.type !== 'current' }"
          @start="$emit('select-workbook', $event)"
        )
</template>

<script>
import WorkbookCard from "../set/SetCard.vue";

export default {
  name: "Level",
  components: {
    WorkbookCard,
  },
  emits: ['select-workbook'],
  props: {
    level: {
      type: String,
      required: true
    },
    discipline: {
      type: String,
      required: true
    },
    workbooks: {
      type: Array,
      required: true
    },
    activeWorkbook: {
      type: Object,
      default: null
    }
  },
  computed: {
    currentWorkbookIndex() {
      if (!this.activeWorkbook) return 0;
      const index = this.workbooks.findIndex(wb => wb.id === this.activeWorkbook.id || wb.title === this.activeWorkbook.title);
      return index >= 0 ? index : 0;
    },
    visibleSets() {
      if (!this.workbooks.length) return [];
      
      const currentIndex = this.currentWorkbookIndex;
      const sets = [];
      
      // Add previous set if not the first one
      if (currentIndex > 0) {
        sets.push({
          workbook: this.workbooks[currentIndex - 1],
          type: 'previous'
        });
      }
      
      // Add current set (always show at least one)
      sets.push({
        workbook: this.workbooks[currentIndex],
        type: 'current'
      });
      
      // Add next set if not the last one
      if (currentIndex < this.workbooks.length - 1) {
        sets.push({
          workbook: this.workbooks[currentIndex + 1],
          type: 'next'
        });
      }
      
      return sets;
    }
  }
};
</script>

<style scoped>
.sets-container {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  padding: 16px 0;
  scroll-behavior: smooth;
  justify-content: center;
  align-items: stretch;
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

.workbook-card--faded {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
  color: #6c757d !important;
}

.workbook-card--faded * {
  color: #adb5bd !important;
}

.workbook-card--faded .lesson-card__title {
  color: #6c757d !important;
}

.workbook-card--faded .lesson-card__button {
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
