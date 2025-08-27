<!-- src/components/WorkbookList.vue -->
<template>
  <div class="workbook-list">
    <Workbook
      v-for="(workbook, index) in workbooks"
      :key="index"
      :workbook="workbook"
      @update-workbook="handleUpdateWorkbook"
    />
  </div>
</template>

<script>
import Workbook from "./Workbook.vue";

export default {
  name: "WorkbookList",
  components: {
    Workbook,
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
.workbook-list {
  display: flex;
  flex-direction: column;
}
</style>

