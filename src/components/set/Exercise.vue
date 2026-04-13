<!-- src/components/Exercise.vue -->
<template lang="pug">
  ChoiceExercise(
    v-if="exercise.choices && exercise.choices.length"
    :exercise="exercise"
    :exercise-number="exerciseNumber"
    :is-submitted="isSubmitted"
    :is-read-only="isReadOnly"
    @update-answer="$emit('update-answer', $event)"
    @next-exercise="$emit('next-exercise')"
    ref="choiceRef"
  )
  div(v-else :class="cardClass" class="animate-slide-up")
    div(class="flex items-start gap-3")
      span(class="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-kid-blue/15 text-kid-blue text-sm font-black shadow-sm") {{ exerciseNumber }}
      p(class="text-xl font-bold text-kid-text leading-snug pt-0.5") {{ exercise.question }}

    div(v-if="!isReadOnly" class="relative mt-1")
      input(
        v-model="userAnswer"
        :type="inputType"
        :inputmode="inputMode"
        enterkeyhint="next"
        :disabled="!isEnabled || isSubmitted"
        :placeholder="$t('enterAnswer')"
        :class="inputClass"
        @keydown.enter.prevent="handleSubmit"
        @keydown.tab.prevent="handleSubmit"
        @focus="isEditing = true"
        @blur="isEditing = false"
        @click="isEditing = true"
        ref="inputRef"
      )
      span(v-if="hasAnswer && !isEditing" class="absolute right-4 top-1/2 -translate-y-1/2 text-kid-green text-2xl font-black animate-pop-in") ✓

    div(v-if="isReadOnly" class="mt-3")
      div(v-if="isCorrect" class="flex items-center gap-2 rounded-2xl bg-kid-green/10 border border-kid-green/20 px-4 py-3 shadow-sm")
        span(class="text-xl animate-pop-in") ✅
        span(class="text-base font-bold text-kid-green") {{ $t('correct') || 'Correct!' }}
      div(v-else class="flex items-start gap-2 rounded-2xl bg-kid-red/10 border border-kid-red/20 px-4 py-3 shadow-sm")
        span(class="text-xl flex-shrink-0 animate-wiggle") ❌
        div
          p(class="text-sm font-bold text-kid-red") {{ $t('wrong') || 'Not quite!' }}
          p(class="text-base font-black text-kid-text mt-0.5") {{ $t('correctAnswer') || 'Answer' }}: {{ exercise.correctAnswer }}
</template>

<script>
import ChoiceExercise from './ChoiceExercise.vue';
import { Formatter } from '../../utils/Formatter.js';
export default {
  name: "Exercise",
  components: { ChoiceExercise },
  props: {
    exercise: { type: Object, required: true },
    exerciseNumber: { type: Number, required: true },
    isEnabled: { type: Boolean, required: true },
    isSubmitted: { type: Boolean, required: true },
    isReadOnly: { type: Boolean, default: false },
    setInputType: { type: String, default: 'auto' },
  },
  data() {
    return { userAnswer: this.exercise.answer || "", isEditing: false, isSubmitting: false };
  },
  watch: {
    'exercise.answer'(newAnswer) { this.userAnswer = newAnswer || ''; this.isEditing = false; }
  },
  computed: {
    hasAnswer() { return String(this.userAnswer || '').trim() !== ''; },
    isCorrect() {
      if (typeof this.exercise.correctAnswer === 'number') return Number(this.userAnswer) === this.exercise.correctAnswer;
      return Formatter.normalizeAnswer(this.userAnswer) === Formatter.normalizeAnswer(this.exercise.correctAnswer);
    },
    inputType: () => 'text',
    inputMode() {
      return (this.setInputType === 'number' || (this.setInputType === 'auto' && typeof this.exercise.correctAnswer === 'number')) ? 'decimal' : 'text';
    },
    inputClass() {
      const base = "w-full rounded-2xl border-4 px-4 py-4 text-xl font-bold placeholder:text-sm placeholder:font-semibold placeholder:text-kid-muted/50 focus:outline-none focus:ring-0 pr-12 transition-all duration-300";
      if (this.hasAnswer && !this.isEditing) return `${base} border-kid-green bg-kid-green/5 text-kid-text shadow-md green-glow`;
      return `${base} border-black/10 bg-kid-surface text-kid-text focus:border-kid-blue focus:shadow-lg focus:blue-glow shadow-sm`;
    },
    cardClass() {
      const base = 'space-y-2 rounded-2xl border-2 bg-kid-surface p-4 shadow-sm transition-all duration-300';
      if (this.isReadOnly) {
        return this.isCorrect ? `${base} border-kid-green/30 bg-kid-green/5` : `${base} border-kid-red/30 bg-kid-red/5`;
      }
      return this.hasAnswer ? `${base} border-kid-green/30` : `${base} border-black/5`;
    },
  },
  methods: {
    handleSubmit() {
      if (this.isSubmitting || String(this.userAnswer).trim() === '') return;
      this.isSubmitting = true;
      this.$emit("update-answer", { answer: this.userAnswer });
      this.$emit("next-exercise");
      setTimeout(() => { this.isEditing = false; this.isSubmitting = false; }, 150);
    },
    focus() {
      if (this.$refs.choiceRef?.focus) { this.$refs.choiceRef.focus(); return; }
      this.$nextTick(() => {
        const input = this.$refs.inputRef;
        if (!input) return;
        requestAnimationFrame(() => {
          input.focus({ preventScroll: true });
          input.setSelectionRange(input.value.length, input.value.length);
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    },
  },
};
</script>
