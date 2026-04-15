<!-- src/components/set/ExerciseList.vue -->
<template lang="pug">
  div(class="exercise-grid")
    Exercise(
      v-for="(exercise, idx) in exercises"
      :key="'exercise-' + idx"
      :exercise="exercise"
      :exerciseNumber="idx + 1"
      :isSubmitted="isSubmitted"
      :isReadOnly="isReadOnly"
      :setInputType="setInputType"
      @update-answer="(payload) => $emit('update-answer', idx, payload)"
      @next-exercise="focusNext(idx)"
      ref="exercises"
    )
</template>

<script>
import Exercise from "./Exercise.vue";
import { Focus } from "../../utils/Focus.js";

export default {
  name: "ExerciseList",
  components: { Exercise },
  props: {
    exercises: { type: Array, required: true },
    answers: { type: Array, required: true },
    isSubmitted: { type: Boolean, default: false },
    isReadOnly: { type: Boolean, default: false },
    setInputType: { type: String, default: 'auto' },
  },
  emits: ['update-answer', 'next-exercise'],
  methods: {
    refAt(idx) {
      const list = this.$refs.exercises || [];
      return Array.isArray(list) ? list[idx] : null;
    },
    focusNext(currentIndex) {
      const next = currentIndex + 1;
      if (next >= this.exercises.length) return;
      Focus.safe(() => this.refAt(next)?.focus?.());
    },
    focusFirstUnanswered() {
      if (this.isReadOnly || this.isSubmitted) return;
      Focus.safe(() => {
        const idx = this.exercises.findIndex((ex, i) => {
          const a = this.answers[i] ?? ex?.answer;
          return !a || String(a).trim() === '';
        });
        const target = idx >= 0 ? idx : 0;
        this.refAt(target)?.focus?.();
      });
    },
  },
  mounted() { this.$nextTick(() => this.focusFirstUnanswered()); },
  watch: {
    exercises() { this.$nextTick(() => this.focusFirstUnanswered()); },
  },
};
</script>

<style scoped>
.exercise-grid { display: flex; flex-direction: column; gap: 0.5rem; }
@media (min-width: 768px) {
  .exercise-grid { columns: 2; column-gap: 0.625rem; display: block; }
  .exercise-grid > * { break-inside: avoid; display: block; margin-bottom: 0.625rem; }
}
</style>

