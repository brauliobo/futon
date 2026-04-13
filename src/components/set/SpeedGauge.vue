<!-- src/components/set/SpeedGauge.vue -->
<template lang="pug">
  div(data-testid="speed-gauge" class="rounded-2xl border border-black/5 bg-kid-bg p-4 space-y-2")
    div(class="flex items-center justify-between text-sm font-semibold text-kid-muted mb-1")
      span ⚡ {{ $t('speed') || 'Speed' }}
      span(:class="speedLabelColor") {{ avgSeconds }}s/ex
    Progress(:value="width" :variant="variant" height="8px")
    small(class="block text-xs font-semibold text-kid-muted") {{ $t('target') || 'Target' }}: ≤ {{ target }}s/ex
</template>

<script>
import Progress from "../ui/Progress.vue";

export default {
  name: "SpeedGauge",
  components: { Progress },
  props: {
    width: { type: Number, required: true },
    variant: { type: String, required: true },
    avgSeconds: { type: Number, required: true },
    target: { type: Number, required: true },
  },
  computed: {
    speedLabelColor() {
      if (this.avgSeconds <= this.target) return 'text-kid-green';
      if (this.avgSeconds <= this.target * 1.3) return 'text-amber-500';
      return 'text-kid-red';
    },
  },
};
</script>


