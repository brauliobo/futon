<!-- src/components/Stat.vue -->
<template lang="pug">
  .stat.d-flex.align-items-center.mb-1
    span.me-2 {{ label }}:
    strong {{ value }}
</template>

<script>
export default {
  name: "Stat",
  props: {
    label: {
      type: String,
      required: true,
    },
    value: {
      type: [String, Number],
      required: true,
    },
  },
};
</script>

<style scoped>
.stat {
  font-size: 1.1rem;
}
</style>


