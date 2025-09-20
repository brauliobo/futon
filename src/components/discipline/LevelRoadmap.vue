<template lang="pug">
  .roadmap.d-flex.align-items-stretch.overflow-auto
    .level-card.d-flex.flex-column.align-items-stretch.me-2(v-for="(lvl, idx) in sequence" :key="lvl")
      Card
        template(#body)
          Button.w-100.text-start(variant="outline-secondary" size="sm" :class="buttonExtraClass(lvl)" @click="$emit('select', lvl)")
            Badge(variant="primary").me-2 {{ idx + 1 }}
            | {{ lvl }} — {{ getName(lvl) }}
        template(#footer)
          Progress.w-100(:value="progressPercent(lvl)")
</template>

<script>
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import Progress from "../ui/Progress.vue";
import Card from "../ui/Card.vue";

export default {
  name: 'LevelRoadmap',
  components: {
    Button,
    Badge,
    Progress,
    Card,
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
.level-card { min-width: 170px; }
.level-card .card { display: flex; flex-direction: column; }
.level-card .card-body { display: flex; align-items: center; }
.level-card .btn { height: 88px; display: flex; align-items: center; }
</style>

 


