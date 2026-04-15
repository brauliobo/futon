<template lang="pug">
  svg(:class="['animate-spin', sizeClass]" viewBox="0 0 24 24" fill="none" role="status" :aria-label="label")
    circle(class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4")
    path(class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z")
</template>

<script>
const SIZES = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
export default {
  name: 'Spinner',
  props: {
    size: { type: String, default: 'sm' },
    label: { type: String, default: 'Loading' },
  },
  computed: { sizeClass() { return SIZES[this.size] || SIZES.sm; } },
};
</script>
