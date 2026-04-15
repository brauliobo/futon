<template lang="pug">
  div(class="flex items-start gap-3" :class="spacing")
    span(class="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-kid-blue/15 text-kid-blue text-sm font-black shadow-sm" aria-hidden="true") {{ number }}
    p(:id="`q-${number}`" class="text-xl font-bold text-kid-text leading-snug pt-0.5") {{ question }}
</template>

<script>
export default {
  name: 'QuestionHeader',
  props: {
    number: { type: Number, required: true },
    question: { type: String, required: true },
    spacing: { type: String, default: '' },
  },
};
</script>
