<!-- src/components/Alert.vue -->
<template lang="pug">
  .alert(:class="alertClass" :role="role")
    slot
</template>

<script>
export default {
  name: "Alert",
  props: {
    variant: {
      type: String,
      default: 'info',
      validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'].includes(value)
    },
    role: {
      type: String,
      default: 'alert'
    }
  },
  computed: {
    alertClass() {
      return `alert-${this.variant}`;
    }
  }
};
</script>

<style scoped>
</style>
