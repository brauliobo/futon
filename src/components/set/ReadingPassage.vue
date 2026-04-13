<template lang="pug">
  div(data-testid="reading-passage" class="rounded-3xl border-2 border-kid-blue/20 bg-kid-blue/5 p-5 space-y-2 mb-2 sticky top-16 z-10")
    div(class="flex items-center gap-2")
      span(class="text-xl") 📖
      span(class="text-sm font-black text-kid-blue uppercase tracking-wide") {{ $t('readCarefully') || 'Read carefully' }}
    p(class="text-base font-semibold text-kid-text leading-relaxed whitespace-pre-line") {{ passage }}
</template>

<script>
export default {
  name: 'ReadingPassage',
  props: { passage: { type: String, required: true } },
};
</script>
