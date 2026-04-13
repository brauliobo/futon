<!-- src/components/Stat.vue -->
<template lang="pug">
  div(class="flex items-center gap-2 text-sm font-semibold text-kid-text")
    span(class="text-kid-muted") {{ label }}:
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



