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
      const base = 'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40';
      const variants = {
        primary: 'bg-sky-500 border-sky-500 text-white hover:bg-sky-400 focus-visible:outline-sky-500',
        secondary: 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 focus-visible:outline-slate-700',
        success: 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-400 focus-visible:outline-emerald-500',
        danger: 'bg-rose-500 border-rose-500 text-white hover:bg-rose-400 focus-visible:outline-rose-500',
        warning: 'bg-amber-400 border-amber-400 text-slate-900 hover:bg-amber-300 focus-visible:outline-amber-400',
        info: 'bg-sky-400 border-sky-400 text-slate-900 hover:bg-sky-300 focus-visible:outline-sky-400',
        light: 'bg-white border-white text-slate-800 hover:bg-slate-100 focus-visible:outline-slate-200',
        dark: 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900',
        link: 'border-transparent bg-transparent text-sky-300 hover:text-white focus-visible:outline-sky-300',
        'outline-primary': 'border-sky-500 text-sky-300 hover:bg-sky-500/10 focus-visible:outline-sky-500',
        'outline-secondary': 'border-slate-600 text-slate-200 hover:bg-slate-600/20 focus-visible:outline-slate-600',
        'outline-success': 'border-emerald-500 text-emerald-300 hover:bg-emerald-500/10 focus-visible:outline-emerald-500',
        'outline-danger': 'border-rose-500 text-rose-300 hover:bg-rose-500/10 focus-visible:outline-rose-500',
        'outline-warning': 'border-amber-400 text-amber-200 hover:bg-amber-400/10 focus-visible:outline-amber-400',
        'outline-info': 'border-sky-400 text-sky-200 hover:bg-sky-400/10 focus-visible:outline-sky-400',
        'outline-light': 'border-slate-200 text-slate-200 hover:bg-slate-200/10 focus-visible:outline-slate-200',
        'outline-dark': 'border-slate-900 text-slate-100 hover:bg-slate-900/20 focus-visible:outline-slate-900',
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



