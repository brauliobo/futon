<template lang="pug">
  div(data-testid="certificate-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" @click.self="$emit('close')")
    div(class="certificate w-full max-w-lg rounded-3xl bg-white border-4 border-kid-gold shadow-2xl p-8 text-center space-y-4 animate-bounce-in")
      div(class="text-6xl") 🏆
      h1(class="text-3xl font-black text-kid-text") {{ $t('levelComplete') }}
      div(class="rounded-2xl bg-kid-gold/10 border-2 border-kid-gold/40 p-4 space-y-1")
        p(class="text-base font-semibold text-kid-muted uppercase tracking-wide") {{ $t('certificateOfMastery') }}
        p(class="text-2xl font-black text-kid-text") {{ profileName || $t('learner') }}
        p(class="text-base font-semibold text-kid-muted") {{ $t('hasMastered') }}
        p(class="text-3xl font-black" :style="{ color: subjectColor }") {{ subjectLabel }} — {{ $t('level') }} {{ level }}
        p(class="text-sm text-kid-muted mt-1") {{ formattedDate }}
      div(class="flex items-center justify-center gap-1 text-3xl")
        span ⭐
        span ⭐
        span ⭐
      div(class="flex gap-3 justify-center pt-2")
        button(@click="$emit('close')" class="rounded-2xl border-2 border-black/10 px-6 py-3 font-bold text-kid-muted hover:border-kid-blue/40 hover:text-kid-blue transition") {{ $t('close') }}
        button(@click="print" class="rounded-2xl bg-kid-gold px-6 py-3 font-bold text-white hover:opacity-90 transition") 🖨️ {{ $t('print') }}
</template>

<style>
@media print {
  body > * { display: none !important; }
  .certificate { display: block !important; position: fixed; inset: 0; border-radius: 0; max-width: none; box-shadow: none; }
}
</style>

<script>
export default {
  name: 'LevelCertificate',
  emits: ['close'],
  props: {
    subject: { type: String, required: true },
    level: { type: String, required: true },
    profileName: { type: String, default: '' },
  },
  computed: {
    subjectLabel() { return this.$t(`subject_${this.subject}`) || this.subject; },
    subjectColor() { return { math: '#4A9EF5', portuguese: '#6BCB77', english: '#F97316' }[this.subject] || '#4A9EF5'; },
    formattedDate() { return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); },
  },
  methods: {
    print() { window.print(); },
  },
};
</script>
