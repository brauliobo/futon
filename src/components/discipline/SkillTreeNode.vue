<template lang="pug">
  button(
    :class="nodeClass"
    :aria-label="ariaLabel"
    :title="localizedName"
    @click="$emit('select', node)"
  )
    div(class="flex items-center gap-3")
      span(class="text-2xl flex-shrink-0") {{ node.icon }}
      div(class="flex-1 text-left min-w-0")
        p(class="text-base font-black leading-tight truncate") {{ localizedName }}
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
    localizedName() { return this.$t(`skill_${this.node.id}`) || this.node.name; },
    ariaLabel() {
      if (this.isComplete) return `${this.localizedName} — complete, ${this.progress.percent}%`;
      return `${this.localizedName} — ${this.progress.mastered} of ${this.progress.total} sets mastered`;
    },
    starCount() {
      if (this.progress.percent === 100) return 3;
      if (this.progress.percent >= 50) return 2;
      if (this.progress.percent > 0) return 1;
      return 0;
    },
    nodeVariant() {
      if (this.isActive) return 'active';
      if (this.isComplete) return 'complete';
      return 'idle';
    },
    nodeClass() { return `skill-node skill-node--${this.nodeVariant}`; },
  },
};
</script>
