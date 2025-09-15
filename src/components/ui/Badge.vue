<!-- src/components/Badge.vue -->
<template lang="pug">
  span.badge(:class="badgeClass")
    slot
</template>

<script>
export default {
  name: "Badge",
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'].includes(value)
    },
    textDark: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    badgeClass() {
      const classes = [`bg-${this.variant}`];
      if (this.textDark) classes.push('text-dark');
      return classes;
    }
  }
};
</script>

<style scoped>
</style>
