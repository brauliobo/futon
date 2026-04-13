<template lang="pug">
  button(
    :class="nodeClass"
    :disabled="!isUnlocked"
    @click="isUnlocked && $emit('select', node)"
  )
    div(class="flex items-center gap-3")
      span(class="text-2xl") {{ isUnlocked ? node.icon : '🔒' }}
      div(class="flex-1 text-left")
        p(class="text-base font-black leading-tight") {{ node.name }}
        p(v-if="!isUnlocked" class="text-xs font-semibold text-kid-muted mt-0.5") {{ $t('needs') || 'Needs' }}: {{ prereqNames }}
        p(v-else class="text-xs font-bold mt-0.5" :class="isComplete ? 'text-kid-green' : 'text-kid-muted'") {{ progress.mastered }}/{{ progress.total }} {{ $t('sets') }}
      div(class="flex flex-col items-end gap-1")
        div(v-if="isUnlocked" class="flex gap-0.5")
          span(v-for="n in 3" :key="n" :class="n <= starCount ? 'text-kid-gold star-glow' : 'text-black/10'" class="text-lg leading-none") ★
        span(v-if="isUnlocked && progress.percent > 0" class="text-xs font-black" :class="isComplete ? 'text-kid-green' : 'text-kid-blue'") {{ progress.percent }}%
</template>

<script>
export default {
  name: 'SkillTreeNode',
  emits: ['select'],
  props: {
    node: { type: Object, required: true },
    isUnlocked: { type: Boolean, default: false },
    isComplete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    progress: { type: Object, default: () => ({ total: 0, mastered: 0, percent: 0 }) },
    prereqNames: { type: String, default: '' },
  },
  computed: {
    starCount() {
      if (this.progress.percent === 100) return 3;
      if (this.progress.percent >= 50) return 2;
      if (this.progress.percent > 0) return 1;
      return 0;
    },
    nodeClass() {
      const base = 'w-full rounded-2xl border-2 p-4 transition-all duration-200 text-kid-text';
      if (!this.isUnlocked) return `${base} opacity-50 border-black/10 bg-kid-surface cursor-not-allowed`;
      if (this.isActive) return `${base} border-kid-blue bg-kid-blue/5 ring-2 ring-kid-blue/30 ring-offset-2 shadow-md blue-glow cursor-pointer`;
      if (this.isComplete) return `${base} border-kid-green/40 bg-kid-green/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer`;
      return `${base} border-black/10 bg-kid-surface shadow-sm hover:shadow-md hover:border-kid-blue/40 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer`;
    },
  },
};
</script>
