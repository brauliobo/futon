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
  div(v-else :class="['question-card animate-slide-up', `question-card--${cardVariant}`, { 'card-pulse': pulsing }]" role="group" :aria-labelledby="`q-${exerciseNumber}`")
    div(v-if="usesFractionInput && !isReadOnly" class="flex items-center gap-3")
      QuestionHeader(:number="exerciseNumber" :question="exercise.question" compact :answered="hasAnswer")
      div(class="relative ml-auto")
        FractionAnswerInput(
          v-model="userAnswer"
          :disabled="isSubmitted"
          :allow-mixed="allowsMixedFraction"
          :aria-label="`q-${exerciseNumber}`"
          :clear-label="$t('clear') || 'Clear'"
          @submit="handleSubmit"
          @editing="handleFractionEditing"
          ref="fractionInputRef"
        )
        span(v-if="hasAnswer && !isEditing" class="absolute -right-1.5 -top-1.5 w-6 h-6 rounded-full bg-kid-blue text-white text-sm font-black flex items-center justify-center shadow-md ring-2 ring-kid-surface animate-stamp" aria-hidden="true") ✓
        span(v-if="hasAnswer && !isEditing" class="absolute inset-0 rounded-xl pointer-events-none animate-stamp-ring" aria-hidden="true")
    div(v-else-if="isNumeric && !isReadOnly" class="flex items-center gap-3")
      QuestionHeader(:number="exerciseNumber" :question="exercise.question" compact :answered="hasAnswer")
      div(class="relative ml-auto")
        input(
          v-model="userAnswer"
          :type="inputType"
          :inputmode="inputMode"
          enterkeyhint="next"
          :disabled="isSubmitted"
          :placeholder="placeholder"
          :class="['input-answer', `input-answer--${isNumeric ? 'numeric' : 'text'}`, (hasAnswer && !isEditing) ? 'input-answer--answered' : 'input-answer--idle']"
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
        span(v-if="hasAnswer && !isEditing" class="absolute -right-1.5 -top-1.5 w-6 h-6 rounded-full bg-kid-blue text-white text-sm font-black flex items-center justify-center shadow-md ring-2 ring-kid-surface animate-stamp" aria-hidden="true") ✓
        span(v-if="hasAnswer && !isEditing" class="absolute inset-0 rounded-xl pointer-events-none animate-stamp-ring" aria-hidden="true")
        button(
          v-if="hasAnswer && isEditing && !isSubmitted"
          @mousedown.prevent="clearAnswer"
          type="button"
          class="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-kid-muted/40 hover:bg-kid-red text-white text-[10px] font-black flex items-center justify-center transition-colors shadow"
          :aria-label="$t('clear') || 'Clear'"
        ) ×
    template(v-else)
      QuestionHeader(:number="exerciseNumber" :question="exercise.question" :answered="hasAnswer && !isReadOnly")
      div(v-if="!isReadOnly" :class="inputWrapClass")
        div(class="relative inline-block")
          input(
            v-model="userAnswer"
            :type="inputType"
            :inputmode="inputMode"
            enterkeyhint="next"
            :disabled="isSubmitted"
            :placeholder="placeholder"
            :class="['input-answer', `input-answer--${isNumeric ? 'numeric' : 'text'}`, (hasAnswer && !isEditing) ? 'input-answer--answered' : 'input-answer--idle']"
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
          span(v-if="hasAnswer && !isEditing" class="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-kid-blue text-white text-sm font-black flex items-center justify-center shadow-md animate-pop-in" aria-hidden="true") ✓
          button(
            v-if="hasAnswer && isEditing && !isSubmitted"
            @mousedown.prevent="clearAnswer"
            type="button"
            class="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-kid-muted/30 hover:bg-kid-red text-white text-xs font-black flex items-center justify-center transition-colors shadow-md"
            :aria-label="$t('clear') || 'Clear'"
          ) ×

    div(v-if="isReadOnly" class="mt-3 review-stagger")
      div(v-if="isCorrect" class="flex items-center gap-2 rounded-2xl bg-kid-green/10 border border-kid-green/20 px-4 py-3 shadow-sm")
        span(class="text-xl animate-pop-in" aria-hidden="true") ✅
        span(class="text-base font-bold text-kid-green") {{ $t('correct') || 'Correct!' }}
      HintCard(v-else :message="encouragement" :answer="exercise.correctAnswer" :user-answer="exercise.answer")
</template>

<script>
import ChoiceExercise from './ChoiceExercise.vue';
import QuestionHeader from './QuestionHeader.vue';
import HintCard from './HintCard.vue';
import FractionAnswerInput from './FractionAnswerInput.vue';
import { Formatter } from '../../utils/Formatter.js';
import { Encourage } from '../../utils/Encourage.js';
import { Fraction } from '../../utils/Fraction.js';
export default {
  name: "Exercise",
  components: { ChoiceExercise, QuestionHeader, HintCard, FractionAnswerInput },
  props: {
    exercise: { type: Object, required: true },
    exerciseNumber: { type: Number, required: true },
    isSubmitted: { type: Boolean, required: true },
    isReadOnly: { type: Boolean, default: false },
    setInputType: { type: String, default: 'auto' },
  },
  data() {
    return { userAnswer: this.exercise.answer || "", isEditing: false, isSubmitting: false, pulsing: false };
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
    usesFractionInput() {
      return Fraction.hasFraction(this.exercise.correctAnswer);
    },
    allowsMixedFraction() {
      return this.exercise.type === 'fraction_mixed' || Fraction.parseAnswer(this.exercise.correctAnswer).mixed;
    },
    canSubmitAnswer() {
      if (!this.usesFractionInput) return String(this.userAnswer).trim() !== '';
      const parsed = Fraction.parseAnswer(this.userAnswer);
      return String(parsed.numerator || '').trim() !== '' && String(parsed.denominator || '').trim() !== '';
    },
    encouragement() { return Encourage.message(this.$t.bind(this), this.exerciseNumber); },
    cardVariant() {
      if (this.isReadOnly) return this.isCorrect ? 'correct' : 'incorrect';
      return this.hasAnswer ? 'answered' : 'neutral';
    },
  },
  methods: {
    handleSubmit() {
      if (this.isSubmitting || !this.canSubmitAnswer) return;
      this.isSubmitting = true;
      navigator.vibrate?.(12);
      this.$emit("update-answer", { answer: this.userAnswer });
      this.$emit("next-exercise");
      this.pulsing = true;
      setTimeout(() => { this.isEditing = false; this.isSubmitting = false; this.pulsing = false; }, 500);
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
    handleFractionEditing(value) {
      this.isEditing = value;
      if (!value) this.handleBlur();
    },
    clearAnswer() {
      this.userAnswer = '';
      this.isEditing = true;
      this.$nextTick(() => this.$refs.inputRef?.focus());
    },
    focus() {
      if (this.$refs.choiceRef?.focus) { this.$refs.choiceRef.focus(); return; }
      if (this.$refs.fractionInputRef?.focus) { this.$refs.fractionInputRef.focus(); return; }
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
