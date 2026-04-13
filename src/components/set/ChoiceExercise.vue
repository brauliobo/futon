<template lang="pug">
  div(:class="cardClass" class="animate-slide-up")
    div(class="flex items-start gap-3 mb-4")
      span(class="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-kid-blue/15 text-kid-blue text-sm font-black shadow-sm") {{ exerciseNumber }}
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
import { Formatter } from '../../utils/Formatter.js';
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
    isCorrect() { return Formatter.normalizeAnswer(this.selected) === Formatter.normalizeAnswer(this.exercise.correctAnswer); },
    cardClass() {
      const base = 'space-y-2 rounded-2xl border-2 bg-kid-surface p-4 shadow-sm transition-all duration-300';
      if (this.isReadOnly) return this.isCorrect ? `${base} border-kid-green/30 bg-kid-green/5` : `${base} border-kid-red/30 bg-kid-red/5`;
      return this.selected ? `${base} border-kid-green/30 green-glow` : `${base} border-black/5`;
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
      const base = 'w-full rounded-2xl border-2 px-4 py-3.5 text-base font-bold text-left transition-all duration-200 active:scale-95';
      if (this.selected === choice) return `${base} border-kid-green bg-kid-green/15 text-kid-text shadow-md scale-[1.02]`;
      return `${base} border-black/10 bg-kid-bg text-kid-text hover:border-kid-blue/50 hover:bg-kid-blue/5 hover:shadow-sm hover:-translate-y-0.5`;
    },
    reviewChoiceClass(choice) {
      const base = 'rounded-2xl border-2 px-4 py-3 text-base font-bold transition-all';
      const isAnswer = Formatter.normalizeAnswer(choice) === Formatter.normalizeAnswer(this.exercise.correctAnswer);
      const isSelected = Formatter.normalizeAnswer(choice) === Formatter.normalizeAnswer(this.selected);
      if (isAnswer) return `${base} border-kid-green bg-kid-green/10 text-kid-text shadow-md`;
      if (isSelected && !isAnswer) return `${base} border-kid-red bg-kid-red/10 text-kid-red line-through`;
      return `${base} border-black/8 bg-kid-surface text-kid-muted`;
    },
  },
};
</script>
