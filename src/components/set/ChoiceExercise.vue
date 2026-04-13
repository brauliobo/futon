<template lang="pug">
  div(:class="cardClass")
    div(class="flex items-start gap-3 mb-4")
      span(class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-kid-blue/10 text-kid-blue text-sm font-black") {{ exerciseNumber }}
      p(class="text-xl font-bold text-kid-text leading-snug pt-0.5") {{ exercise.question }}

    div(v-if="!isReadOnly" class="grid gap-3" :class="exercise.choices.length > 3 ? 'grid-cols-2' : 'grid-cols-1'")
      button(
        v-for="choice in exercise.choices"
        :key="choice"
        @click="selectChoice(choice)"
        :disabled="isSubmitted"
        :class="choiceClass(choice)"
      ) {{ choice }}

    div(v-if="isReadOnly" class="mt-1 space-y-2")
      div(
        v-for="choice in exercise.choices"
        :key="choice"
        :class="reviewChoiceClass(choice)"
      ) {{ choice }}
      div(v-if="!isCorrect" class="flex items-start gap-2 rounded-2xl bg-kid-red/10 border border-kid-red/20 px-3 py-2 mt-2")
        span ❌
        p(class="text-sm font-bold text-kid-red") {{ $t('correctAnswer') || 'Correct' }}: {{ exercise.correctAnswer }}
</template>

<script>
import { normalizeAnswer } from '../../utils/formatting.js';
export default {
  name: 'ChoiceExercise',
  emits: ['update-answer', 'next-exercise'],
  props: {
    exercise: { type: Object, required: true },
    exerciseNumber: { type: Number, required: true },
    isSubmitted: { type: Boolean, required: true },
    isReadOnly: { type: Boolean, default: false },
  },
  computed: {
    selected() { return this.exercise.answer || ''; },
    isCorrect() { return normalizeAnswer(this.selected) === normalizeAnswer(this.exercise.correctAnswer); },
    cardClass() {
      const base = 'space-y-2 rounded-2xl border-2 bg-white p-4 shadow-sm transition';
      if (this.isReadOnly) return this.isCorrect ? `${base} border-kid-green/30` : `${base} border-kid-red/30`;
      return this.selected ? `${base} border-kid-green/30` : `${base} border-black/5`;
    },
  },
  methods: {
    selectChoice(choice) {
      if (this.isSubmitted) return;
      this.$emit('update-answer', { answer: choice });
      this.$emit('next-exercise');
    },
    focus() {
      this.$nextTick(() => {
        const btn = this.$el?.querySelector('button:not(:disabled)');
        if (btn) btn.focus();
      });
    },
    choiceClass(choice) {
      const base = 'w-full rounded-2xl border-2 px-4 py-3 text-base font-bold text-left transition';
      if (this.selected === choice) return `${base} border-kid-green bg-kid-green/10 text-kid-text`;
      return `${base} border-black/10 bg-kid-bg text-kid-text hover:border-kid-blue/50 hover:bg-kid-blue/5`;
    },
    reviewChoiceClass(choice) {
      const base = 'rounded-2xl border-2 px-4 py-3 text-base font-bold';
      const isAnswer = normalizeAnswer(choice) === normalizeAnswer(this.exercise.correctAnswer);
      const isSelected = normalizeAnswer(choice) === normalizeAnswer(this.selected);
      if (isAnswer) return `${base} border-kid-green bg-kid-green/10 text-kid-text`;
      if (isSelected && !isAnswer) return `${base} border-kid-red bg-kid-red/10 text-kid-red line-through`;
      return `${base} border-black/8 bg-white text-kid-muted`;
    },
  },
};
</script>
