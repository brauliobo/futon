<!-- src/components/PrimaryButton.vue -->
<template lang="pug">
  button.btn.btn-primary(type="button" :disabled="disabled" @click="$emit('click')" v-bind="$attrs")
    slot
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


