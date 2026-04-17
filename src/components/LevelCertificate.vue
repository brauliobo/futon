<template lang="pug">
  div(data-testid="certificate-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="$emit('close')")
    div(class="certificate relative w-full max-w-lg rounded-3xl bg-kid-surface border-4 border-kid-gold shadow-2xl p-8 text-center space-y-4 animate-bounce-in overflow-hidden")
      //- Confetti
      div(class="absolute inset-0 pointer-events-none overflow-hidden")
        span(
          v-for="i in 14" :key="'c'+i"
          class="absolute text-xl animate-confetti"
          :style="{ left: ((i * 41) % 100) + '%', top: '-10px', animationDelay: (i * 0.1) + 's' }"
        ) {{ ['🎉', '⭐', '✨', '🌟', '🎊', '💫', '🏆'][i % 7] }}

      div(class="relative")
        div(class="text-7xl animate-wiggle") 🏆
        h1(class="text-3xl font-black text-kid-text mt-2") {{ $t('levelComplete') }}
        div(class="rounded-2xl bg-gradient-to-b from-kid-gold/15 to-kid-gold/5 border-2 border-kid-gold/40 p-5 space-y-1.5 mt-3 gold-glow")
          p(class="text-base font-semibold text-kid-muted uppercase tracking-wide") {{ $t('certificateOfMastery') }}
          p(class="text-2xl font-black text-kid-text") {{ profileName || $t('learner') }}
          p(class="text-base font-semibold text-kid-muted") {{ $t('hasMastered') }}
          p(class="text-3xl font-black" :style="{ color: subjectColor }") {{ subjectLabel }} — {{ $t('level') }} {{ level }}
          p(class="text-base text-kid-muted mt-1") {{ formattedDate }}
        div(class="flex items-center justify-center gap-2 text-4xl mt-3")
          span(v-for="n in 3" :key="n" class="star-glow animate-star-pop" :style="{ animationDelay: (0.3 + n * 0.2) + 's' }") ⭐
        div(class="flex gap-3 justify-center pt-3")
          button(@click="$emit('close')" class="rounded-2xl border-2 theme-border-strong px-6 py-3 font-bold text-kid-muted hover:border-kid-blue/40 hover:text-kid-blue transition-all active:scale-95") {{ $t('close') }}
          button(@click="print" class="rounded-2xl bg-kid-gold px-6 py-3 font-bold text-white hover:shadow-lg transition-all active:scale-95 gold-glow") 🖨️ {{ $t('print') }}
</template>

<style>
@media print {
  body > * { display: none !important; }
  .certificate { display: block !important; position: fixed; inset: 0; border-radius: 0; max-width: none; box-shadow: none; }
}
</style>

<script>
import { SubjectBranding } from '../utils/SubjectBranding.js';
export default {
  name: 'LevelCertificate',
  emits: ['close'],
  mounted() { navigator.vibrate?.([40, 60, 40, 60, 80]); },
  props: {
    subject: { type: String, required: true },
    level: { type: String, required: true },
    profileName: { type: String, default: '' },
  },
  computed: {
    subjectLabel() { return this.$t(`subject_${this.subject}`) || this.subject; },
    subjectColor() { return SubjectBranding.color(this.subject); },
    formattedDate() { return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); },
  },
  methods: {
    print() { window.print(); },
  },
};
</script>
