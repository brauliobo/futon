<!-- src/components/PrimaryButton.vue -->
<template>
  <button type="button" class="btn btn-primary" :disabled="disabled" @click="$emit('click')" v-bind="$attrs">
    <slot />
  </button>
  
  
</template>

<script>
export default {
  name: "PrimaryButton",
  emits: ['click'],
  inheritAttrs: false,
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
</style>


