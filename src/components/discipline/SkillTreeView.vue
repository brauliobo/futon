<template lang="pug">
  div(class="space-y-0")
    //- Tree rows with branching connectors
    div(v-for="(row, rowIdx) in treeRows" :key="rowIdx" class="animate-slide-up" :style="{ animationDelay: (rowIdx * 0.05) + 's' }")
      //- Connector: fork line that branches from previous row
      div(v-if="rowIdx > 0" class="relative h-6 flex items-stretch justify-center")
        //- Vertical trunk
        div(class="absolute left-1/2 top-0 bottom-1/2 w-1 -translate-x-1/2 rounded-full bg-kid-green/40")
        //- Horizontal branch (only if previous row has 1 node splitting to multiple)
        div(v-if="treeRows[rowIdx - 1].length === 1 && row.length > 1" class="absolute top-1/2 h-1 rounded-full left-1/4 right-1/4 bg-kid-green/40")
        //- Vertical drops into each node in this row
        div(v-if="row.length > 1" class="absolute top-1/2 bottom-0 w-1 rounded-full bg-kid-green/40" style="left: 25%; transform: translateX(-50%);")
        div(v-if="row.length > 1" class="absolute top-1/2 bottom-0 w-1 rounded-full bg-kid-green/40" style="left: 75%; transform: translateX(-50%);")
        //- Single trunk continues if same width
        div(v-if="row.length === 1 || treeRows[rowIdx - 1].length === row.length" class="absolute left-1/2 top-1/2 bottom-0 w-1 -translate-x-1/2 rounded-full bg-kid-green/40")

      //- Nodes in this row — single column on mobile, side-by-side on sm+
      div(class="grid gap-3" :class="row.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'")
        SkillTreeNode(
          v-for="node in row"
          :key="node.id"
          :node="node"
          :is-complete="isNodeComplete(node)"
          :is-active="activeNodeId === node.id"
          :progress="getNodeProgress(node)"
          @select="onSelectNode"
        )

    //- Set list for active node — visually separated card
    div(v-if="activeNode && activeSets.length" class="mt-6 pt-6 border-t-2 border-dashed theme-border animate-slide-up")
      div(class="rounded-3xl bg-kid-blue/5 border border-kid-blue/20 p-5")
        h3(class="text-lg font-black text-kid-text mb-3 flex items-center gap-2")
          span(class="text-2xl") {{ activeNode.icon }}
          span {{ $t(`skill_${activeNode.id}`) || activeNode.name }}
        LevelList(
          :sets="activeSets"
          :activeSlug="activeSlug"
          @start="$emit('start-set', $event)"
        )
    div(v-else-if="activeNode && hasLoadableLevels && !activeSets.length" class="mt-6 flex items-center gap-2 rounded-2xl border border-kid-blue/20 bg-kid-blue/5 px-4 py-3 text-base font-semibold text-kid-blue animate-slide-up")
      Spinner
      span {{ $t('loading') || 'Loading...' }}
</template>

<script>
import { SkillTree } from '../../domain/SkillTree.js';
import SkillTreeNode from './SkillTreeNode.vue';
import LevelList from './level/LevelList.vue';
import Spinner from '../ui/Spinner.vue';
import { Formatter } from '../../utils/Formatter.js';

export default {
  name: 'SkillTreeView',
  components: { SkillTreeNode, LevelList, Spinner },
  emits: ['start-set', 'load-levels'],
  props: {
    subject: { type: String, required: true },
    sets: { type: Array, default: () => [] },
  },
  data() {
    return { activeNodeId: null };
  },
  computed: {
    tree() { return SkillTree.forSubject(this.subject); },
    treeRows() { return SkillTree.rows(this.tree); },
    setsByLevel() {
      const map = {};
      this.sets.forEach(s => {
        const lvl = String(s.level).toUpperCase();
        if (!map[lvl]) map[lvl] = [];
        map[lvl].push(s);
      });
      return map;
    },
    activeNode() { return this.tree.find(n => n.id === this.activeNodeId) || null; },
    activeSets() {
      if (!this.activeNode) return [];
      return this.activeNode.levels.flatMap(lvl => this.setsByLevel[lvl] || []);
    },
    activeSlug() {
      const first = this.activeSets.find(s => s.status !== 'mastery') || this.activeSets[0];
      return first ? Formatter.slugify(first.title) : '';
    },
    hasLoadableLevels() { return !!this.activeNode?.levels?.length; },
  },
  watch: {
    subject() { this.activeNodeId = null; },
  },
  methods: {
    isNodeComplete(node) { return SkillTree.isComplete(node, this.setsByLevel); },
    getNodeProgress(node) { return SkillTree.nodeProgress(node, this.setsByLevel); },
    async onSelectNode(node) {
      this.activeNodeId = node.id;
      for (const lvl of node.levels) {
        if (!this.setsByLevel[lvl]?.length) {
          this.$emit('load-levels', lvl);
        }
      }
    },
  },
};
</script>
