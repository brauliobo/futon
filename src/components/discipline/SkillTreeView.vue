<template lang="pug">
  div(class="space-y-3")
    //- Tree rows
    div(v-for="(row, rowIdx) in treeRows" :key="rowIdx" class="animate-slide-up" :style="{ animationDelay: (rowIdx * 0.05) + 's' }")
      //- Connector line from previous row
      div(v-if="rowIdx > 0" class="flex justify-center py-1")
        div(class="w-0.5 h-4 bg-black/10 rounded-full")
      //- Nodes in this row
      div(class="grid gap-3" :class="row.length > 1 ? 'grid-cols-2' : 'grid-cols-1'")
        SkillTreeNode(
          v-for="node in row"
          :key="node.id"
          :node="node"
          :is-unlocked="isNodeUnlocked(node)"
          :is-complete="isNodeComplete(node)"
          :is-active="activeNodeId === node.id"
          :progress="getNodeProgress(node)"
          :prereq-names="getPrereqNames(node)"
          @select="onSelectNode"
        )

    //- Set list for active node
    div(v-if="activeNode && activeSets.length" class="mt-4 animate-slide-up")
      h3(class="text-lg font-black text-kid-text mb-3")
        span {{ activeNode.icon }}
        |  {{ activeNode.name }}
      LevelList(
        :sets="activeSets"
        :activeSlug="activeSlug"
        @start="$emit('start-set', $event)"
      )
    div(v-else-if="activeNode && !activeSets.length" class="mt-4 flex items-center gap-2 rounded-2xl border border-kid-blue/20 bg-kid-blue/5 px-4 py-3 text-sm font-semibold text-kid-blue animate-slide-up")
      svg(class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none")
        circle(cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25")
        path(d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" class="opacity-75")
      span {{ $t('loading') || 'Loading...' }}
</template>

<script>
import { SkillTree } from '../../domain/SkillTree.js';
import SkillTreeNode from './SkillTreeNode.vue';
import LevelList from './level/LevelList.vue';
import { Formatter } from '../../utils/Formatter.js';

export default {
  name: 'SkillTreeView',
  components: { SkillTreeNode, LevelList },
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
  },
  watch: {
    subject() { this.activeNodeId = null; },
  },
  methods: {
    isNodeUnlocked(node) { return SkillTree.isUnlocked(node, this.tree, this.setsByLevel); },
    isNodeComplete(node) { return SkillTree.isComplete(node, this.setsByLevel); },
    getNodeProgress(node) { return SkillTree.nodeProgress(node, this.setsByLevel); },
    getPrereqNames(node) {
      return node.prereqs.map(pid => this.tree.find(n => n.id === pid)?.name || pid).join(', ');
    },
    async onSelectNode(node) {
      this.activeNodeId = node.id;
      // Ensure levels are loaded
      for (const lvl of node.levels) {
        if (!this.setsByLevel[lvl]?.length) {
          this.$emit('load-levels', lvl);
        }
      }
    },
  },
};
</script>
