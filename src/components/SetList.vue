<!-- src/components/SetList.vue -->
<template lang="pug">
  .set-list
    Set(v-for="(set, index) in sets" :key="index" :set="set" @update-set="handleUpdateSet")
</template>

<script>
import Set from "./set/Set.vue";

export default {
  name: "SetList",
  components: {
    Set,
  },
  props: {
    sets: {
      type: Array,
      required: true,
    },
  },
  methods: {
    handleUpdateSet(updatedSet) {
      // Emitir o evento para o componente pai atualizar o estado
      this.$emit("update-set", updatedSet);
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

