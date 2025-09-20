<!-- src/components/SetList.vue -->
<template lang="pug">
  .set-list
    Set(v-for="(workbook, index) in workbooks" :key="index" :workbook="workbook" @update-workbook="handleUpdateWorkbook")
</template>

<script>
import Set from "./set/Set.vue";

export default {
  name: "SetList",
  components: {
    Set,
  },
  props: {
    workbooks: {
      type: Array,
      required: true,
    },
  },
  methods: {
    handleUpdateWorkbook(updatedWorkbook) {
      // Emitir o evento para o componente pai atualizar o estado
      this.$emit("update-workbook", updatedWorkbook);
    },
  },
};
</script>

<style scoped>
.set-list {
  display: flex;
  flex-direction: column;
}
</style>

