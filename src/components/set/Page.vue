<!-- src/components/Page.vue -->
<template lang="pug">
  Card(:title="page.title" class="space-y-4")
    p(class="text-base text-slate-200/90") {{ page.description }}
    div(class="grid gap-4 md:grid-cols-2")
      div(v-for="(pair, rowIndex) in exercisePairs" :key="'row-' + page.pageNumber + '-' + rowIndex" class="space-y-4")
        div(v-for="(exercise, colIndex) in pair" :key="'exercise-' + page.pageNumber + '-' + (rowIndex*2 + colIndex)")
          Exercise(
            v-if="exercise"
            :exercise="exercise"
            :exerciseNumber="displayNumber(rowIndex * 2 + colIndex)"
            :isEnabled="isExerciseEnabled(rowIndex * 2 + colIndex)"
            :isSubmitted="isSubmitted"
            :isReadOnly="isReadOnly"
            :setInputType="setInputType"
            @update-answer="handleUpdateAnswer(rowIndex * 2 + colIndex, $event)"
            @next-exercise="focusNextExercise(rowIndex * 2 + colIndex)"
            ref="exercises"
          )
</template>

<script>
import Exercise from "./Exercise.vue";
import Card from "../ui/Card.vue";
import { nextTick } from "vue";

export default {
  name: "Page",
  components: {
    Exercise,
    Card,
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
    setInputType: {
      type: String,
      default: 'auto',
    },
  },
  methods: {
    focusFirstExercise() {
      requestAnimationFrame(() => {
        nextTick(() => {
          const list = this.$refs.exercises || [];
          const first = Array.isArray(list) ? list[0] : null;
          if (first && first.focus && !this.isReadOnly && !this.isSubmitted) {
            first.focus();
          }
        });
      });
    },
    initAnswers() {
      this.answers = this.page.exercises.map(ex => {
        const a = ex && ex.answer ? String(ex.answer) : '';
        return a.trim() !== '' ? a : null;
      });
    },
    handleUpdateAnswer(index, payload) {
      this.answers.splice(index, 1, payload.answer);
      this.page.exercises[index].answer = payload.answer;
      const answeredCount = this.answers.filter(a => a !== null && String(a).trim() !== '').length;
      const totalCount = this.page.exercises.length;
      const isCompleted = answeredCount === totalCount;
      this.$emit("update-page-status", { pageNumber: this.page.pageNumber, isCompleted, answeredCount, totalCount });
    },
    focusNextExercise(currentIndex) {
      const idx = this.nextIndexInTraversal(currentIndex);
      if (idx === null) return;
      requestAnimationFrame(() => {
        nextTick(() => {
          const list = this.$refs.exercises || [];
          const next = Array.isArray(list) ? list[idx] : null;
          if (next && next.focus) {
            next.focus();
          }
        });
      });
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
  mounted() {
    this.initAnswers();
    this.focusFirstExercise();
    const answeredCount = this.answers.filter(a => a !== null && String(a).trim() !== '').length;
    const totalCount = this.page.exercises.length;
    const isCompleted = answeredCount === totalCount;
    this.$emit("update-page-status", { pageNumber: this.page.pageNumber, isCompleted, answeredCount, totalCount });
  },
  watch: {
    page() {
      this.initAnswers();
      this.focusFirstExercise();
      const answeredCount = this.answers.filter(a => a !== null && String(a).trim() !== '').length;
      const totalCount = this.page.exercises.length;
      const isCompleted = answeredCount === totalCount;
      this.$emit("update-page-status", { pageNumber: this.page.pageNumber, isCompleted, answeredCount, totalCount });
    }
  },
  computed: {
    exercisePairs() {
      const pairs = [];
      for (let i = 0; i < this.page.exercises.length; i += 2) pairs.push([this.page.exercises[i], this.page.exercises[i + 1] || null]);
      return pairs.slice(0, 5);
    },
    orderIndices() {
      const total = Math.min(10, this.page.exercises.length);
      return Array.from({ length: total }, (_, i) => i);
    },
  },
};
</script>


