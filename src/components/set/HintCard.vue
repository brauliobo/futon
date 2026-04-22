<template lang="pug">
  div(class="hint-card" role="alert" aria-live="polite")
    span(class="hint-card__icon animate-pop-in" aria-hidden="true") 💡
    div
      p(class="hint-card__msg") {{ message }}
      p(v-if="hasUserAnswer" class="hint-card__user-answer")
        span.hint-card__user-label {{ $t('yourAnswer') || 'Sua resposta' }}:&nbsp;
        span.hint-card__user-value {{ userAnswer }}
      p(v-if="answer !== undefined && answer !== ''" class="hint-card__answer") {{ answer }}
</template>

<script>
export default {
  name: 'HintCard',
  props: {
    message: { type: String, required: true },
    answer: { type: [String, Number], default: '' },
    userAnswer: { type: [String, Number], default: '' },
  },
  computed: {
    hasUserAnswer() { return String(this.userAnswer ?? '').trim() !== ''; },
  },
};
</script>
