<!-- src/components/Home.vue -->
<template>
  <div class="home">
    <div class="container">
      <h2 class="mb-3">{{ $t('chooseNotebook') }}</h2>

      <div v-for="(group, subject) in groupedBySubjectAndTopic" :key="subject" class="mb-4">
        <div class="card">
          <div class="card-header d-flex align-items-center justify-content-between">
            <h3 class="mb-0">{{ subjectLabel(subject) }}</h3>
          </div>
          <div class="card-body">
            <!-- Removed top-level progress bars as requested; progress is shown under roadmap buttons -->
            <TopicRoadmap
              :sequence="subjectTopicSequences[subject] || []"
              :available="Object.keys(group)"
              :active="activeTopicBySubject[subject] || ''"
              :t="$t"
              :progressByTopic="progressMap(group)"
              @select="setActiveTopic(subject, $event)"
            />
            <div class="row g-3 mt-3">
              <div
                class="col-12 col-md-6 col-lg-4"
                v-for="(wb, idx) in filteredByActiveTopic(subject, group)"
                :key="subject + '-' + (activeTopicBySubject[subject] || 'all') + '-' + idx"
              >
                <div class="card h-100">
                  <div class="card-body d-flex flex-column">
                    <h5 class="card-title">{{ wb.title }}</h5>
                    <p class="mb-1">{{ $t('level') }}: {{ wb.level }}</p>
                    <div class="mb-2">
                      <div class="progress" role="progressbar" :aria-valuenow="workbookProgress(wb).percent" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-bar" :style="{ width: workbookProgress(wb).percent + '%' }">{{ workbookProgress(wb).percent }}%</div>
                      </div>
                      <small class="text-muted">{{ workbookProgress(wb).completed }}/{{ wb.pages.length }} páginas</small>
                    </div>
                    <p class="mb-3">{{ $t('lastScore') }}: {{ wb.lastScore }}/{{ wb.totalExercises }}</p>
                    <button class="btn btn-primary mt-auto" @click="$emit('select-workbook', wb)">{{ $t('start') }}</button>
                  </div>
                </div>
              </div>
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
import TopicRoadmap from "./TopicRoadmap.vue";
export default {
  name: "Home",
  components: { TopicRoadmap },
  data() {
    return {
      activeTopicBySubject: {},
    };
  },
  mounted() {
    // initialize default active topics per subject based on available groups and sequence
    const groups = this.groupedBySubjectAndTopic;
    Object.keys(groups).forEach(subject => {
      const topics = Object.keys(groups[subject]);
      const seq = this.subjectTopicSequences[subject] || [];
      const first = seq.find(t => topics.includes(t)) || topics[0] || '';
      this.activeTopicBySubject[subject] = first;
    });
  },
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
    setActiveTopic(subject, topic) {
      this.activeTopicBySubject[subject] = topic;
    },
    filteredByActiveTopic(subject, group) {
      const a = this.activeTopicBySubject[subject];
      return a && group[a] ? group[a] : Object.values(group).flat();
    },
    subjectLabel(key) {
      const label = this.$t(`subject_${key}`);
      return typeof label === 'string' ? label : key;
    },
    topicLabel(key) {
      const label = this.$t(`topic_${key}`);
      return typeof label === 'string' ? label : key;
    },
    progressMap(group){
      const map = {};
      Object.keys(group).forEach(topic => { map[topic] = this.topicProgress(group, topic); });
      return map;
    },
    workbookProgress(wb) {
      const completed = (wb.completedPages || []).length;
      const percent = wb.pages && wb.pages.length ? Math.round((completed / wb.pages.length) * 100) : 0;
      return { completed, percent };
    },
    topicProgress(group, topic) {
      const wbs = group[topic] || [];
      const totalPages = wbs.reduce((a, wb) => a + (wb.pages ? wb.pages.length : 0), 0);
      const completedPages = wbs.reduce((a, wb) => a + ((wb.completedPages || []).length), 0);
      const percent = totalPages ? Math.round((completedPages / totalPages) * 100) : 0;
      return { completedPages, totalPages, percent };
    },
  },
  computed: {
    groupedBySubjectAndTopic() {
      const groups = {};
      this.workbooks.forEach(wb => {
        const subject = wb.subject || 'math';
        const topics = new Set();
        wb.pages.forEach(p => p.exercises.forEach(e => topics.add(e.type)));
        const mainTopic = Array.from(topics)[0] || 'mixed';
        if (!groups[subject]) groups[subject] = {};
        if (!groups[subject][mainTopic]) groups[subject][mainTopic] = [];
        groups[subject][mainTopic].push(wb);
      });
      return groups;
    },
    subjectTopicSequences() {
      return {
        math: ['addition','subtraction','multiplication','division','fraction_add','fraction_sub','fraction_mixed','mixed','problem','evaluation'],
        portuguese: ['reading','grammar'],
        english: ['english_vocab','english_phrases']
      };
    }
  }
};
</script>

<style scoped>
.home h2 {
  font-size: 2rem;
}
</style>


