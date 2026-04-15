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
  },
  computed: {
    badgeClass() {
      const base = 'flex-shrink-0 flex items-center justify-center rounded-full bg-kid-blue/15 text-kid-blue font-black shadow-sm';
      return this.compact ? `${base} w-6 h-6 text-[11px]` : `${base} w-9 h-9 text-sm`;
    },
    textClass() {
      return this.compact ? 'text-base font-semibold text-kid-text leading-tight tabular-nums' : 'text-xl font-bold text-kid-text leading-snug pt-0.5';
    },
  },
};
</script>
