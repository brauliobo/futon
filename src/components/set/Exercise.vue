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
  div(v-else :class="cardClass")
    div(class="flex items-start gap-3")
      span(class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-kid-blue/10 text-kid-blue text-sm font-black") {{ exerciseNumber }}
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
      span(v-if="hasAnswer && !isEditing" class="absolute right-4 top-1/2 -translate-y-1/2 text-kid-green text-2xl font-black") ✓

    div(v-if="isReadOnly" class="mt-3")
      div(v-if="isCorrect" class="flex items-center gap-2 rounded-2xl bg-kid-green/10 border border-kid-green/20 px-4 py-3")
        span(class="text-xl") ✅
        span(class="text-base font-bold text-kid-green") {{ $t('correct') || 'Correct!' }}
      div(v-else class="flex items-start gap-2 rounded-2xl bg-kid-red/10 border border-kid-red/20 px-4 py-3")
        span(class="text-xl flex-shrink-0") ❌
        div
          p(class="text-sm font-bold text-kid-red") {{ $t('wrong') || 'Not quite!' }}
          p(class="text-base font-black text-kid-text mt-0.5") {{ $t('correctAnswer') || 'Answer' }}: {{ exercise.correctAnswer }}
</template>

<script>
import ChoiceExercise from './ChoiceExercise.vue';
import { normalizeAnswer } from '../../utils/formatting.js';
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
      return normalizeAnswer(this.userAnswer) === normalizeAnswer(this.exercise.correctAnswer);
    },
    inputType: () => 'text',
    inputMode() {
      return (this.setInputType === 'number' || (this.setInputType === 'auto' && typeof this.exercise.correctAnswer === 'number')) ? 'decimal' : 'text';
    },
    inputClass() {
      const base = "w-full rounded-2xl border-4 px-4 py-4 text-xl font-bold shadow-sm placeholder:text-slate-300 focus:outline-none focus:ring-0 pr-12 transition";
      if (this.hasAnswer && !this.isEditing) return `${base} border-kid-green bg-kid-green/5 text-kid-text`;
      return `${base} border-black/10 bg-white text-kid-text focus:border-kid-blue`;
    },
    cardClass() {
      const base = 'space-y-2 rounded-2xl border-2 bg-white p-4 shadow-sm transition';
      if (this.isReadOnly) {
        return this.isCorrect ? `${base} border-kid-green/30` : `${base} border-kid-red/30`;
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
