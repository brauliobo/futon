<!-- src/components/Card.vue -->
<template lang="pug">
  .card(:class="cardClass")
    .card-body(v-if="hasBody" :class="bodyClass")
      h5.card-title(v-if="title") {{ title }}
      h6.card-subtitle(v-if="subtitle" :class="subtitleClass") {{ subtitle }}
      .card-text(v-if="hasDefaultSlot")
        slot
      slot(name="body")
    template(v-else)
      slot
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
      const classes = [];
      if (this.variant) classes.push(`border-${this.variant}`);
      if (this.shadow) classes.push('shadow');
      if (this.height) classes.push(this.height);
      return classes;
    },
    bodyClass() {
      const classes = [];
      if (this.variant) classes.push(`text-${this.variant}`);
      return classes;
    },
    subtitleClass() {
      return 'mb-2 text-muted';
    },
    hasDefaultSlot() {
      return !!this.$slots.default;
    }
  }
};
</script>

<style scoped>
</style>
