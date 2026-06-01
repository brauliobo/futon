<template lang="pug">
  MathText(:value="value")
</template>

<script>
import MathText from './MathText.vue';

export default {
  name: 'FractionText',
  components: { MathText },
  props: {
    value: { type: [String, Number], default: '' },
  },
};
</script>
