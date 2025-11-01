<!-- src/components/set/PageHeader.vue -->
<template lang="pug">
  div(class="space-y-3")
    div(class="flex items-center justify-between gap-3")
      span(class="text-sm font-medium text-slate-300") Page {{ pageNumber }}/{{ totalPages }}
      div(class="flex items-center gap-2 text-sm font-mono text-sky-200")
        span ⏱
        span {{ timer }}
    Progress(:value="progress" show-value height="6px" class="mb-2")
</template>

<script>
import Progress from "../ui/Progress.vue";

export default {
  name: "PageHeader",
  components: {
    Progress,
  },
  props: {
    pageNumber: {
      type: Number,
      required: true,
    },
    totalPages: {
      type: Number,
      required: true,
    },
    timer: {
      type: String,
      required: true,
    },
    progress: {
      type: Number,
      required: true,
    },
  },
};
</script>

