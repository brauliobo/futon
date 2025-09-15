<template lang="pug">
  .level-list
    .row.g-3.mt-3
      .col-12.col-md-6.col-lg-4(v-for="(wb, idx) in workbooks" :key="idx")
        WorkbookCard(:workbook="wb" @start="$emit('start', wb)")
</template>

<script>
import WorkbookCard from "../../workbook/WorkbookCard.vue";
export default {
  name: 'LevelList',
  components: { WorkbookCard },
  props: {
    workbooks: { type: Array, required: true },
  },
};
</script>

<style scoped>
</style>



