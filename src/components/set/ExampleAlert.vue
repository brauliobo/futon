<!-- src/components/set/ExampleAlert.vue -->
<template lang="pug">
  div(data-testid="example-alert" class="flex items-start gap-2 rounded-2xl border-l-4 border-l-kid-blue bg-kid-blue/8 px-4 py-3 text-base font-semibold text-kid-text")
    span(class="text-lg flex-shrink-0") 💡
    div
      strong {{ $t('example') }}:
      span(class="ml-1")
        StructuredText(:value="displayExample")
</template>

<script>
import StructuredText from './StructuredText.vue';

export default {
  name: "ExampleAlert",
  components: { StructuredText },
  props: {
    example: {
      type: String,
      required: true,
    },
  },
  computed: {
    displayExample() {
      return String(this.example || '')
        .replace(/\s*=\s*→\s*/g, ' = ')
        .replace(/:\s*→\s*/g, ': ');
    },
  },
};
</script>

