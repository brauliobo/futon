<!-- src/components/Badge.vue -->
<template lang="pug">
  span(:class="classes")
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
    classes() {
      const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide';
      const variants = {
        primary: 'bg-sky-500/90 text-white',
        secondary: 'bg-slate-700/80 text-slate-100',
        success: 'bg-emerald-500/90 text-white',
        danger: 'bg-rose-500/90 text-white',
        warning: `bg-amber-300/90 ${this.textDark ? 'text-slate-900' : 'text-slate-800'}`,
        info: 'bg-cyan-400/90 text-slate-900',
        light: `bg-white/80 ${this.textDark ? 'text-slate-800' : 'text-slate-600'}`,
        dark: 'bg-slate-900 text-white'
      };
      return [base, variants[this.variant] || variants.primary].join(' ');
    }
  }
};
</script>

