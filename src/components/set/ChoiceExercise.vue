<template lang="pug">
  div(:class="cardClass" class="animate-slide-up" role="group" :aria-labelledby="`q-${exerciseNumber}`")
    QuestionHeader(:number="exerciseNumber" :question="exercise.question" spacing="mb-4")

    div(v-if="!isReadOnly")
      div(class="grid gap-3" :class="exercise.choices.length > 3 ? 'grid-cols-2' : 'grid-cols-1'" role="radiogroup" :aria-labelledby="`q-${exerciseNumber}`" @keydown="onArrowKey")
        button(
          v-for="(choice, idx) in exercise.choices"
          :key="choice"
          @click="selectChoice(choice)"
          :disabled="isSubmitted"
          :class="choiceClass(choice)"
          :tabindex="tabIndexFor(idx)"
          role="radio"
          :aria-checked="selected === choice"
          ref="choiceBtns"
        )
          span(class="inline-flex items-center justify-center w-6 h-6 mr-3 rounded-md bg-kid-blue/10 text-kid-blue text-xs font-black shadow-inner" aria-hidden="true") {{ idx + 1 }}
          span {{ choice }}
      p(v-if="showShortcutHint" class="mt-2 text-xs font-bold text-kid-muted text-center animate-slide-up") ⌨ {{ $t('hintShortcut') || 'Tip: press 1–9 to pick fast' }}

    div(v-if="isReadOnly" class="mt-1 space-y-2" role="list")
      div(
        v-for="choice in exercise.choices"
        :key="choice"
        :class="reviewClass(choiceStatus(choice))"
        role="listitem"
      )
        span(v-if="reviewIcon(choiceStatus(choice))" class="mr-2 font-black" aria-hidden="true") {{ reviewIcon(choiceStatus(choice)) }}
        span {{ choice }}
      HintCard(v-if="!isCorrect" class="mt-2" :message="encouragement" :answer="exercise.correctAnswer")
</template>

<script>
import { Formatter } from '../../utils/Formatter.js';
import { Encourage } from '../../utils/Encourage.js';
import QuestionHeader from './QuestionHeader.vue';
import HintCard from './HintCard.vue';

const REVIEW_VARIANTS = {
  win:    'border-kid-green bg-kid-green/10 text-kid-text shadow-md',
  answer: 'border-kid-green bg-kid-green/10 text-kid-text shadow-md',
  miss:   'border-kid-red bg-kid-red/10 text-kid-red line-through',
  idle:   'theme-border bg-kid-surface text-kid-muted',
};
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
    selected() { return this.exercise.answer || ''; },
    isCorrect() { return Formatter.normalizeAnswer(this.selected) === Formatter.normalizeAnswer(this.exercise.correctAnswer); },
    cardClass() {
      const v = this.isReadOnly ? (this.isCorrect ? 'correct' : 'incorrect') : (this.selected ? 'selected' : 'neutral');
      return `question-card question-card--${v}`;
    },
    encouragement() { return Encourage.message(this.$t.bind(this), this.exerciseNumber); },
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
      if (!Number.isFinite(n) || n < 1 || n > this.exercise.choices.length) return;
      e.preventDefault();
      this.selectChoice(this.exercise.choices[n - 1]);
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
      const selectedIdx = this.exercise.choices.indexOf(this.selected);
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
      const base = 'w-full flex items-center rounded-2xl border-2 px-4 py-3.5 text-base font-bold text-left transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-kid-blue/40';
      if (this.selected === choice) return `${base} border-kid-green bg-kid-green/15 text-kid-text shadow-md scale-[1.02]`;
      return `${base} theme-border-strong surface-2 text-kid-text hover:border-kid-blue/50 hover:bg-kid-blue/5 hover:shadow-sm hover:-translate-y-0.5`;
    },
    choiceStatus(choice) {
      const norm = Formatter.normalizeAnswer;
      const isAnswer = norm(choice) === norm(this.exercise.correctAnswer);
      const isPicked = norm(choice) === norm(this.selected);
      if (isAnswer) return isPicked ? 'win' : 'answer';
      return isPicked ? 'miss' : 'idle';
    },
    reviewClass(status) {
      const base = 'flex items-center rounded-2xl border-2 px-4 py-3 text-base font-bold transition-all';
      return `${base} ${REVIEW_VARIANTS[status]}`;
    },
    reviewIcon(status) { return REVIEW_ICONS[status] || ''; },
  },
};
</script>
