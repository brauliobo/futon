<!-- src/components/discipline/Level.vue -->
<template lang="pug">
  div(class="mt-6")
    div(v-if="visibleSets.length" class="flex items-stretch gap-6 overflow-x-auto px-2 py-4 scrollbar-hide sm:px-4 lg:px-6")
      div(
        v-for="(setItem, index) in visibleSets"
        :key="setItem.set.id || setItem.set.title"
        :class="cardClass(setItem)"
      )
        SetCard(
          :set="setItem.set"
          :is-active="activeSet && activeSet.id === setItem.set.id"
          :class="{ 'opacity-50 saturate-75 pointer-events-none': !isSetItemAvailable(setItem) }"
          @start="$emit('select-set', $event)"
        )
</template>

<script>
import SetCard from "../set/SetCard.vue";

export default {
  name: "Level",
  components: {
    SetCard,
  },
  emits: ['select-set'],
  props: {
    level: {
      type: String,
      required: true
    },
    discipline: {
      type: String,
      required: true
    },
    sets: {
      type: Array,
      required: true
    },
    activeSet: {
      type: Object,
      default: null
    }
  },
  computed: {
    currentSetIndex() {
      if (!this.activeSet) return 0;
      const index = this.sets.findIndex(wb => wb.id === this.activeSet.id || wb.title === this.activeSet.title);
      return index >= 0 ? index : 0;
    },
    visibleSets() {
      if (!this.sets.length) return [];
      const currentIndex = this.currentSetIndex;
      const sets = [];
      if (currentIndex > 0) sets.push({ set: this.sets[currentIndex - 1], type: 'previous' });
      sets.push({ set: this.sets[currentIndex], type: 'current' });
      if (currentIndex < this.sets.length - 1) sets.push({ set: this.sets[currentIndex + 1], type: 'next' });
      return sets;
    }
  },
  methods: {
    cardClass(setItem) {
      const base = 'flex-shrink-0 snap-center transition-transform';
      const width = 'min-w-[280px] max-w-[360px] md:min-w-[320px] md:max-w-[400px]';
      const faded = setItem.type !== 'current' ? 'scale-[0.97]' : '';
      return [base, width, faded].filter(Boolean).join(' ');
    },
    isSetItemAvailable(setItem) {
      if (setItem.type === 'current') return true;
      if (setItem.type === 'previous') return true;
      if (setItem.type === 'next') {
        const currentIndex = this.currentSetIndex;
        if (currentIndex === 0) return true;
        const currentSet = this.sets[currentIndex];
        return !!(currentSet?.completed || currentSet?.lastScore !== undefined);
      }
      return false;
    }
  }
};
</script>

