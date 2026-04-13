<!-- src/components/Alert.vue -->
<template lang="pug">
  div(:class="classes" :role="role")
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
    classes() {
      const base = 'rounded-xl border px-4 py-3 text-sm';
      const palette = {
        primary: 'border-kid-blue/30 bg-kid-blue/10 text-kid-blue',
        secondary: 'border-black/10 bg-kid-bg text-kid-muted',
        success: 'border-kid-green/30 bg-kid-green/10 text-kid-green',
        danger: 'border-kid-red/30 bg-kid-red/10 text-kid-red',
        warning: 'border-amber-400/40 bg-amber-50 text-amber-700',
        info: 'border-kid-blue/30 bg-kid-blue/10 text-kid-blue',
        light: 'border-black/8 bg-white text-kid-text',
        dark: 'border-black/20 bg-kid-text text-white'
      };
      return [base, palette[this.variant] || palette.info].join(' ');
    }
  }
};
</script>

