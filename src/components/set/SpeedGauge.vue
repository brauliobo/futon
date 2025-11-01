<!-- src/components/set/SpeedGauge.vue -->
<template lang="pug">
  div(class="space-y-2")
    Progress(:value="width" :variant="variant" height="6px")
    small(class="block text-xs text-slate-400") {{ $t('speed') + ':' }} {{ avgSeconds }}s/ex — {{ $t('target') + ' ≤ ' + target + 's/ex' }}
</template>

<script>
import Progress from "../ui/Progress.vue";

export default {
  name: "SpeedGauge",
  components: {
    Progress,
  },
  props: {
    width: {
      type: Number,
      required: true,
    },
    variant: {
      type: String,
      required: true,
    },
    avgSeconds: {
      type: Number,
      required: true,
    },
    target: {
      type: Number,
      required: true,
    },
  },
};
</script>

