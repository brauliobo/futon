<template lang="pug">
  div(class="fraction-answer" :class="{ 'fraction-answer--answered': hasAnswer && !isEditing }")
    input(
      v-if="allowMixed"
      v-model="whole"
      type="text"
      inputmode="numeric"
      pattern="-?[0-9]*"
      enterkeyhint="next"
      :disabled="disabled"
      placeholder="?"
      class="fraction-answer__whole"
      :aria-label="wholeAriaLabel"
      :title="wholeAriaLabel"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      @input="emitAnswer"
      @keydown.enter.prevent="focusNumerator"
      @focus="setEditing(true)"
      @blur="handleBlur"
      ref="wholeRef"
    )
    div(class="fraction-answer__stack")
      input(
        v-model="numerator"
        type="text"
        inputmode="numeric"
        pattern="-?[0-9]*"
        enterkeyhint="next"
        :disabled="disabled"
        placeholder="?"
        class="fraction-answer__number"
        :aria-label="numeratorAriaLabel"
        :title="numeratorAriaLabel"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @input="emitAnswer"
        @keydown.enter.prevent="focusDenominator"
        @focus="setEditing(true)"
        @blur="handleBlur"
        ref="numeratorRef"
      )
      span(class="fraction-answer__bar" aria-hidden="true")
      input(
        v-model="denominator"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        enterkeyhint="next"
        :disabled="disabled"
        placeholder="?"
        class="fraction-answer__number"
        :aria-label="denominatorAriaLabel"
        :title="denominatorAriaLabel"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @input="emitAnswer"
        @keydown.enter.prevent="$emit('submit')"
        @focus="setEditing(true)"
        @blur="handleBlur"
        ref="denominatorRef"
      )
    button(
      v-if="hasAnswer && isEditing && !disabled"
      @mousedown.prevent="clear"
      type="button"
      class="fraction-answer__clear"
      :aria-label="clearLabel"
      :title="clearLabel"
    ) ×
</template>

<script>
import { Fraction } from '../../utils/Fraction.js';

export default {
  name: 'FractionAnswerInput',
  emits: ['update:modelValue', 'submit', 'editing'],
  props: {
    modelValue: { type: [String, Number], default: '' },
    disabled:   { type: Boolean, default: false },
    allowMixed: { type: Boolean, default: false },
    ariaLabel:  { type: String, default: 'Resposta' },
    clearLabel: { type: String, default: 'Clear' },
    wholeLabel:       { type: String, default: 'Whole' },
    numeratorLabel:   { type: String, default: 'Numerator' },
    denominatorLabel: { type: String, default: 'Denominator' },
  },
  data() {
    const parsed = Fraction.parseAnswer(this.modelValue);
    return {
      whole:       parsed.whole,
      numerator:   parsed.numerator,
      denominator: parsed.denominator,
      isEditing:   false,
    };
  },
  computed: {
    hasAnswer() {
      return [this.whole, this.numerator, this.denominator].some(v => String(v || '').trim() !== '');
    },
    wholeAriaLabel() { return this.partAriaLabel(this.wholeLabel); },
    numeratorAriaLabel() { return this.partAriaLabel(this.numeratorLabel); },
    denominatorAriaLabel() { return this.partAriaLabel(this.denominatorLabel); },
  },
  watch: {
    modelValue(newValue) {
      if (this.$el?.contains?.(document.activeElement)) return;

      const parsed     = Fraction.parseAnswer(newValue);
      this.whole       = parsed.whole;
      this.numerator   = parsed.numerator;
      this.denominator = parsed.denominator;
    },
  },
  methods: {
    partAriaLabel(label) {
      return `${this.ariaLabel}: ${label}`;
    },
    emitAnswer() {
      this.$emit('update:modelValue', Fraction.answerFromParts({
        whole:       this.allowMixed ? this.whole : '',
        numerator:   this.numerator,
        denominator: this.denominator,
      }));
    },
    handleBlur() {
      requestAnimationFrame(() => {
        if (this.$el?.contains?.(document.activeElement)) return;
        this.setEditing(false);
        this.emitAnswer();
      });
    },
    setEditing(value) {
      this.isEditing = value;
      this.$emit('editing', value);
    },
    focus() {
      this.$nextTick(() => {
        const input = this.allowMixed ? this.$refs.wholeRef : this.$refs.numeratorRef;
        input?.focus?.({ preventScroll: true });
      });
    },
    focusNumerator() { this.$refs.numeratorRef?.focus?.(); },
    focusDenominator() { this.$refs.denominatorRef?.focus?.(); },
    clear() {
      this.whole       = '';
      this.numerator   = '';
      this.denominator = '';
      this.emitAnswer();
      this.focus();
    },
  },
};
</script>
