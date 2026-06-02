<template lang="pug">
  div(data-testid="reading-passage" class="rounded-3xl border-2 border-l-4 border-kid-blue/20 border-l-kid-blue bg-kid-blue/8 p-3 space-y-2 mb-3 sticky top-16 z-10 shadow-md animate-slide-up")
    div(class="flex items-center justify-between gap-2")
      div(class="flex items-center gap-2")
        span(class="text-xl" aria-hidden="true") 📖
        span(class="text-base font-black text-kid-blue uppercase") {{ $t('readCarefully') || 'Read carefully' }}
      button(
        v-if="isLong"
        type="button"
        class="passage-toggle"
        :aria-expanded="String(expanded)"
        @click="expanded = !expanded"
      ) {{ expanded ? ($t('hideText') || 'Hide text') : ($t('showText') || 'Show text') }}
    p(
      :class="['passage-text text-lg font-semibold text-kid-text whitespace-pre-line', { 'passage-text--collapsed': isLong && !expanded }]"
      v-html="rendered"
    )
</template>

<script>
const COLLAPSIBLE_PASSAGE_LENGTH = 360;

export default {
  name: 'ReadingPassage',
  props: { passage: { type: String, required: true } },
  data() {
    return { expanded: false };
  },
  computed: {
    isLong() { return String(this.passage || '').length > COLLAPSIBLE_PASSAGE_LENGTH; },
    rendered() {
      const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      return escape(this.passage).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
    },
  },
  watch: {
    passage() { this.expanded = false; },
  },
};
</script>

<style>
.passage-text {
  line-height: 1.7;
  max-width: 48ch;
  margin-inline: auto;
}
.passage-text--collapsed {
  max-height: 8.5rem;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, #000 65%, transparent);
  mask-image: linear-gradient(to bottom, #000 65%, transparent);
}
.passage-toggle {
  flex: none;
  border-radius: 999px;
  border: 2px solid var(--kid-blue-30);
  background: var(--kid-surface);
  color: var(--kid-blue);
  font-size: 0.75rem;
  font-weight: 900;
  line-height: 1;
  padding: 0.5rem 0.75rem;
}
.passage-text ruby rt {
  font-size: 0.6em;
  color: var(--kid-muted);
  font-weight: 600;
  letter-spacing: 0;
}
</style>
