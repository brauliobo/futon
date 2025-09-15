<!-- src/components/Progress.vue -->
<template lang="pug">
  .progress(:role="role" :aria-valuenow="value" :aria-valuemin="min" :aria-valuemax="max" :style="progressStyle")
    .progress-bar(:style="{ width: percentage + '%' }" :class="barClass")
      slot {{ showValue ? `${percentage}%` : '' }}
</template>

<script>
export default {
  name: "Progress",
  props: {
    value: {
      type: Number,
      required: true
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    },
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'].includes(value)
    },
    showValue: {
      type: Boolean,
      default: false
    },
    height: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: 'progressbar'
    }
  },
  computed: {
    percentage() {
      const range = this.max - this.min;
      return range > 0 ? Math.round(((this.value - this.min) / range) * 100) : 0;
    },
    progressStyle() {
      const styles = {};
      if (this.height) styles.height = this.height;
      return styles;
    },
    barClass() {
      return this.variant !== 'primary' ? `bg-${this.variant}` : '';
    }
  }
};
</script>

<style scoped>
</style>
