<!-- src/components/Home.vue -->
<template lang="pug">
  .home
    .container
      h2.mb-3 {{ $t('chooseNotebook') }}
      .mb-4(v-for="(group, subject) in groupedBySubject" :key="subject")
        .card
          .card-header.d-flex.align-items-center.justify-content-between
            h3.mb-0 {{ subjectLabel(subject) }}
          .card-body
            .mt-1
              .mb-2
                small.text-muted.fw-semibold {{ $t('levels') }}
              LevelRoadmap(:sequence="levelSequenceBySubject(subject)" :available="availableLevelsBySubject(subject)" :active="activeLevelBySubject[subject] || ''" :progressByLevel="{}" :getLevelName="(id) => levelNameBySubject(subject, id)" @select="val => activeLevelBySubject[subject] = val")
            LevelList(:workbooks="filteredByActiveLevel(subject, group)" @start="$emit('select-workbook', $event)")
</template>

<script>
import LevelRoadmap from "./LevelRoadmap.vue";
import LevelList from "./discipline/levels/LevelList.vue";
import { subjectLabelKey } from "../domain/disciplines.js";
import { getMathLevelOrder, getMathLevelName, getMathLevelI18nKey, getPortugueseLevelOrder, getPortugueseLevelName, getEnglishLevelOrder, getEnglishLevelName } from "../domain/levels.js";
export default {
  name: "Home",
  components: { LevelRoadmap, LevelList },
  data() {
    return {
      activeLevelBySubject: {},
    };
  },
  mounted() {
    // init active level per subject
    const subjects = Object.keys(this.groupedBySubject);
    subjects.forEach(s => { const seq = this.levelSequenceBySubject(s); this.activeLevelBySubject[s] = seq[0] || ''; });
  },
  props: {
    workbooks: {
      type: Array,
      required: true,
    },
  },
  methods: {
    filteredByActiveLevel(subject, list) {
      const active = (this.activeLevelBySubject[subject] || '').toUpperCase();
      if (!active) return list;
      return list.filter(wb => String(wb.level || '').toUpperCase() === active);
    },
    subjectLabel(key) {
      const label = this.$t(subjectLabelKey(key));
      return typeof label === 'string' ? label : key;
    },
    workbookProgress(wb) {
      const completed = (wb.completedPages || []).length;
      const percent = wb.pages && wb.pages.length ? Math.round((completed / wb.pages.length) * 100) : 0;
      return { completed, percent };
    },
  },
  computed: {
    groupedBySubject() {
      const groups = {};
      this.workbooks.forEach(wb => {
        const subject = wb.subject || 'math';
        if (!groups[subject]) groups[subject] = [];
        groups[subject].push(wb);
      });
      return groups;
    },
    levelSequenceBySubject() { return (subject) => {
      if (subject === 'math') return getMathLevelOrder();
      if (subject === 'portuguese') return getPortugueseLevelOrder();
      if (subject === 'english') return getEnglishLevelOrder();
      return [];
    }; },
    levelNameBySubject() {
      return (subject, id) => {
        if (subject === 'math') {
          const key = getMathLevelI18nKey(id); const t = key ? this.$t(key) : '';
          return typeof t === 'string' && t !== key && t ? t : getMathLevelName(id);
        }
        if (subject === 'portuguese') return getPortugueseLevelName(id);
        if (subject === 'english') return getEnglishLevelName(id);
        return id;
      };
    },
    availableLevelsBySubject() {
      return (subject) => {
        const set = new Set((this.groupedBySubject[subject] || []).map(wb => String(wb.level || '').toUpperCase()));
        return Array.from(set);
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


