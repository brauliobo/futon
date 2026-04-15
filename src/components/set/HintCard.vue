<template lang="pug">
  div(class="hint-card" role="alert" aria-live="polite")
    span(class="hint-card__icon animate-pop-in" aria-hidden="true") 💡
    div
      p(class="hint-card__msg") {{ message }}
      p(v-if="answer !== undefined && answer !== ''" class="hint-card__answer") {{ answer }}
</template>

<script>
export default {
  name: 'HintCard',
  props: {
    message: { type: String, required: true },
    answer: { type: [String, Number], default: '' },
  },
};
</script>
