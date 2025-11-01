<!-- src/components/set/PageNavigation.vue -->
<template lang="pug">
  div(class="flex flex-wrap items-center justify-between gap-3 pt-2")
    Button(variant="secondary" size="sm" @click="$emit('prev')" :disabled="!canGoPrev" aria-label="Previous page") {{ $t('previous') }}
    Button(variant="secondary" size="sm" @click="$emit('next')" :disabled="!canGoNext" aria-label="Next page") {{ $t('next') }}
</template>

<script>
import Button from "../ui/Button.vue";

export default {
  name: "PageNavigation",
  components: {
    Button,
  },
  props: {
    canGoPrev: {
      type: Boolean,
      default: false,
    },
    canGoNext: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['prev', 'next'],
};
</script>

