<!-- src/components/set/ResultsHeader.vue -->
<template lang="pug">
  div(class="flex items-center justify-between gap-3")
    div(class="flex flex-wrap items-center gap-2")
      Badge(variant="success" v-if="status === 'mastery'") ○ {{ $t('mastery') || 'Mastery' }}
      Badge(variant="warning" text-dark v-else-if="status === 'pass'") △ {{ $t('pass') || 'Pass' }}
      Badge(variant="danger" v-else) × {{ $t('retry') || 'Retry' }}
    Button(variant="outline-secondary" size="sm" @click="$emit('reset')" class="flex items-center gap-1 text-xs")
      span {{ $t('reset') }}
</template>

<script>
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";

export default {
  name: "ResultsHeader",
  components: {
    Badge,
    Button,
  },
  props: {
    status: {
      type: String,
      default: '',
    },
  },
  emits: ['reset'],
};
</script>

