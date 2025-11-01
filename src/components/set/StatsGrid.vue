<!-- src/components/set/StatsGrid.vue -->
<template lang="pug">
  div(class="grid gap-3 md:grid-cols-3")
    div(class="rounded-xl border border-white/5 bg-slate-900/70 p-4 text-center")
      span(class="text-xl font-semibold text-sky-300") {{ completedPages }}
      span(class="block text-xs uppercase tracking-wide text-slate-400 mt-1") {{ $t('completedBlocks') }}
    div(class="rounded-xl border border-white/5 bg-slate-900/70 p-4 text-center")
      span(class="text-xl font-semibold text-sky-200") {{ attempts }}
      span(class="block text-xs uppercase tracking-wide text-slate-400 mt-1") {{ $t('attempts') }}
    div(class="rounded-xl border border-white/5 bg-slate-900/70 p-4 text-center")
      span(class="text-xl font-semibold text-emerald-300") {{ lastScore }}/{{ totalExercises }}
      span(class="block text-xs uppercase tracking-wide text-slate-400 mt-1") {{ $t('lastScore') }}
</template>

<script>
export default {
  name: "StatsGrid",
  props: {
    completedPages: {
      type: Number,
      required: true,
    },
    attempts: {
      type: Number,
      required: true,
    },
    lastScore: {
      type: Number,
      required: true,
    },
    totalExercises: {
      type: Number,
      required: true,
    },
  },
};
</script>

