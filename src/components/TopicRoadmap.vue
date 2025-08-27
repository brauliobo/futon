<!-- src/components/TopicRoadmap.vue -->
<template>
  <div class="roadmap d-flex align-items-center overflow-auto">
    <div v-for="(topicKey, idx) in filteredSequence" :key="topicKey" class="d-flex align-items-center">
      <button
        type="button"
        class="btn btn-sm"
        :class="['btn-outline-primary', { active: topicKey === active }]"
        @click="$emit('select', topicKey)"
      >
        <span class="badge bg-primary me-2">{{ idx + 1 }}</span>{{ label(topicKey) }}
      </button>
      <div v-if="idx < filteredSequence.length - 1" class="connector mx-2"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TopicRoadmap',
  emits: ['select'],
  props: {
    sequence: { type: Array, required: true },
    available: { type: Array, required: true },
    active: { type: String, default: '' },
    t: { type: Function, required: true },
  },
  computed: {
    filteredSequence() {
      const set = new Set(this.available);
      return this.sequence.filter(k => set.has(k));
    }
  },
  methods: {
    label(key) {
      const map = {
        multiplication: this.t('topic_multiplication'),
        division: this.t('topic_division'),
        mixed: this.t('topic_mixed'),
        problem: this.t('topic_problem'),
        evaluation: this.t('topic_evaluation'),
        fraction_mixed: this.t('topic_fraction_mixed'),
        fraction_add: this.t('topic_fraction_add'),
        fraction_sub: this.t('topic_fraction_sub'),
        addition: this.t('topic_addition'),
        subtraction: this.t('topic_subtraction'),
        reading: this.t('topic_reading'),
        grammar: this.t('topic_grammar'),
        english_vocab: this.t('topic_english_vocab'),
        english_phrases: this.t('topic_english_phrases'),
      };
      return map[key] || key;
    },
  }
}
</script>

<style scoped>
.roadmap .btn.active { color: #fff; background-color: #0d6efd; border-color: #0d6efd; }
.connector { height: 2px; width: 40px; background: #dee2e6; }
</style>


