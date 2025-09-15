<!-- src/components/Button.vue -->
<template lang="pug">
  button.btn(:class="buttonClass" :type="type" :disabled="disabled" @click="$emit('click')" v-bind="filteredAttrs")
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
    buttonClass() {
      const classes = [`btn-${this.variant}`];
      if (this.size) classes.push(`btn-${this.size}`);
      // Add any additional classes passed via the class attribute
      if (this.$attrs.class) {
        if (Array.isArray(this.$attrs.class)) {
          classes.push(...this.$attrs.class);
        } else if (typeof this.$attrs.class === 'object') {
          classes.push(this.$attrs.class);
        } else {
          classes.push(this.$attrs.class);
        }
      }
      return classes;
    },
    filteredAttrs() {
      // Remove class from attrs since we handle it in buttonClass
      const { class: _, ...attrs } = this.$attrs;
      return attrs;
    }
  }
};
</script>

<style scoped>
</style>


