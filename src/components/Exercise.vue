<!-- src/components/Exercise.vue -->
<template lang="pug">
  .exercise.mb-4
    .d-flex.align-items-center
      span.me-3.fw-bold {{ exerciseNumber }}.
      label.flex-grow-1.mb-0 {{ exercise.question }}
    div(v-if="!isReadOnly")
      input.form-control.form-control-lg.mt-2(v-if="showInput" v-model="userAnswer" :type="inputType" :disabled="!isEnabled || isSubmitted" :placeholder="$t('enterAnswer')" @keydown.enter.prevent="handleSubmit" @keydown.tab.prevent="handleSubmit" @keyup.tab.prevent="handleSubmit" ref="inputRef")
      .mt-2.d-flex.align-items-center.gap-2(v-else)
        span.text-dark {{ userAnswer }}
        button.btn.btn-sm.btn-link(@click="editAnswer" aria-label="Editar resposta") {{ $t('edit') || 'Editar' }}
    .mt-2(v-if="isReadOnly")
      span.text-success(v-if="isCorrect") ✔️ {{ $t('correct') }}
      span.text-danger(v-else) ❌ {{ $t('wrong') }} ({{ $t('correctAnswer') }}: {{ exercise.correctAnswer }})
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
  },
  data() {
    return {
      userAnswer: this.exercise.answer || "",
      showInput: true,
    };
  },
  watch: {
    exercise: {
      deep: true,
      handler(newVal, oldVal) {
        // when parent resets exercise.answer, also reset local input state
        if ((newVal && newVal.answer) !== (oldVal && oldVal.answer)) {
          this.userAnswer = newVal.answer || "";
          this.showInput = true;
        }
      }
    }
  },
  computed: {
    isCorrect() {
      if (typeof this.exercise.correctAnswer === 'number') {
        return Number(this.userAnswer) === this.exercise.correctAnswer;
      }
      const normalize = (s) => String(s).replace(/\s+/g, '').replace(/,/, '.').toLowerCase();
      return normalize(this.userAnswer) === normalize(this.exercise.correctAnswer);
    },
    inputType() {
      return typeof this.exercise.correctAnswer === 'number' ? 'text' : 'text';
    }
  },
  methods: {
    handleSubmit() {
      if (this.userAnswer.trim() !== "") {
        this.showInput = false; // Remove o input e mostra a resposta
        this.$emit("update-answer", { answer: this.userAnswer });
        // Move para o próximo exercício (debounced single-fire)
        if (!this._advancedOnce) {
          this._advancedOnce = true;
          this.$emit("next-exercise");
          setTimeout(() => { this._advancedOnce = false; }, 50);
        }
      }
    },
    focus() {
      this.$refs.inputRef.focus();
    },
    editAnswer() {
      if (this.isReadOnly || this.isSubmitted) return;
      this.showInput = true;
      this.$nextTick(() => { this.focus(); });
    },
  },
};
</script>

<style scoped>
.exercise {
  font-size: 1.5rem;
}
input::placeholder {
  color: #ccc;
}
</style>

