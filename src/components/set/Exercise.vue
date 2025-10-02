<!-- src/components/Exercise.vue -->
<template lang="pug">
  .exercise.mb-4
    .d-flex.align-items-center
      span.me-3.fw-bold {{ exerciseNumber }}.
      label.flex-grow-1.mb-0 {{ exercise.question }}
    div(v-if="!isReadOnly")
      input.form-control.form-control-lg.mt-2(v-if="showInput" v-model="userAnswer" :type="inputType" :inputmode="inputMode" :disabled="!isEnabled || isSubmitted" :placeholder="$t('enterAnswer')" @keydown.enter.prevent="handleSubmit" @keydown.tab.prevent="handleSubmit" @keyup.tab.prevent="handleSubmit" ref="inputRef")
      .mt-2.d-flex.align-items-center.gap-2(v-else)
        span.text-dark {{ userAnswer }}
        Button(variant="link" size="sm" @click="editAnswer" aria-label="Editar resposta") {{ $t('edit') || 'Editar' }}
    .mt-2(v-if="isReadOnly")
      span.text-success(v-if="isCorrect") ✔️ {{ $t('correct') }}
      span.text-danger(v-else) ❌ {{ $t('wrong') }} ({{ $t('correctAnswer') }}: {{ exercise.correctAnswer }})
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
      return 'text';
    },
    inputMode() {
      if (this.setInputType === 'number') return 'decimal';
      if (this.setInputType === 'auto') return typeof this.exercise.correctAnswer === 'number' ? 'decimal' : 'text';
      return 'text';
    }
  },
  methods: {
    handleSubmit() {
      if (this.userAnswer.trim() !== "") {
        this.showInput = false;
        this.$emit("update-answer", { answer: this.userAnswer });
        if (!this._advancedOnce) {
          this._advancedOnce = true;
          this.$emit("next-exercise");
          setTimeout(() => { this._advancedOnce = false; }, 50);
        }
      }
    },
    focus() {
      setTimeout(() => {
        const input = this.$refs.inputRef;
        if (input) {
          input.focus();
          if (typeof input.setSelectionRange === 'function') input.setSelectionRange(input.value.length, input.value.length);
          setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }, 100);
        }
      }, 50);
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
  scroll-margin-top: 100px;
  scroll-margin-bottom: 100px;
}
input::placeholder {
  color: #ccc;
}
input.form-control:focus {
  scroll-margin-top: 120px;
  scroll-margin-bottom: 120px;
}
</style>

