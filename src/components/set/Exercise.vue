<!-- src/components/Exercise.vue -->
<template lang="pug">
  div(class="space-y-3 rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-sm shadow-slate-900/30")
    div(class="flex items-start gap-3")
      span(class="text-sm font-bold text-sky-300") {{ exerciseNumber }}.
      label(class="text-sm font-medium text-slate-100") {{ exercise.question }}
    div(v-if="!isReadOnly")
      input(
        v-if="showInput"
        v-model="userAnswer"
        :type="inputType"
        :inputmode="inputMode"
        enterkeyhint="next"
        :disabled="!isEnabled || isSubmitted"
        :placeholder="$t('enterAnswer')"
        @keydown.enter.prevent="handleSubmit"
        @keydown.tab.prevent="handleSubmit"
        ref="inputRef"
        class="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
      )
      div(v-else class="mt-2 flex items-center gap-3 text-sm text-slate-200")
        span {{ userAnswer }}
        Button(variant="link" size="sm" @click="editAnswer" aria-label="Editar resposta") {{ $t('edit') || 'Editar' }}
    div(v-if="isReadOnly" class="mt-2 text-sm")
      span(v-if="isCorrect" class="text-emerald-300") ✔️ {{ $t('correct') }}
      span(v-else class="text-rose-300") ❌ {{ $t('wrong') }} ({{ $t('correctAnswer') }}: {{ exercise.correctAnswer }})
</template>

<script>
import Button from "../ui/Button.vue";

export default {
  name: "Exercise",
  components: {
    Button,
  },
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
      showInput: true,
      isSubmitting: false,
    };
  },
  watch: {
    'exercise.answer'(newAnswer) {
      this.userAnswer = newAnswer || '';
      this.showInput = true;
    }
  },
  computed: {
    isCorrect() {
      if (typeof this.exercise.correctAnswer === 'number') return Number(this.userAnswer) === this.exercise.correctAnswer;
      const normalize = (s) => String(s ?? '').trim().replace(/,/, '.').toLowerCase();
      return normalize(this.userAnswer) === normalize(this.exercise.correctAnswer);
    },
    inputType: () => 'text',
    inputMode() {
      return (this.setInputType === 'number' || (this.setInputType === 'auto' && typeof this.exercise.correctAnswer === 'number')) ? 'decimal' : 'text';
    }
  },
  methods: {
    handleSubmit() {
      if (this.isSubmitting || String(this.userAnswer).trim() === '') return;
      this.isSubmitting = true;
      this.$emit("update-answer", { answer: this.userAnswer });
      this.$emit("next-exercise");
      setTimeout(() => {
        this.showInput = false;
        this.isSubmitting = false;
      }, 150);
    },
    focus() {
      this.$nextTick(() => {
        const input = this.$refs.inputRef;
        if (!input || !this.showInput) return;
        requestAnimationFrame(() => {
          input.focus({ preventScroll: true });
          input.setSelectionRange(input.value.length, input.value.length);
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    },
    editAnswer() {
      if (this.isReadOnly || this.isSubmitted) return;
      this.showInput = true;
      this.$nextTick(() => { this.focus(); });
    },
  },
};
</script>


