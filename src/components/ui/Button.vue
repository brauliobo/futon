<!-- src/components/Button.vue -->
<template lang="pug">
  button(:class="classes" :type="type" :disabled="disabled" @click="$emit('click', $event)" v-bind="attrs")
    slot
</template>

<script>
export default {
  name: "Button",
  emits: ['click'],
  inheritAttrs: false,
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'link', 'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger', 'outline-warning', 'outline-info', 'outline-light', 'outline-dark'].includes(value)
    },
    size: {
      type: String,
      default: '',
      validator: (value) => ['', 'sm', 'lg'].includes(value)
    },
    type: {
      type: String,
      default: 'button'
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    classes() {
      const base = 'inline-flex items-center justify-center gap-2 rounded-2xl border-2 font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40';
      const variants = {
        primary:          'bg-kid-blue border-kid-blue text-white hover:opacity-90',
        secondary:        'bg-kid-bg border-black/10 text-kid-text hover:border-kid-blue/40',
        success:          'bg-kid-green border-kid-green text-white hover:opacity-90',
        danger:           'bg-kid-red border-kid-red text-white hover:opacity-90',
        warning:          'bg-amber-400 border-amber-400 text-white hover:opacity-90',
        info:             'bg-kid-blue border-kid-blue text-white hover:opacity-90',
        light:            'bg-white border-black/10 text-kid-text hover:border-kid-blue/40',
        dark:             'bg-kid-text border-kid-text text-white hover:opacity-90',
        link:             'border-transparent bg-transparent text-kid-blue hover:opacity-70',
        'outline-primary':'border-kid-blue text-kid-blue hover:bg-kid-blue/10',
        'outline-secondary':'border-black/15 text-kid-muted hover:border-kid-blue/40',
        'outline-success':'border-kid-green text-kid-green hover:bg-kid-green/10',
        'outline-danger': 'border-kid-red text-kid-red hover:bg-kid-red/10',
        'outline-warning':'border-amber-400 text-amber-600 hover:bg-amber-50',
        'outline-info':   'border-kid-blue text-kid-blue hover:bg-kid-blue/10',
        'outline-light':  'border-black/10 text-kid-muted hover:bg-kid-bg',
        'outline-dark':   'border-kid-text text-kid-text hover:bg-kid-text/10',
      };
      const sizes = {
        '': 'px-4 py-2',
        sm: 'px-3 py-1.5 text-xs',
        lg: 'px-5 py-3 text-base',
      };
      const extra = this.normalizeClass(this.$attrs.class);
      return [base, variants[this.variant] || variants.primary, sizes[this.size] || sizes[''], extra].filter(Boolean).join(' ');
    },
    attrs() {
      const { class: _, ...attrs } = this.$attrs;
      return attrs;
    }
  },
  methods: {
    normalizeClass(val) {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(' ');
      if (typeof val === 'object') return Object.entries(val).filter(([, v]) => v).map(([k]) => k).join(' ');
      return val;
    },
  }
};
</script>



