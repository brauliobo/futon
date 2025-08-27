<!-- src/components/Home.vue -->
<template>
  <div class="home">
    <div class="container">
      <h2 class="mb-3">{{ $t('chooseNotebook') }}</h2>
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-6 col-lg-4" v-for="(wb, idx) in workbooks" :key="idx">
          <div class="card h-100">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">{{ wb.title }}</h5>
              <p class="mb-1">{{ $t('level') }}: {{ wb.level }}</p>
              <p class="mb-3">{{ $t('lastScore') }}: {{ wb.lastScore }}/{{ wb.totalExercises }}</p>
              <button class="btn btn-primary mt-auto" @click="$emit('select-workbook', wb)">{{ $t('start') }}</button>
            </div>
          </div>
        </div>
      </div>

      <h3 class="mb-3">{{ $t('topics') }}</h3>
      <div class="d-flex flex-wrap gap-2">
        <span v-for="topic in topics" :key="topic" class="badge bg-secondary">{{ topicLabel(topic) }}</span>
      </div>
    </div>
  </div>
  
</template>

<script>
export default {
  name: "Home",
  props: {
    workbooks: {
      type: Array,
      required: true,
    },
    topics: {
      type: Array,
      required: true,
    },
  },
  methods: {
    topicLabel(key) {
      const map = {
        multiplication: this.$t('topic_multiplication'),
        division: this.$t('topic_division'),
        mixed: this.$t('topic_mixed'),
        problem: this.$t('topic_problem'),
        evaluation: this.$t('topic_evaluation'),
        fraction_mixed: this.$t('topic_fraction_mixed'),
        fraction_add: this.$t('topic_fraction_add'),
        fraction_sub: this.$t('topic_fraction_sub'),
      };
      return map[key] || key;
    },
  },
};
</script>

<style scoped>
.home h2 {
  font-size: 2rem;
}
</style>


