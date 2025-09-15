<!-- src/components/discipline/Discipline.vue -->
<template lang="pug">
  .discipline.mb-4
    h2.mb-3 {{ disciplineName }}
    LevelRoadmap(
      :sequence="levelSequence"
      :available="availableLevels"
      :active="activeLevel"
      :progress-by-level="progressByLevel"
      :get-level-name="getLevelName"
      @select="$emit('select-level', $event)"
    )
    Level(
      v-if="activeLevel"
      :level="activeLevel"
      :discipline="disciplineName"
      :workbooks="levelWorkbooks"
      :active-workbook="activeWorkbook"
      @select-workbook="$emit('select-workbook', $event)"
    )
</template>

<script>
import LevelRoadmap from "./LevelRoadmap.vue";
import Level from "./Level.vue";

export default {
  name: "Discipline",
  components: {
    LevelRoadmap,
    Level,
  },
  emits: ['select-level', 'select-workbook'],
  props: {
    disciplineName: {
      type: String,
      required: true
    },
    levelSequence: {
      type: Array,
      required: true
    },
    availableLevels: {
      type: Array,
      required: true
    },
    activeLevel: {
      type: String,
      default: ''
    },
    progressByLevel: {
      type: Object,
      default: () => ({})
    },
    getLevelName: {
      type: Function,
      required: true
    },
    levelWorkbooks: {
      type: Array,
      default: () => []
    },
    activeWorkbook: {
      type: Object,
      default: null
    }
  }
};
</script>

<style scoped>
</style>
