<template lang="pug">
  div(class="flex items-center gap-2" :class="spacing")
    span(:class="badgeClass" aria-hidden="true") {{ number }}
    p(:id="`q-${number}`" :class="textClass") {{ question }}
</template>

<script>
export default {
  name: 'QuestionHeader',
  props: {
    number: { type: Number, required: true },
    question: { type: String, required: true },
    spacing: { type: String, default: '' },
    compact: { type: Boolean, default: false },
    answered: { type: Boolean, default: false },
  },
  computed: {
    badgeClass() {
      const base = 'flex-shrink-0 flex items-center justify-center rounded-full font-black shadow-sm transition-colors duration-300';
      const tone = this.answered ? 'bg-kid-blue text-white' : 'surface-2 border theme-border-strong text-kid-blue';
      const size = this.compact ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
      return `${base} ${tone} ${size}`;
    },
    textClass() {
      return this.compact ? 'text-lg font-semibold text-kid-text leading-tight tabular-nums' : 'text-xl font-bold text-kid-text leading-snug pt-0.5';
    },
  },
};
</script>
