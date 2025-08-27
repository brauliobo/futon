<!-- src/components/Stat.vue -->
<template>
  <div class="stat d-flex align-items-center mb-1">
    <span class="me-2">{{ label }}:</span>
    <strong>{{ value }}</strong>
  </div>
  
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


