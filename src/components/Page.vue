<!-- src/components/Page.vue -->
<template>
  <div class="page card shadow p-4 mb-4">
    <h2 class="card-title">{{ page.title }}</h2>
    <p class="card-text">{{ page.description }}</p>
    <div class="container-fluid">
      <div class="row" v-for="(pair, rowIndex) in exercisePairs" :key="'row-' + page.pageNumber + '-' + rowIndex">
        <div class="col-12 col-md-6 mb-3" v-for="(exercise, colIndex) in pair" :key="'exercise-' + page.pageNumber + '-' + (rowIndex*2 + colIndex)">
          <Exercise
            v-if="exercise"
            :exercise="exercise"
            :exerciseNumber="displayNumber(rowIndex * 2 + colIndex)"
            :isEnabled="isExerciseEnabled(rowIndex * 2 + colIndex)"
            :isSubmitted="isSubmitted"
            :isReadOnly="isReadOnly"
            @update-answer="handleUpdateAnswer(rowIndex * 2 + colIndex, $event)"
            @next-exercise="focusNextExercise(rowIndex * 2 + colIndex)"
            ref="exercises"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Exercise from "./Exercise.vue";
import { nextTick } from "vue";

export default {
  name: "Page",
  components: {
    Exercise,
  },
  props: {
    page: {
      type: Object,
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
  },
  methods: {
    handleUpdateAnswer(index, payload) {
      this.answers.splice(index, 1, payload.answer);
      // persist answer on the exercise to survive navigation
      this.page.exercises[index].answer = payload.answer;
      const isCompleted = this.answers.every(a => a !== null && String(a).trim() !== '');
      this.$emit("update-page-status", { pageNumber: this.page.pageNumber, isCompleted });
    },
    focusNextExercise(currentIndex) {
      const nextIndex = this.nextIndexInTraversal(currentIndex);
      if (nextIndex !== null) {
        nextTick(() => {
          const list = this.$refs.exercises || [];
          const nextExercise = Array.isArray(list) ? list[nextIndex] : null;
          if (nextExercise && nextExercise.focus) nextExercise.focus();
        });
      }
    },
    isExerciseEnabled(index) {
      const order = this.orderIndices;
      const pos = order.indexOf(index);
      if (pos <= 0) return true;
      const prevIndex = order[pos - 1];
      return this.answers[prevIndex] !== null;
    },
    nextIndexInTraversal(currentIndex) {
      const order = this.orderIndices;
      const pos = order.indexOf(currentIndex);
      const nextPos = pos + 1;
      return nextPos < order.length ? order[nextPos] : null;
    },
    displayNumber(originalIndex) {
      const pos = this.orderIndices.indexOf(originalIndex);
      return pos >= 0 ? pos + 1 : originalIndex + 1;
    },
  },
  data() {
    return {
      answers: Array(this.page.exercises.length).fill(null),
    };
  },
  computed: {
    exercisePairs() {
      const pairs = [];
      for (let i = 0; i < this.page.exercises.length; i += 2) {
        pairs.push([this.page.exercises[i], this.page.exercises[i + 1] || null]);
      }
      return pairs.slice(0, 5); // cap at 5 rows if there are more
    },
    orderIndices() {
      const total = Math.min(10, this.page.exercises.length);
      const left = [];
      const right = [];
      for (let i = 0; i < total; i += 2) {
        left.push(i);
        if (i + 1 < total) right.push(i + 1);
      }
      return left.concat(right);
    },
  },
};
</script>

<style scoped>
.card-title {
  font-size: 2rem;
}
.card-text {
  font-size: 1.2rem;
}
</style>

