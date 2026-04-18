<template lang="pug">
  div(:class="cardClass" class="animate-slide-up" role="group" :aria-labelledby="`q-${exerciseNumber}`")
    QuestionHeader(:number="exerciseNumber" :question="exercise.question" compact :answered="!!selected && !isReadOnly")

    div(v-if="!isReadOnly")
      div(:class="gridClass" role="radiogroup" :aria-labelledby="`q-${exerciseNumber}`" @keydown="onArrowKey")
        button(
          v-for="(choice, idx) in shuffledChoices"
          :key="choice"
          @click="selectChoice(choice)"
          :disabled="isSubmitted"
          :class="choiceClass(choice)"
          :tabindex="tabIndexFor(idx)"
          role="radio"
          :aria-checked="selected === choice"
          ref="choiceBtns"
        )
          span(:class="badgeClass" aria-hidden="true") {{ idx + 1 }}
          span {{ choice }}
      p(v-if="showShortcutHint" class="mt-2 text-sm font-bold text-kid-muted text-center animate-slide-up") ⌨ {{ $t('hintShortcut') || 'Tip: press 1–9 to pick fast' }}

    div(v-if="isReadOnly")
      div(:class="reviewListClass" role="list")
        div(
          v-for="(choice, idx) in shuffledChoices"
          :key="choice"
          :class="reviewClass(choiceStatus(choice))"
          :style="{ animationDelay: `${idx * 0.06}s` }"
          class="review-stagger"
          role="listitem"
        )
          span(v-if="reviewIcon(choiceStatus(choice))" class="mr-2 font-black" aria-hidden="true") {{ reviewIcon(choiceStatus(choice)) }}
          span {{ choice }}
      HintCard(v-if="!isCorrect" class="mt-2" :message="encouragement" :answer="exercise.correctAnswer")
</template>

<script>
import { Formatter } from '../../utils/Formatter.js';
import { Encourage } from '../../utils/Encourage.js';
import { Shuffle } from '../../utils/Shuffle.js';
import QuestionHeader from './QuestionHeader.vue';
import HintCard from './HintCard.vue';

const REVIEW_ICONS = { win: '✓', answer: '✓', miss: '✗' };
export default {
  name: 'ChoiceExercise',
  components: { QuestionHeader, HintCard },
  emits: ['update-answer', 'next-exercise'],
  props: {
    exercise: { type: Object, required: true },
    exerciseNumber: { type: Number, required: true },
    isSubmitted: { type: Boolean, required: true },
    isReadOnly: { type: Boolean, default: false },
  },
  data() { return { showShortcutHint: false }; },
  mounted() {
    window.addEventListener('keydown', this.onKeydown);
    if (this.exerciseNumber === 1 && !this.isReadOnly && !('ontouchstart' in window)) {
      const seen = Number(localStorage.getItem('futon-hint-shortcut-seen') || 0);
      if (seen < 5) {
        this.showShortcutHint = true;
        localStorage.setItem('futon-hint-shortcut-seen', String(seen + 1));
      }
    }
  },
  beforeUnmount() { window.removeEventListener('keydown', this.onKeydown); },
  computed: {
    // Deterministic per-question shuffle: same question → same layout on
    // retry, but the correct answer's position rotates across questions,
    // neutralizing authored-YAML position bias.
    shuffledChoices() { return Shuffle.withSeed(this.exercise.choices, this.exercise.question); },
    selected() { return this.exercise.answer || ''; },
    isCorrect() { return Formatter.normalizeAnswer(this.selected) === Formatter.normalizeAnswer(this.exercise.correctAnswer); },
    cardClass() {
      const v = this.isReadOnly ? (this.isCorrect ? 'correct' : 'incorrect') : (this.selected ? 'selected' : 'neutral');
      return `question-card question-card--${v}`;
    },
    encouragement() { return Encourage.message(this.$t.bind(this), this.exerciseNumber); },
    isPillMode() { return this.shuffledChoices.every(c => String(c).length <= 3); },
    gridClass() {
      if (this.isPillMode) return 'flex flex-wrap gap-2';
      return this.shuffledChoices.length > 3 ? 'grid gap-3 grid-cols-2' : 'grid gap-3 grid-cols-1';
    },
    badgeClass() {
      const base = 'inline-flex items-center justify-center rounded-md bg-kid-blue/10 text-kid-blue font-black shadow-inner';
      return this.isPillMode ? `${base} w-5 h-5 mr-1.5 text-[11px]` : `${base} w-6 h-6 mr-2 text-xs`;
    },
    reviewListClass() { return this.isPillMode ? 'mt-1 flex flex-wrap gap-1.5' : 'mt-1 space-y-2'; },
  },
  methods: {
    selectChoice(choice) {
      if (this.isSubmitted) return;
      navigator.vibrate?.(12);
      this.$emit('update-answer', { answer: choice });
      this.$emit('next-exercise');
    },
    onKeydown(e) {
      if (this.isSubmitted || this.isReadOnly) return;
      if (!this.$el?.contains?.(document.activeElement)) return;
      const n = parseInt(e.key, 10);
      if (!Number.isFinite(n) || n < 1 || n > this.shuffledChoices.length) return;
      e.preventDefault();
      this.selectChoice(this.shuffledChoices[n - 1]);
    },
    onArrowKey(e) {
      const arrows = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!(e.key in arrows) || this.isSubmitted) return;
      e.preventDefault();
      const btns = this.$refs.choiceBtns || [];
      const cur = btns.indexOf(document.activeElement);
      const next = ((cur < 0 ? 0 : cur) + arrows[e.key] + btns.length) % btns.length;
      btns[next]?.focus();
    },
    tabIndexFor(idx) {
      const selectedIdx = this.shuffledChoices.indexOf(this.selected);
      const focused = selectedIdx >= 0 ? selectedIdx : 0;
      return idx === focused ? 0 : -1;
    },
    focus() {
      this.$nextTick(() => {
        const btn = this.$el?.querySelector('button:not(:disabled)');
        if (btn) btn.focus();
      });
    },
    choiceClass(choice) {
      const variant = this.selected === choice ? 'choice-btn--selected' : 'choice-btn--idle';
      const shape = this.isPillMode ? 'choice-btn--pill' : '';
      return `choice-btn ${variant} ${shape}`.trim();
    },
    choiceStatus(choice) {
      const norm = Formatter.normalizeAnswer;
      const isAnswer = norm(choice) === norm(this.exercise.correctAnswer);
      const isPicked = norm(choice) === norm(this.selected);
      if (isAnswer) return isPicked ? 'win' : 'answer';
      return isPicked ? 'miss' : 'idle';
    },
    reviewClass(status) {
      const shape = this.isPillMode ? 'review-choice--pill' : '';
      return `review-choice review-choice--${status} ${shape}`.trim();
    },
    reviewIcon(status) { return REVIEW_ICONS[status] || ''; },
  },
};
</script>
