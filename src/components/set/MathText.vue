<template lang="pug">
  span(class="math-text" :aria-label="label")
    template(v-for="(part, idx) in parts" :key="idx")
      span(v-if="part.type === 'text'") {{ part.value }}
      span(v-else-if="part.type === 'mixed'" class="math-mixed-fraction" aria-hidden="true")
        span(class="math-mixed-fraction__whole") {{ part.whole }}
        span(class="math-fraction")
          span(class="math-fraction__numerator") {{ part.numerator }}
          span(class="math-fraction__bar")
          span(class="math-fraction__denominator") {{ part.denominator }}
      span(v-else class="math-fraction" aria-hidden="true")
        span(class="math-fraction__numerator") {{ part.numerator }}
        span(class="math-fraction__bar")
        span(class="math-fraction__denominator") {{ part.denominator }}
</template>

<script>
import { Fraction } from '../../utils/Fraction.js';

export default {
  name: 'MathText',
  props: {
    value: { type: [String, Number], default: '' },
  },
  computed: {
    label() { return String(this.value ?? ''); },
    parts() { return Fraction.parts(this.value); },
  },
};
</script>
