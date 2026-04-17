<!-- src/components/HistorySparkline.vue -->
<template lang="pug">
  div(class="h-8 rounded-xl bg-kid-bg px-3 py-1.5")
    svg(:viewBox="`0 0 ${(items.length - 1 || 1) * 6} 20`" width="100%" height="24" role="img" :aria-label="($t('previousAttempts') || 'Previous attempts')")
      polyline(:points="points" :stroke="stroke" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="sparkline-path" :style="{ '--sparkline-len': pathLen }")
      circle(v-for="(h, i) in items" :key="i" :cx="i * 6" :cy="20 - Math.max(0, Math.min(18, Math.round((h.accuracyPercent||0)*0.18)))" r="2" :fill="stroke" class="sparkline-dot" :style="{ animationDelay: `${0.6 + i * 0.04}s` }")
</template>

<script>
export default {
  name: "HistorySparkline",
  props: { history: { type: Array, required: true } },
  computed: {
    items() { return (this.history || []).slice(-24); },
    points() { return this.items.map((h,i)=>`${i*6},${20 - Math.max(0, Math.min(18, Math.round((h.accuracyPercent||0)*0.18)))}` ).join(' '); },
    pathLen() {
      const pts = this.items.map((h, i) => [i * 6, 20 - Math.max(0, Math.min(18, Math.round((h.accuracyPercent || 0) * 0.18)))]);
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return Math.ceil(len) || 300;
    },
    stroke() { const s = (this.history||[]).slice(-1)[0]?.status; if (s==='mastery') return '#34d399'; if (s==='pass') return '#facc15'; return '#94a3b8'; }
  }
};
</script>



