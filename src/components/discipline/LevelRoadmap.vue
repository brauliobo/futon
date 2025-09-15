<template lang="pug">
  .roadmap.d-flex.align-items-start.overflow-auto
    .d-flex.flex-column.align-items-start.me-2(v-for="(lvl, idx) in sequence" :key="lvl")
      .d-flex.align-items-center
        Button(variant="outline-secondary" size="sm" :class="buttonExtraClass(lvl)" @click="$emit('select', lvl)")
          Badge(variant="primary").me-2 {{ idx + 1 }}
          | {{ lvl }} — {{ getName(lvl) }}
        .connector.mx-2(v-if="idx < sequence.length - 1")
      Progress.w-100.mt-1(:value="progressPercent(lvl)" style="min-width:120px")
</template>

<script>
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import Progress from "../ui/Progress.vue";

export default {
  name: 'LevelRoadmap',
  components: {
    Button,
    Badge,
    Progress,
  },
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
    buttonExtraClass(lvl){
      return [
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

 


