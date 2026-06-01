<template lang="pug">
  span(:class="textClass" :aria-label="label")
    template(v-if="isDense")
      span(v-for="(part, idx) in denseParts" :key="idx" class="structured-text__part")
        span(v-if="idx > 0" class="structured-text__separator" aria-hidden="true") +
        MathText(:value="part")
    MathText(v-else :value="value")
</template>

<script>
import MathText from './MathText.vue';

export default {
  name: 'StructuredText',
  components: { MathText },
  props: {
    value: { type: [String, Number], default: '' },
  },
  computed: {
    label() { return String(this.value ?? ''); },
    denseParts() { return this.splitDenseList(this.label); },
    isDense() { return this.denseParts.length >= 5 && this.label.length > 180; },
    textClass() {
      return {
        'structured-text':        true,
        'structured-text--dense': this.isDense,
      };
    },
  },
  methods: {
    splitDenseList(value) {
      const parts = String(value)
        .split(/\s+\+\s+/)
        .map(part => part.trim())
        .filter(Boolean);

      return parts.length ? parts : [String(value ?? '')];
    },
  },
};
</script>
