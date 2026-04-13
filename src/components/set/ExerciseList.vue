<!-- src/components/set/ExerciseList.vue -->
<template lang="pug">
  div(class="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2")
    template(v-for="(pair, rowIndex) in exercisePairs" :key="'row-' + rowIndex")
      div(v-for="(exercise, colIndex) in pair" :key="'exercise-' + getExerciseIndex(rowIndex, colIndex)" class="space-y-4")
        Exercise(
          v-if="exercise"
          :exercise="exercise"
          :exerciseNumber="displayNumber(getExerciseIndex(rowIndex, colIndex))"
          :isEnabled="isExerciseEnabled(getExerciseIndex(rowIndex, colIndex))"
          :isSubmitted="isSubmitted"
          :isReadOnly="isReadOnly"
          :setInputType="setInputType"
          @update-answer="(payload) => handleUpdateAnswer(getExerciseIndex(rowIndex, colIndex), payload)"
          @next-exercise="focusNextExercise(getExerciseIndex(rowIndex, colIndex))"
          ref="exercises"
        )
</template>

<script>
import Exercise from "./Exercise.vue";
import { createExercisePairs, getExerciseIndex, logicalIndexToRefIndex } from "../../utils/exerciseHelpers.js";
import { safeFocus } from "../../utils/focusHelpers.js";

export default {
  name: "ExerciseList",
  components: {
    Exercise,
  },
  props: {
    exercises: {
      type: Array,
      required: true,
    },
    answers: {
      type: Array,
      required: true,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    isReadOnly: {
      type: Boolean,
      default: false,
    },
    setInputType: {
      type: String,
      default: 'auto',
    },
    orderIndices: {
      type: Array,
      required: true,
    },
  },
  emits: ['update-answer', 'next-exercise'],
  computed: {
    exercisePairs() {
      return createExercisePairs(this.exercises);
    },
  },
  methods: {
    // Index calculations
    getExerciseIndex(rowIndex, colIndex) {
      return getExerciseIndex(rowIndex, colIndex, this.exercises.length);
    },
    displayNumber(originalIndex) {
      const pos = this.orderIndices.indexOf(originalIndex);
      return pos >= 0 ? pos + 1 : originalIndex + 1;
    },
    nextIndexInTraversal(currentIndex) {
      const order = this.orderIndices;
      const pos = order.indexOf(currentIndex);
      const nextPos = pos + 1;
      return nextPos < order.length ? order[nextPos] : null;
    },
    
    // Exercise state
    isExerciseEnabled(index) {
      const order = this.orderIndices;
      const pos = order.indexOf(index);
      if (pos <= 0) return true;
      const prevIndex = order[pos - 1];
      return this.answers[prevIndex] !== null;
    },
    handleUpdateAnswer(index, payload) {
      this.$emit('update-answer', index, payload);
    },
    
    // Focus management
    updateExerciseRefsMap() {
      this.$nextTick(() => {
        const list = this.$refs.exercises || [];
        if (!Array.isArray(list) || list.length === 0) return;
        
        this.exerciseRefsMap = [];
        for (let i = 0; i < this.exercises.length; i++) {
          const refIndex = logicalIndexToRefIndex(i, this.exercises.length);
          if (refIndex < list.length) {
            this.exerciseRefsMap[i] = list[refIndex];
          }
        }
      });
    },
    focusNextExercise(currentIndex) {
      const idx = this.nextIndexInTraversal(currentIndex);
      if (idx === null) return;
      safeFocus(() => {
        const exerciseComponent = this.exerciseRefsMap[idx];
        if (exerciseComponent?.focus) {
          exerciseComponent.focus();
        }
      });
    },
    focusFirstUnanswered() {
      safeFocus(() => {
        this.updateExerciseRefsMap();
        if (this.isReadOnly || this.isSubmitted) return;
        
        const order = this.orderIndices;
        for (let i = 0; i < order.length; i++) {
          const idx = order[i];
          const answer = this.answers[idx];
          const exercise = this.exercises[idx];
          const hasAnswer = (answer !== null && String(answer).trim() !== '') || 
                           (exercise?.answer && String(exercise.answer).trim() !== '');
          
          if (!hasAnswer) {
            const exerciseComponent = this.exerciseRefsMap[idx];
            if (exerciseComponent?.focus) {
              exerciseComponent.focus();
              return;
            }
          }
        }
        
        // If all answered, focus first exercise
        const first = this.exerciseRefsMap[order[0] || 0];
        if (first?.focus) {
          first.focus();
        }
      });
    },
  },
  data() {
    return {
      exerciseRefsMap: [],
    };
  },
  mounted() {
    this.updateExerciseRefsMap();
    this.focusFirstUnanswered();
  },
  watch: {
    exercises() {
      this.$nextTick(() => {
        this.updateExerciseRefsMap();
        this.focusFirstUnanswered();
      });
    },
  },
};
</script>

