<!-- src/components/set/SpeedGauge.vue -->
<template lang="pug">
  div(data-testid="speed-gauge" class="rounded-2xl border border-black/5 bg-kid-bg p-4 space-y-2 animate-slide-up")
    div(class="flex items-center justify-between text-sm font-semibold text-kid-muted mb-1")
      span ⚡ {{ $t('speed') || 'Speed' }}
      span(class="font-black text-base" :class="speedLabelColor") {{ avgSeconds }}s/ex
    Progress(:value="width" :variant="variant" height="10px")
    small(class="block text-xs font-semibold text-kid-muted") {{ $t('target') || 'Target' }}: ≤ {{ target }}s/ex
</template>

<script>
import Progress from "../ui/Progress.vue";
import { speedLabelColor } from "../../utils/speedUtils.js";

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
    speedLabelColor() { return speedLabelColor(this.avgSeconds, this.target); },
  },
};
</script>


