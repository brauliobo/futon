<!-- src/components/Stat.vue -->
<template lang="pug">
  div(class="flex items-center gap-2 text-sm font-medium text-slate-200")
    span(class="text-slate-400") {{ label }}:
    strong(class="text-slate-100") {{ value }}
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



