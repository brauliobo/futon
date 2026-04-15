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
  div(v-else :class="cardClass" class="animate-slide-up" role="group" :aria-labelledby="`q-${exerciseNumber}`")
    QuestionHeader(:number="exerciseNumber" :question="exercise.question")

    div(v-if="!isReadOnly" class="relative mt-1")
      input(
        v-model="userAnswer"
        :type="inputType"
        :inputmode="inputMode"
        enterkeyhint="next"
        :disabled="isSubmitted"
        :placeholder="$t('enterAnswer')"
        :class="inputClass"
        :aria-labelledby="`q-${exerciseNumber}`"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @keydown.enter.prevent="handleSubmit"
        @keydown.tab="handleTab"
        @focus="isEditing = true"
        @blur="handleBlur"
        @click="isEditing = true"
        ref="inputRef"
      )
      span(v-if="hasAnswer && !isEditing" class="absolute right-4 top-1/2 -translate-y-1/2 text-kid-green text-2xl font-black animate-pop-in" aria-hidden="true") ✓
      button(
        v-if="hasAnswer && isEditing && !isSubmitted"
        @mousedown.prevent="clearAnswer"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-kid-muted/15 hover:bg-kid-red/20 hover:text-kid-red text-kid-muted text-base font-black flex items-center justify-center transition-colors"
        :aria-label="$t('clear') || 'Clear'"
      ) ×

    div(v-if="isReadOnly" class="mt-3")
      div(v-if="isCorrect" class="flex items-center gap-2 rounded-2xl bg-kid-green/10 border border-kid-green/20 px-4 py-3 shadow-sm")
        span(class="text-xl animate-pop-in" aria-hidden="true") ✅
        span(class="text-base font-bold text-kid-green") {{ $t('correct') || 'Correct!' }}
      HintCard(v-else :message="encouragement" :answer="exercise.correctAnswer")
</template>

<script>
import ChoiceExercise from './ChoiceExercise.vue';
import QuestionHeader from './QuestionHeader.vue';
import HintCard from './HintCard.vue';
import { Formatter } from '../../utils/Formatter.js';
import { Encourage } from '../../utils/Encourage.js';
export default {
  name: "Exercise",
  components: { ChoiceExercise, QuestionHeader, HintCard },
  props: {
    exercise: { type: Object, required: true },
    exerciseNumber: { type: Number, required: true },
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
    encouragement() { return Encourage.message(this.$t.bind(this), this.exerciseNumber); },
    inputClass() {
      const base = "w-full rounded-2xl border-4 px-4 py-4 text-xl font-bold placeholder:text-sm placeholder:font-semibold placeholder:text-kid-muted/50 focus:outline-none focus:ring-0 pr-12 transition-all duration-300";
      if (this.hasAnswer && !this.isEditing) return `${base} border-kid-green bg-kid-green/5 text-kid-text shadow-md green-glow`;
      return `${base} theme-border-strong bg-kid-surface text-kid-text focus:border-kid-blue focus:shadow-lg focus:blue-glow shadow-sm`;
    },
    cardClass() {
      const v = this.isReadOnly ? (this.isCorrect ? 'correct' : 'incorrect') : (this.hasAnswer ? 'answered' : 'neutral');
      return `question-card question-card--${v}`;
    },
  },
  methods: {
    handleSubmit() {
      if (this.isSubmitting || String(this.userAnswer).trim() === '') return;
      this.isSubmitting = true;
      navigator.vibrate?.(12);
      this.$emit("update-answer", { answer: this.userAnswer });
      this.$emit("next-exercise");
      setTimeout(() => { this.isEditing = false; this.isSubmitting = false; }, 150);
    },
    handleTab(e) {
      const trimmed = String(this.userAnswer || '').trim();
      if (!trimmed || trimmed === String(this.exercise.answer || '').trim()) return;
      this.$emit("update-answer", { answer: this.userAnswer });
    },
    handleBlur() {
      this.isEditing = false;
      const trimmed = String(this.userAnswer || '').trim();
      if (trimmed === String(this.exercise.answer || '').trim()) return;
      this.$emit("update-answer", { answer: this.userAnswer });
    },
    clearAnswer() {
      this.userAnswer = '';
      this.isEditing = true;
      this.$nextTick(() => this.$refs.inputRef?.focus());
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
