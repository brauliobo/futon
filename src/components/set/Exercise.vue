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
    div(v-if="isNumeric && !isReadOnly" class="flex items-center gap-3")
      QuestionHeader(:number="exerciseNumber" :question="exercise.question" compact)
      div(class="relative ml-auto")
        input(
          v-model="userAnswer"
          :type="inputType"
          :inputmode="inputMode"
          enterkeyhint="next"
          :disabled="isSubmitted"
          :placeholder="placeholder"
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
        span(v-if="hasAnswer && !isEditing" class="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-kid-green text-white text-xs font-black flex items-center justify-center shadow-md animate-pop-in" aria-hidden="true") ✓
        button(
          v-if="hasAnswer && isEditing && !isSubmitted"
          @mousedown.prevent="clearAnswer"
          type="button"
          class="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-kid-muted/40 hover:bg-kid-red text-white text-[10px] font-black flex items-center justify-center transition-colors shadow"
          :aria-label="$t('clear') || 'Clear'"
        ) ×
    template(v-else)
      QuestionHeader(:number="exerciseNumber" :question="exercise.question")
      div(v-if="!isReadOnly" :class="inputWrapClass")
        div(class="relative inline-block")
        input(
          v-model="userAnswer"
          :type="inputType"
          :inputmode="inputMode"
          enterkeyhint="next"
          :disabled="isSubmitted"
          :placeholder="placeholder"
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
        span(v-if="hasAnswer && !isEditing" class="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-kid-green text-white text-sm font-black flex items-center justify-center shadow-md animate-pop-in" aria-hidden="true") ✓
        button(
          v-if="hasAnswer && isEditing && !isSubmitted"
          @mousedown.prevent="clearAnswer"
          type="button"
          class="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-kid-muted/30 hover:bg-kid-red text-white text-xs font-black flex items-center justify-center transition-colors shadow-md"
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
    placeholder() { return this.inputMode === 'decimal' ? '?' : this.$t('enterAnswer'); },
    isNumeric() { return this.inputMode === 'decimal'; },
    inputWrapClass() {
      return this.isNumeric ? 'mt-1 flex justify-center' : 'mt-1';
    },
    encouragement() { return Encourage.message(this.$t.bind(this), this.exerciseNumber); },
    inputClass() {
      const base = 'rounded-xl border-2 font-black placeholder:font-bold placeholder:text-kid-muted/40 focus:outline-none focus:ring-0 transition-all duration-300';
      const size = this.isNumeric
        ? 'w-20 h-11 text-center text-2xl placeholder:text-2xl'
        : 'w-full px-4 py-4 text-xl placeholder:text-sm border-4';
      const tone = (this.hasAnswer && !this.isEditing)
        ? 'border-kid-green bg-kid-green/5 text-kid-text shadow-md green-glow'
        : 'theme-border-strong bg-kid-surface text-kid-text focus:border-kid-blue focus:shadow-lg focus:blue-glow shadow-sm';
      return `${base} ${size} ${tone}`;
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
