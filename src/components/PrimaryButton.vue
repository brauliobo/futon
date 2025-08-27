<!-- src/components/PrimaryButton.vue -->
<template>
  <button class="btn btn-primary" :disabled="disabled" @click="$emit('click')">
    <slot />
  </button>
  
</template>

<script>
export default {
  name: "PrimaryButton",
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


