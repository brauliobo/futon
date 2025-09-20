<!-- src/components/discipline/Level.vue -->
<template lang="pug">
  .level.mt-4
    .row.g-3
      .col-12.col-md-6.col-lg-4(v-for="workbook in workbooks" :key="workbook.id || workbook.title")
        WorkbookCard(
          :workbook="workbook"
          :is-active="activeWorkbook && activeWorkbook.id === workbook.id"
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
  }
};
</script>

<style scoped>
</style>
