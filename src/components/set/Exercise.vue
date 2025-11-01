<!-- src/components/Exercise.vue -->
<template lang="pug">
  div(class="space-y-3 rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-sm shadow-slate-900/30")
    div(class="flex items-start gap-3")
      span(class="text-sm font-bold text-sky-300") {{ exerciseNumber }}.
      label(class="text-sm font-medium text-slate-100") {{ exercise.question }}
    div(v-if="!isReadOnly" class="relative")
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
      span(
        v-if="hasAnswer && !isEditing"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-lg"
      ) ✓
    div(v-if="isReadOnly" class="mt-2 text-sm")
      span(v-if="isCorrect" class="text-emerald-300") ✔️ {{ $t('correct') }}
      span(v-else class="text-rose-300") ❌ {{ $t('wrong') }} ({{ $t('correctAnswer') }}: {{ exercise.correctAnswer }})
</template>

<script>
export default {
  name: "Exercise",
  props: {
    exercise: {
      type: Object,
      required: true,
    },
    exerciseNumber: {
      type: Number,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      required: true,
    },
    isSubmitted: {
      type: Boolean,
      required: true,
    },
    isReadOnly: {
      type: Boolean,
      default: false,
    },
    setInputType: {
      type: String,
      default: 'auto',
    },
  },
  data() {
    return {
      userAnswer: this.exercise.answer || "",
      isEditing: false,
      isSubmitting: false,
    };
  },
  watch: {
    'exercise.answer'(newAnswer) {
      this.userAnswer = newAnswer || '';
      this.isEditing = false;
    }
  },
  computed: {
    hasAnswer() { return String(this.userAnswer || '').trim() !== ''; },
    isCorrect() {
      if (typeof this.exercise.correctAnswer === 'number') return Number(this.userAnswer) === this.exercise.correctAnswer;
      const normalize = (s) => String(s ?? '').trim().replace(/,/, '.').toLowerCase();
      return normalize(this.userAnswer) === normalize(this.exercise.correctAnswer);
    },
    inputType: () => 'text',
    inputMode() {
      return (this.setInputType === 'number' || (this.setInputType === 'auto' && typeof this.exercise.correctAnswer === 'number')) ? 'decimal' : 'text';
    },
    inputClass() {
      const base = "mt-2 w-full rounded-xl border border-white/10 px-3 py-2 pr-10 text-sm shadow-inner placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500";
      if (this.hasAnswer && !this.isEditing) {
        return base + " bg-slate-800/50 text-slate-400 shadow-slate-950/20";
      }
      return base + " bg-slate-950/70 text-slate-100 shadow-slate-950/40";
    },
  },
  methods: {
    handleSubmit() {
      if (this.isSubmitting || String(this.userAnswer).trim() === '') return;
      this.isSubmitting = true;
      this.$emit("update-answer", { answer: this.userAnswer });
      this.$emit("next-exercise");
      setTimeout(() => {
        this.isEditing = false;
        this.isSubmitting = false;
      }, 150);
    },
    focus() {
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


