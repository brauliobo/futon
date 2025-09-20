<template lang="pug">
  .level-list
    .row.g-3.mt-3
      .col-12.col-md-6.col-lg-3(v-for="(wb, idx) in workbooks" :key="idx")
        WorkbookCard(:workbook="wb" :is-active="slugOf(wb) === activeSlug" @start="$emit('start', wb)")
</template>

<script>
import WorkbookCard from "../../set/SetCard.vue";
export default {
  name: 'LevelList',
  components: { WorkbookCard },
  props: {
    workbooks: { type: Array, required: true },
    activeSlug: { type: String, default: '' },
  },
  methods: {
    slugOf(wb) { return String(wb?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); },
  }
};
</script>

<style scoped>
</style>



