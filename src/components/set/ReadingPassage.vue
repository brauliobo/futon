<template lang="pug">
  div(data-testid="reading-passage" class="rounded-3xl border-2 border-l-4 border-kid-blue/20 border-l-kid-blue bg-kid-blue/8 p-3 space-y-1.5 mb-3 sticky top-16 z-10 shadow-md animate-slide-up")
    div(class="flex items-center gap-2")
      span(class="text-xl" aria-hidden="true") 📖
      span(class="text-sm font-black text-kid-blue uppercase tracking-wide") {{ $t('readCarefully') || 'Read carefully' }}
    p(
      class="passage-text text-lg font-semibold text-kid-text whitespace-pre-line"
      v-html="rendered"
    )
</template>

<script>
export default {
  name: 'ReadingPassage',
  props: { passage: { type: String, required: true } },
  computed: {
    rendered() {
      const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      return escape(this.passage).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
    },
  },
};
</script>

<style>
.passage-text {
  line-height: 1.7;
  max-width: 48ch;
  margin-inline: auto;
}
.passage-text ruby rt {
  font-size: 0.6em;
  color: var(--kid-muted);
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
