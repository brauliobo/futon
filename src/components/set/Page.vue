<!-- src/components/Page.vue -->
<template lang="pug">
  Card(class="space-y-4")
    ReadingPassage(v-if="readingPassage" :passage="readingPassage")
    ExerciseList(
      :exercises="page.exercises"
      :answers="answers"
      :is-submitted="isSubmitted"
      :is-read-only="isReadOnly"
      :set-input-type="setInputType"
      @update-answer="handleUpdateAnswer"
      ref="listRef"
    )
</template>

<script>
import ExerciseList from "./ExerciseList.vue";
import Card from "../ui/Card.vue";
import ReadingPassage from "./ReadingPassage.vue";
import { PageStatus } from "../../utils/PageStatus.js";

export default {
  name: "Page",
  components: { ExerciseList, Card, ReadingPassage },
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
  computed: {
    readingPassage() {
      if (this.page.passage) return this.page.passage;
      return this.isPassageDescription(this.page.description) ? this.page.description : '';
    },
  },
  methods: {
    isPassageDescription(description) {
      const text = String(description || '').trim();
      if (text.length < 80) return false;
      return /^(Texto:|Leia e responda:|Redação modelo|História:)/i.test(text);
    },
    initAnswers() {
      this.answers = PageStatus.initAnswers(this.page.exercises);
    },
    emitPageStatus() {
      const status = PageStatus.calculate(this.answers, this.page.exercises.length);
      this.$emit("update-page-status", {
        pageNumber: this.page.pageNumber,
        ...status,
      });
    },
    handleUpdateAnswer(index, payload) {
      this.answers.splice(index, 1, payload.answer);
      this.page.exercises[index].answer = payload.answer;
      this.emitPageStatus();
    },
    focusFirstUnanswered() { this.$refs.listRef?.focusFirstUnanswered?.(); },
  },
  data() {
    return {
      answers: [],
    };
  },
  mounted() {
    this.initAnswers();
    this.emitPageStatus();
  },
  watch: {
    page() {
      this.initAnswers();
      this.emitPageStatus();
    },
  },
};
</script>
