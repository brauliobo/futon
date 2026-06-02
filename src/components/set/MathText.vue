<template lang="pug">
  span(:class="textClass" :aria-label="label")
    template(v-for="(part, idx) in parts" :key="idx")
      span(v-if="part.type === 'text'")
        template(v-for="(textPart, textIdx) in textParts(part.value)" :key="textIdx")
          span(v-if="textPart.type === 'text'") {{ textPart.value }}
          sup(v-else-if="textPart.type === 'sup'" class="math-text__sup") {{ textPart.value }}
          span(v-else class="math-radical" aria-hidden="true")
            span(class="math-radical__symbol") √
            span(class="math-radical__body") {{ textPart.value }}
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
    hasFractionParts() { return this.parts.some(part => part.type === 'fraction' || part.type === 'mixed'); },
    textClass() {
      return {
        'math-text':             true,
        'math-text--fractional': this.hasFractionParts,
      };
    },
  },
  methods: {
    textParts(value) {
      const text  = String(value ?? '');
      const parts = [];
      let last    = 0;

      for (const match of text.matchAll(/\^(-?\d+|[A-Za-z])|√\(([^)]+)\)|√([\p{L}\d]+)/gu)) {
        if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
        if (match[1] !== undefined) parts.push({ type: 'sup', value: match[1] });
        else parts.push({ type: 'radical', value: match[2] || match[3] });
        last = match.index + match[0].length;
      }

      if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
      return parts.length ? parts : [{ type: 'text', value: text }];
    },
  },
};
</script>
