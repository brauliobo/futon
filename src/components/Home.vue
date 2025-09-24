<!-- src/components/Home.vue -->
<template lang="pug">
  .home
    .container
      .discipline-tabs
        .tabs-nav
          .tab-button(
            v-for="subject in availableSubjects" 
            :key="subject"
            :class="{ 'active': activeDiscipline === subject }"
            @click="selectDiscipline(subject)"
          )
            | {{ subjectLabel(subject) }}
        
        .tab-content
          .tab-panel(v-show="activeDiscipline" :key="activeDiscipline")
            .card
              .card-body
                .mt-1
                  .mb-2
                    small.text-muted.fw-semibold {{ $t('levels') }}
                  LevelRoadmap(
                    :sequence="levelSequenceBySubject(activeDiscipline)" 
                    :available="availableLevelsBySubject(activeDiscipline)" 
                    :active="activeLevelBySubject[activeDiscipline] || ''" 
                    :progressByLevel="{}" 
                    :getLevelName="(id) => levelNameBySubject(activeDiscipline, id)" 
                    @select="val => onLevelSelect(activeDiscipline, val)"
                  )
                LevelList(
                  :sets="filteredByActiveLevel(activeDiscipline, groupedBySubject[activeDiscipline] || [])" 
                  :activeSlug="activeSlugFor(activeDiscipline)" 
                  @start="$emit('select-set', $event)"
                )
</template>

<script>
import LevelRoadmap from "./discipline/LevelRoadmap.vue";
import LevelList from "./discipline/level/LevelList.vue";
import { subjectLabelKey, disciplines } from "../domain/disciplines.js";
import { getMathLevelOrder, getMathLevelName, getMathLevelI18nKey, getPortugueseLevelOrder, getPortugueseLevelName, getEnglishLevelOrder, getEnglishLevelName } from "../domain/levels.js";
export default {
  name: "Home",
  components: { LevelRoadmap, LevelList },
  emits: ['select-set', 'level-selected'],
  data() {
    return {
      activeLevelBySubject: {},
      activeDiscipline: null,
    };
  },
  props: {
    sets: {
      type: Array,
      required: true,
    },
    lastSelected: {
      type: Object,
      default: null,
    },
    selectedLevelBySubject: {
      type: Object,
      default: () => ({})
    }
  },
  mounted() {
    // init active discipline from localStorage
    const savedDiscipline = localStorage.getItem('futon_active_discipline');
    if (savedDiscipline && this.availableSubjects.includes(savedDiscipline)) {
      this.activeDiscipline = savedDiscipline;
    } else {
      this.activeDiscipline = this.availableSubjects[0] || null;
    }

    // init active level per subject
    const subjects = Object.keys(this.groupedBySubject);
    subjects.forEach(s => {
      const seq = this.levelSequenceBySubject(s);
      const saved = this.selectedLevelBySubject[s];
      const preset = this.lastSelected && this.lastSelected.subject === s ? String(this.lastSelected.level || '').toUpperCase() : '';
      this.activeLevelBySubject[s] = saved || preset || seq[0] || '';
    });
  },
  created() {
    const subjects = Object.keys(this.groupedBySubject);
    subjects.forEach(s => {
      const saved = this.selectedLevelBySubject[s];
      if (saved) {
        this.activeLevelBySubject[s] = saved;
      } else if (this.lastSelected && this.lastSelected.subject === s) {
        this.activeLevelBySubject[s] = String(this.lastSelected.level || '').toUpperCase();
      }
    });
  },
  methods: {
    selectDiscipline(subject) {
      this.activeDiscipline = subject;
      localStorage.setItem('futon_active_discipline', subject);
    },
    onLevelSelect(subject, val) {
      this.activeLevelBySubject[subject] = val;
      this.$emit('level-selected', subject, val);
      try { this.$router.replace({ hash: `#${String(subject).toLowerCase()}-${String(val).toUpperCase()}` }); } catch (e) {}
    },
    activeSlugFor(subject) {
      const list = this.filteredByActiveLevel(subject, this.groupedBySubject[subject] || []);
      
      if (!list.length) return '';
      
      // Debug logging
      console.log(`[activeSlugFor] Subject: ${subject}, Sets:`, list.map(wb => ({
        title: wb.title,
        slug: this.slugOf(wb),
        progress: this.setProgress(wb)
      })));
      
      // If there's a last selected set and it's in the current level, use it
      if (this.lastSelected && this.lastSelected.subject === subject) {
        const match = list.find(wb => this.slugOf(wb) === this.lastSelected.slug);
        if (match) {
          console.log(`[activeSlugFor] Using last selected: ${this.lastSelected.slug}`);
          return this.lastSelected.slug;
        }
      }
      
      // Otherwise, find the first set that is not 100% complete
      for (let i = 0; i < list.length; i++) {
        const wb = list[i];
        const progress = this.setProgress(wb);
        if (progress.percent < 100) {
          const selectedSlug = this.slugOf(wb);
          console.log(`[activeSlugFor] Selected first incomplete: ${selectedSlug}`);
          return selectedSlug;
        }
      }
      
      // If all sets are 100% complete, select the first one
      const fallbackSlug = this.slugOf(list[0]);
      console.log(`[activeSlugFor] All complete, using first: ${fallbackSlug}`);
      return fallbackSlug;
    },
    slugOf(wb) { return String(wb?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); },
    findFirstIncompleteSet(sets) {
      // Find the first set that is not 100% complete
      const firstIncomplete = sets.find(wb => {
        const progress = this.setProgress(wb);
        return progress.percent < 100; // Not fully completed
      });
      
      // If all are completed or none exist, return the first set
      return firstIncomplete || sets[0] || null;
    },
    filteredByActiveLevel(subject, list) {
      const active = (this.activeLevelBySubject[subject] || '').toUpperCase();
      if (!active) return list;
      return list.filter(wb => String(wb.level || '').toUpperCase() === active);
    },
    subjectLabel(key) {
      const label = this.$t(subjectLabelKey(key));
      return typeof label === 'string' ? label : key;
    },
    setProgress(wb) {
      const completed = (wb.completedPages || []).length;
      const percent = wb.pages && wb.pages.length ? Math.round((completed / wb.pages.length) * 100) : 0;
      return { completed, percent };
    },
  },
  watch: {
    lastSelected(val) {
      if (val && val.subject) this.activeLevelBySubject[val.subject] = String(val.level || '').toUpperCase();
    }
  },
  computed: {
    availableSubjects() {
      return Object.keys(this.groupedBySubject);
    },
    groupedBySubject() {
      const groups = {};
      this.sets.forEach(wb => {
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

/* Discipline Tabs Styling */
.discipline-tabs {
  margin-bottom: 2rem;
}

.tabs-nav {
  display: flex;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px 12px 0 0;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  gap: 4px;
}

.tab-button {
  flex: 1;
  min-width: 140px;
  padding: 16px 24px;
  text-align: center;
  font-weight: 600;
  font-size: 1.1rem;
  color: #6c757d;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  text-transform: capitalize;
}

.tab-button::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 3px;
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 2px 2px 0 0;
  transition: width 0.3s ease;
}

.tab-button:hover {
  color: #495057;
  background: rgba(255, 255, 255, 0.7);
  transform: translateY(-2px);
}

.tab-button.active {
  color: #007bff;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
  transform: translateY(-2px);
}

.tab-button.active::before {
  width: 60%;
}

.tab-content {
  background: #ffffff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tab-panel .card {
  border: none;
  box-shadow: none;
  margin: 0;
}

.tab-panel .card-body {
  padding: 2rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .tab-button {
    min-width: 100px;
    padding: 12px 16px;
    font-size: 1rem;
  }
  
  .tab-panel .card-body {
    padding: 1.5rem;
  }
}

@media (max-width: 576px) {
  .tabs-nav {
    padding: 4px;
  }
  
  .tab-button {
    min-width: 80px;
    padding: 10px 12px;
    font-size: 0.9rem;
  }
  
  .tab-panel .card-body {
    padding: 1rem;
  }
}
</style>


