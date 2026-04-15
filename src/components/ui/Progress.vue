<!-- src/components/Progress.vue -->
<template lang="pug">
  div(:role="role" :aria-valuenow="value" :aria-valuemin="min" :aria-valuemax="max" :class="wrapperClass")
    div(:class="barClasses" :style="{ width: percentage + '%' }")
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
    wrapperClass() {
      const base = 'relative w-full overflow-hidden rounded-full theme-track';
      const h = this.height ? '' : 'h-2.5';
      return [base, h].filter(Boolean).join(' ');
    },
    barClasses() {
      const palette = {
        primary: 'bg-kid-blue',
        secondary: 'bg-kid-muted',
        success: 'bg-kid-green',
        danger: 'bg-kid-red',
        warning: 'bg-amber-400',
        info: 'bg-kid-blue',
        light: 'bg-kid-surface text-kid-text',
        dark: 'bg-kid-text'
      };
      const heightClass = this.height ? '' : 'h-full';
      return ['flex items-center justify-center rounded-full text-[10px] font-semibold tracking-wide text-white transition-all duration-500 shadow-sm', palette[this.variant] || palette.primary, heightClass].filter(Boolean).join(' ');
    }
  }
};
</script>

