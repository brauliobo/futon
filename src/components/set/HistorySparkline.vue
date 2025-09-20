<!-- src/components/HistorySparkline.vue -->
<template lang="pug">
.history-sparkline
  svg(:viewBox="`0 0 ${(items.length - 1 || 1) * 6} 20`" width="100%" height="20" role="img" :aria-label="($t('previousAttempts') || 'Previous attempts')")
    polyline(:points="points", :stroke="stroke", fill="none", stroke-width="2")
</template>

<script>
export default {
  name: "HistorySparkline",
  props: { history: { type: Array, required: true } },
  computed: {
    items() { return (this.history || []).slice(-24); },
    points() { return this.items.map((h,i)=>`${i*6},${20 - Math.max(0, Math.min(18, Math.round((h.accuracyPercent||0)*0.18)))}` ).join(' '); },
    stroke() { const s = (this.history||[]).slice(-1)[0]?.status; if (s==='mastery') return '#28a745'; if (s==='pass') return '#ffc107'; return '#6c757d'; }
  }
};
</script>

<style scoped>
.history-sparkline { height: 20px; color: #6c757d; }
</style>


