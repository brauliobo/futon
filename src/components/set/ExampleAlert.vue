<!-- src/components/set/ExampleAlert.vue -->
<template lang="pug">
  div(class="flex items-start gap-2 rounded-2xl border-l-4 border-l-kid-blue bg-kid-blue/8 px-4 py-3 text-base font-semibold text-kid-text")
    span(class="text-lg flex-shrink-0") 💡
    div
      strong {{ $t('example') }}:
      |  {{ example }}
</template>

<script>
export default {
  name: "ExampleAlert",
  props: {
    example: {
      type: String,
      required: true,
    },
  },
};
</script>


