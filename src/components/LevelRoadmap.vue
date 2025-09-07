<template>
  <div class="roadmap d-flex align-items-start overflow-auto">
    <div v-for="(lvl, idx) in sequence" :key="lvl" class="d-flex flex-column align-items-start me-2">
      <div class="d-flex align-items-center">
        <button type="button" class="btn btn-sm" :class="buttonClass(lvl)" @click="$emit('select', lvl)">
          <span class="badge bg-primary me-2">{{ idx + 1 }}</span>{{ lvl }} — {{ getName(lvl) }}
        </button>
        <div v-if="idx < sequence.length - 1" class="connector mx-2"></div>
      </div>
      <div class="progress w-100 mt-1" style="min-width:120px" role="progressbar" :aria-valuenow="progressPercent(lvl)" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" :style="{ width: progressPercent(lvl) + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LevelRoadmap',
  emits: ['select'],
  props: {
    sequence: { type: Array, required: true },
    available: { type: Array, required: true },
    active: { type: String, default: '' },
    progressByLevel: { type: Object, default: () => ({}) },
    getLevelName: { type: Function, required: true },
  },
  computed: {
    availableSet() { return new Set(this.available); },
  },
  methods: {
    progressPercent(key){ const p = this.progressByLevel[key]; return p && Number.isFinite(p.percent) ? p.percent : 0; },
    buttonClass(lvl){
      return [
        'btn-outline-secondary',
        { active: lvl === this.active, 'btn-disabled': !this.availableSet.has(lvl) }
      ];
    },
    getName(id) { return this.getLevelName(id); }
  }
}
</script>

<style scoped>
.roadmap .btn.active { color: #fff; background-color: #6c757d; border-color: #6c757d; }
.roadmap .btn.btn-disabled { opacity: .5; pointer-events: none; }
.connector { height: 2px; width: 40px; background: #dee2e6; }
</style>

 


