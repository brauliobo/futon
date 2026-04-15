<!-- src/components/set/ExerciseList.vue -->
<template lang="pug">
  div(class="grid gap-2 md:gap-2.5 grid-cols-1 md:grid-cols-2")
    template(v-for="(pair, rowIndex) in exercisePairs" :key="'row-' + rowIndex")
      div(v-for="(exercise, colIndex) in pair" :key="'exercise-' + getIndex(rowIndex, colIndex)" class="space-y-4")
        Exercise(
          v-if="exercise"
          :exercise="exercise"
          :exerciseNumber="displayNumber(getIndex(rowIndex, colIndex))"
          :isSubmitted="isSubmitted"
          :isReadOnly="isReadOnly"
          :setInputType="setInputType"
          @update-answer="(payload) => handleUpdateAnswer(getIndex(rowIndex, colIndex), payload)"
          @next-exercise="focusNextExercise(getIndex(rowIndex, colIndex))"
          ref="exercises"
        )
</template>

<script>
import Exercise from "./Exercise.vue";
import { ExerciseLayout } from "../../utils/ExerciseLayout.js";
import { Focus } from "../../utils/Focus.js";

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
      return ExerciseLayout.createPairs(this.exercises);
    },
  },
  methods: {
    // Index calculations
    getIndex(rowIndex, colIndex) {
      return ExerciseLayout.exerciseIndex(rowIndex, colIndex, this.exercises.length);
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
          const refIndex = ExerciseLayout.logicalToRef(i, this.exercises.length);
          if (refIndex < list.length) {
            this.exerciseRefsMap[i] = list[refIndex];
          }
        }
      });
    },
    focusNextExercise(currentIndex) {
      const idx = this.nextIndexInTraversal(currentIndex);
      if (idx === null) return;
      Focus.safe(() => {
        const exerciseComponent = this.exerciseRefsMap[idx];
        if (exerciseComponent?.focus) {
          exerciseComponent.focus();
        }
      });
    },
    focusFirstUnanswered() {
      Focus.safe(() => {
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

