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
      div(class="flex items-center gap-2 rounded-2xl surface-2 border theme-border px-3 py-1.5")
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
      const base = 'rounded-full transition-all duration-300';
      if (n < this.pageNumber) return `${base} w-3.5 h-3.5 bg-kid-green shadow-sm`;
      if (n === this.pageNumber) return `${base} w-5 h-5 bg-kid-blue blue-glow animate-dot-pulse`;
      return `${base} w-3 h-3 theme-track`;
    },
  },
};
</script>
