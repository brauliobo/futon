<!-- src/components/set/NeededSeries.vue -->
<template lang="pug">
  div(v-if="series.length" class="space-y-2 pt-2")
    div(class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400")
      span 📚
      span {{ $t('neededSets') }}:
    div(class="flex flex-wrap gap-2")
      Badge(variant="info" v-for="s in series" :key="s.id") {{ s.title }}
</template>

<script>
import Badge from "../ui/Badge.vue";

export default {
  name: "NeededSeries",
  components: {
    Badge,
  },
  props: {
    series: {
      type: Array,
      required: true,
      default: () => [],
    },
  },
};
</script>

