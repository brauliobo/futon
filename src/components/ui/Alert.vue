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
        secondary: 'theme-border-strong surface-2 text-kid-muted',
        success: 'border-kid-green/30 bg-kid-green/10 text-kid-green',
        danger: 'border-kid-red/30 bg-kid-red/10 text-kid-red',
        warning: 'border-amber-400/40 bg-amber-400/10 text-amber-500',
        info: 'border-kid-blue/30 bg-kid-blue/10 text-kid-blue',
        light: 'theme-border bg-kid-surface text-kid-text',
        dark: 'theme-border-strong bg-kid-text text-kid-bg'
      };
      return [base, palette[this.variant] || palette.info].join(' ');
    }
  }
};
</script>

