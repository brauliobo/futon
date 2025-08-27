<!-- src/components/Exercise.vue -->
<template>
  <div class="exercise mb-4">
    <div class="d-flex align-items-center">
      <span class="me-3 fw-bold">{{ exerciseNumber }}.</span>
      <label class="flex-grow-1 mb-0">{{ exercise.question }}</label>
    </div>
    <div v-if="!isReadOnly">
      <input v-if="showInput" v-model="userAnswer" :type="inputType" class="form-control form-control-lg mt-2" :disabled="!isEnabled || isSubmitted" :placeholder="$t('enterAnswer')" @keydown.enter.prevent="handleSubmit" @keydown.tab.prevent="handleSubmit" ref="inputRef" />
      <div v-else class="mt-2">
        <span class="text-success">{{ userAnswer }}</span>
      </div>
    </div>
    <div v-if="isReadOnly" class="mt-2">
      <span v-if="isCorrect" class="text-success">✔️ {{ $t('correct') }}</span>
      <span v-else class="text-danger">❌ {{ $t('wrong') }} ({{ $t('correctAnswer') }}: {{ exercise.correctAnswer }})</span>
    </div>
  </div>
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
        this.$emit("next-exercise"); // Move para o próximo exercício
      }
    },
    focus() {
      this.$refs.inputRef.focus();
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

