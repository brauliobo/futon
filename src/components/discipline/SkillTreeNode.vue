<template lang="pug">
  button(
    :class="nodeClass"
    :aria-label="ariaLabel"
    :title="node.name"
    @click="$emit('select', node)"
  )
    div(class="flex items-center gap-3")
      span(class="text-2xl flex-shrink-0") {{ node.icon }}
      div(class="flex-1 text-left min-w-0")
        p(class="text-base font-black leading-tight truncate") {{ node.name }}
        p(v-if="progress.total > 0" class="text-sm font-bold mt-0.5" :class="isComplete ? 'text-kid-green' : 'text-kid-muted'") {{ progress.mastered }}/{{ progress.total }} {{ $t('sets') }}
        p(v-else class="text-sm font-semibold mt-0.5 text-kid-blue/70") → {{ $t('tapToExplore') || 'Tap to explore' }}
      div(v-if="progress.total > 0" class="flex flex-col items-end gap-1 flex-shrink-0")
        div(class="flex gap-0.5")
          span(v-for="n in 3" :key="n" :class="n <= starCount ? 'text-kid-gold star-glow' : 'theme-star-empty'" class="text-lg leading-none") ★
        span(v-if="progress.percent > 0" class="text-sm font-black" :class="isComplete ? 'text-kid-green' : 'text-kid-blue'") {{ progress.percent }}%
</template>

<script>
export default {
  name: 'SkillTreeNode',
  emits: ['select'],
  props: {
    node: { type: Object, required: true },
    isComplete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    progress: { type: Object, default: () => ({ total: 0, mastered: 0, percent: 0 }) },
  },
  computed: {
    ariaLabel() {
      if (this.isComplete) return `${this.node.name} — complete, ${this.progress.percent}%`;
      return `${this.node.name} — ${this.progress.mastered} of ${this.progress.total} sets mastered`;
    },
    starCount() {
      if (this.progress.percent === 100) return 3;
      if (this.progress.percent >= 50) return 2;
      if (this.progress.percent > 0) return 1;
      return 0;
    },
    nodeClass() {
      const base = 'w-full rounded-2xl border-2 p-4 transition-all duration-200 text-kid-text cursor-pointer';
      if (this.isActive) return `${base} border-kid-blue bg-kid-blue/10 ring-2 ring-kid-blue/40 ring-offset-2 ring-offset-theme shadow-md blue-glow`;
      if (this.isComplete) return `${base} border-kid-green/40 bg-kid-green/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 green-glow`;
      return `${base} theme-border bg-kid-surface shadow-sm hover:shadow-md hover:border-kid-blue/40 hover:-translate-y-0.5 active:scale-[0.98]`;
    },
  },
};
</script>
