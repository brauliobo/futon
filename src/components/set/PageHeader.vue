<!-- src/components/set/PageHeader.vue -->
<template lang="pug">
  div(class="space-y-3")
    div(class="flex items-center justify-between gap-3")
      div(class="flex items-center gap-1.5")
        span(
          v-for="n in totalPages"
          :key="n"
          :class="dotClass(n)"
        )
      div(class="flex items-center gap-2 rounded-2xl bg-kid-bg border border-black/8 px-3 py-1.5")
        span(class="text-base") ⏱
        span(class="text-lg font-black text-kid-text tabular-nums") {{ timer }}
</template>

<script>
export default {
  name: "PageHeader",
  props: {
    pageNumber: { type: Number, required: true },
    totalPages: { type: Number, required: true },
    timer: { type: String, required: true },
    progress: { type: Number, required: true },
  },
  methods: {
    dotClass(n) {
      const base = 'rounded-full transition-all';
      if (n < this.pageNumber) return `${base} w-3 h-3 bg-kid-green`;
      if (n === this.pageNumber) return `${base} w-4 h-4 bg-kid-blue`;
      return `${base} w-3 h-3 bg-black/10`;
    },
  },
};
</script>
