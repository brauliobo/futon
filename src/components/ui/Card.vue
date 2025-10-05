<!-- src/components/Card.vue -->
<template lang="pug">
  div(:class="cardClass")
    div(v-if="hasBody" :class="bodyClass")
      h5(v-if="title" class="text-lg font-semibold text-slate-100") {{ title }}
      h6(v-if="subtitle" class="text-sm font-medium text-slate-400") {{ subtitle }}
      div(v-if="hasDefaultSlot" class="text-sm text-slate-200/90")
        slot
      slot(name="body")
    template(v-else)
      slot
    div(v-if="hasFooterSlot" class="border-t border-white/5 px-6 py-4 text-sm text-slate-300")
      slot(name="footer")
</template>

<script>
export default {
  name: "Card",
  props: {
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    variant: {
      type: String,
      default: '',
      validator: (value) => ['', 'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'].includes(value)
    },
    hasBody: {
      type: Boolean,
      default: true
    },
    shadow: {
      type: Boolean,
      default: false
    },
    height: {
      type: String,
      default: '',
      validator: (value) => ['', 'h-100'].includes(value)
    }
  },
  computed: {
    cardClass() {
      const base = 'group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur';
      const shadows = this.shadow ? 'shadow-xl shadow-sky-900/20' : '';
      const padding = this.hasBody ? '' : 'p-6';
      return [base, shadows, padding, this.height === 'h-100' ? 'h-full' : '', this.variantClass].filter(Boolean).join(' ');
    },
    bodyClass() {
      return 'px-6 py-5 sm:p-6';
    },
    hasDefaultSlot() {
      return !!this.$slots.default;
    },
    hasFooterSlot() {
      return !!this.$slots.footer;
    },
    variantClass() {
      const palette = {
        '': '',
        primary: 'border-sky-500/40 bg-sky-500/10',
        secondary: 'border-slate-600/40 bg-slate-800/60',
        success: 'border-emerald-500/40 bg-emerald-500/10',
        danger: 'border-rose-500/40 bg-rose-500/10',
        warning: 'border-amber-400/40 bg-amber-400/10',
        info: 'border-cyan-400/40 bg-cyan-400/10',
        light: 'border-white/40 bg-white/90 text-slate-800',
        dark: 'border-slate-900/60 bg-slate-950'
      };
      return palette[this.variant] || '';
    }
  }
};
</script>

