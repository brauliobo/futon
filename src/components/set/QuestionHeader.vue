<template lang="pug">
  div(class="flex items-center gap-2" :class="spacing")
    span(:class="['q-badge', { 'q-badge--compact': compact, 'q-badge--answered': answered }]" aria-hidden="true") {{ number }}
    p(:id="`q-${number}`" :class="textClass")
      StructuredText(:value="question")
</template>

<script>
import StructuredText from './StructuredText.vue';

export default {
  name: 'QuestionHeader',
  components: { StructuredText },
  props: {
    number: { type: Number, required: true },
    question: { type: String, required: true },
    spacing: { type: String, default: '' },
    compact: { type: Boolean, default: false },
    answered: { type: Boolean, default: false },
  },
  computed: {
    isShort() { return this.compact && String(this.question).trim().length <= 3; },
    textClass() {
      if (this.isShort) return 'text-4xl font-black text-kid-text leading-none';
      return this.compact ? 'text-lg font-semibold text-kid-text leading-tight tabular-nums' : 'text-xl font-bold text-kid-text leading-snug pt-0.5';
    },
  },
};
</script>
