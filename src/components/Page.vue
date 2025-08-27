<!-- src/components/Page.vue -->
<template>
  <div class="page card shadow p-4 mb-4">
    <h2 class="card-title">{{ page.title }}</h2>
    <p class="card-text">{{ page.description }}</p>
    <div>
      <div v-for="(exercise, index) in page.exercises" :key="'exercise-' + index">
        <Exercise
          :exercise="exercise"
          :exerciseNumber="index + 1"
          :isEnabled="isExerciseEnabled(index)"
          :isSubmitted="isSubmitted"
          :isReadOnly="isReadOnly"
          @update-answer="handleUpdateAnswer(index, $event)"
          @next-exercise="focusNextExercise(index)"
          ref="exercises"
        />
      </div>
    </div>
  </div>
</template>

<script>
import Exercise from "./Exercise.vue";
import { ref, nextTick } from "vue";

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
  setup(props, { emit }) {
    const exercises = ref([]);

    const handleUpdateAnswer = (index, payload) => {
      emit("update-page-status", payload);
    };

    const focusNextExercise = (currentIndex) => {
      const totalExercises = props.page.exercises.length;
      const nextIndex = currentIndex + 1;
      if (nextIndex < totalExercises) {
        nextTick(() => {
          const nextExercise = exercises.value[nextIndex];
          if (nextExercise && nextExercise.focus) {
            nextExercise.focus();
          }
        });
      }
    };

    return {
      exercises,
      handleUpdateAnswer,
      focusNextExercise,
    };
  },
  methods: {
    isExerciseEnabled(index) {
      if (index === 0) {
        return true;
      }
      return this.answers[index - 1] && this.answers[index - 1].isCorrect;
    },
  },
  data() {
    return {
      answers: Array(this.page.exercises.length).fill(null),
    };
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

