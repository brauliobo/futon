<template lang="pug">
  span(:class="textClass" :aria-label="label")
    template(v-if="isDense")
      span(v-for="(part, idx) in denseParts" :key="idx" class="structured-text__part")
        span(v-if="idx > 0" class="structured-text__separator" aria-hidden="true") {{ denseSeparator }}
        template(v-for="(inlinePart, inlineIdx) in inlineParts(part)" :key="inlineIdx")
          span(v-if="inlinePart.type === 'blank'" :class="blankClass(inlinePart)") {{ inlinePart.value }}
          MathText(v-else :value="inlinePart.value")
    template(v-else)
      template(v-for="(inlinePart, idx) in inlineParts(value)" :key="idx")
        span(v-if="inlinePart.type === 'blank'" :class="blankClass(inlinePart)") {{ inlinePart.value }}
        MathText(v-else :value="inlinePart.value")
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
      if (contrastParts.length >= 2 && text.length > 110) {
        return { dense: true, separator: ';', parts: contrastParts };
      }

      const arrowParts = this.splitParts(text, /\s*→\s*/);
      if (arrowParts.length >= 2 && text.length > 220) {
        return { dense: true, separator: '→', parts: arrowParts };
      }

      const commaParts = this.splitParts(text, /,\s+(?![^()]*\))/);
      if (commaParts.length >= 4 && text.length > 120) {
        return { dense: true, separator: ',', parts: commaParts };
      }

      return { dense: false, separator: '', parts: [text] };
    },
    splitParts(value, pattern) {
      return String(value)
        .split(pattern)
        .map(part => part.trim())
        .filter(Boolean);
    },
    inlineParts(value) {
      const text  = String(value ?? '');
      const parts = [];
      let last    = 0;

      for (const match of text.matchAll(/_+/g)) {
        if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
        parts.push({ type: 'blank', value: match[0] });
        last = match.index + match[0].length;
      }

      if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
      return parts.length ? parts : [{ type: 'text', value: text }];
    },
    blankClass(part) {
      return [
        'structured-text__blank',
        { 'structured-text__blank--letter': String(part?.value || '').length === 1 },
      ];
    },
  },
};
</script>
