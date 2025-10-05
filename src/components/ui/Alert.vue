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
        primary: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
        secondary: 'border-slate-600/40 bg-slate-800/50 text-slate-100',
        success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
        danger: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
        warning: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
        info: 'border-sky-400/40 bg-sky-400/10 text-sky-100',
        light: 'border-slate-200/40 bg-white/80 text-slate-800',
        dark: 'border-slate-900/60 bg-slate-950 text-slate-100'
      };
      return [base, palette[this.variant] || palette.info].join(' ');
    }
  }
};
</script>

