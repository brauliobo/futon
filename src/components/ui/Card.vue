<!-- src/components/Card.vue -->
<template lang="pug">
  div(:class="cardClass")
    div(v-if="hasBody" :class="bodyClass")
      h5(v-if="title" class="text-lg font-bold text-kid-text") {{ title }}
      h6(v-if="subtitle" class="text-sm font-semibold text-kid-muted") {{ subtitle }}
      div(v-if="hasDefaultSlot" class="text-base text-kid-text")
        slot
      slot(name="body")
    template(v-else)
      slot
    div(v-if="hasFooterSlot" class="border-t theme-border px-5 py-4 text-sm text-kid-muted")
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
      const base = 'group relative flex flex-col overflow-hidden rounded-2xl border theme-border bg-kid-surface';
      const shadows = this.shadow ? 'shadow-md' : 'shadow-sm';
      const padding = this.hasBody ? '' : 'p-5';
      return [base, shadows, padding, this.height === 'h-100' ? 'h-full' : '', this.variantClass].filter(Boolean).join(' ');
    },
    bodyClass() {
      return 'px-5 py-4';
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
        primary: 'border-kid-blue/30 bg-kid-blue/5',
        secondary: 'theme-border surface-2',
        success: 'border-kid-green/30 bg-kid-green/5',
        danger: 'border-kid-red/30 bg-kid-red/5',
        warning: 'border-amber-400/40 bg-amber-400/10',
        info: 'border-kid-blue/30 bg-kid-blue/5',
        light: 'theme-border bg-kid-surface',
        dark: 'theme-border-strong bg-kid-text text-kid-bg'
      };
      return palette[this.variant] || '';
    }
  }
};
</script>

