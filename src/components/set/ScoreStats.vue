<!-- src/components/set/ScoreStats.vue -->
<template lang="pug">
  div(class="grid gap-3 md:grid-cols-3")
    Stat(:label="$t('finalScore')" :value="finalScore")
    Stat(:label="$t('grade')" :value="grade")
    Stat(:label="$t('speed')" :value="speed")
</template>

<script>
import Stat from "./Stat.vue";

export default {
  name: "ScoreStats",
  components: {
    Stat,
  },
  props: {
    finalScore: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    speed: {
      type: String,
      required: true,
    },
  },
};
</script>

