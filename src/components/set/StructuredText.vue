<template lang="pug">
  span(:class="textClass" :aria-label="label")
    template(v-if="isDense")
      span(v-for="(part, idx) in denseParts" :key="idx" class="structured-text__part")
        span(v-if="idx > 0" class="structured-text__separator" aria-hidden="true") {{ denseSeparator }}
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
    denseLayout() { return this.splitDenseLayout(this.label); },
    denseParts() { return this.denseLayout.parts; },
    denseSeparator() { return this.denseLayout.separator; },
    isDense() { return this.denseLayout.dense; },
    textClass() {
      return {
        'structured-text':        true,
        'structured-text--dense': this.isDense,
      };
    },
  },
  methods: {
    splitDenseLayout(value) {
      const text = String(value ?? '');
      const plusParts = this.splitParts(text, /\s+\+\s+/);
      if (plusParts.length >= 5 && text.length > 180) {
        return { dense: true, separator: '+', parts: plusParts };
      }

      const contrastParts = this.splitParts(text, /\s*;\s*/);
      if (contrastParts.length >= 3 && text.length > 170) {
        return { dense: true, separator: ';', parts: contrastParts };
      }

      return { dense: false, separator: '', parts: [text] };
    },
    splitParts(value, pattern) {
      return String(value)
        .split(pattern)
        .map(part => part.trim())
        .filter(Boolean);
    },
  },
};
</script>
