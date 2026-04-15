<template lang="pug">
  div(data-testid="results" class="relative rounded-3xl border-2 p-6 text-center space-y-4 overflow-hidden" :class="containerClass")
    //- Confetti burst for mastery — staggered over 1.5s for landed celebration
    div(v-if="status === 'mastery'" class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true")
      span(
        v-for="i in 32" :key="'c'+i"
        class="absolute animate-confetti"
        :style="confettiStyle(i)"
      ) {{ confettiEmoji(i) }}

    div(class="relative")
      div(:class="emojiClass") {{ statusEmoji }}
      h2(class="text-2xl font-black mt-2 animate-slide-up" :class="titleColor") {{ statusTitle }}
      p(class="text-base font-semibold text-kid-muted animate-slide-up" style="animation-delay:0.1s") {{ statusMessage }}

      div(class="flex items-center justify-center gap-3 my-3")
        span(
          v-for="n in 3" :key="n"
          :class="starClass(n)"
          :style="starStyle(n)"
        ) ★

      div(class="grid grid-cols-2 gap-3 mt-2")
        div(class="rounded-2xl bg-kid-surface border theme-border p-3 animate-slide-up" style="animation-delay:0.2s")
          p(class="text-xs font-semibold text-kid-muted mb-1") {{ $t('finalScore') || 'Score' }}
          p(class="text-2xl font-black text-kid-text") {{ correct }}/{{ total }}
        div(class="rounded-2xl bg-kid-surface border theme-border p-3 animate-slide-up" style="animation-delay:0.25s")
          p(class="text-xs font-semibold text-kid-muted mb-1") {{ $t('grade') || 'Grade' }}
          p(class="text-2xl font-black" :class="gradeColor") {{ gradePercent }}%

      button(
        v-if="hasNextSet && (status === 'mastery' || status === 'pass')"
        @click="$emit('next-set')"
        :class="['mt-3 btn-block animate-slide-up text-lg font-black', status === 'mastery' ? 'btn-success' : 'btn-primary']"
        style="animation-delay:0.35s"
      )
        span(aria-hidden="true") 🚀
        span {{ $t('nextSet') }}
</template>

<script>
export default {
  name: 'ResultsCelebration',
  emits: ['next-set'],
  props: {
    status: { type: String, default: '' },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    gradePercent: { type: Number, default: 0 },
    hasNextSet: { type: Boolean, default: false },
  },
  computed: {
    starCount() {
      if (this.status === 'mastery') return 3;
      if (this.status === 'pass') return 2;
      if (this.status === 'retry') return 1;
      return 0;
    },
    statusEmoji() {
      return { mastery: '🌟', pass: '🎉', retry: '💪' }[this.status] || '📝';
    },
    statusTitle() { return this.$t(`statusTitle_${this.status}`) || ''; },
    statusMessage() { return this.$t(`statusMsg_${this.status}`) || ''; },
    emojiClass() {
      const base = 'inline-block animate-bounce-in';
      if (this.status === 'mastery') return `${base} text-8xl animate-wiggle drop-shadow-lg`;
      if (this.status === 'pass') return `${base} text-7xl`;
      return `${base} text-6xl`;
    },
    containerClass() {
      return {
        mastery: 'border-kid-green/40 bg-gradient-to-b from-kid-green/10 to-kid-green/5',
        pass:    'border-amber-300/40 bg-gradient-to-b from-amber-400/10 to-amber-400/5',
        retry:   'border-kid-red/30 bg-gradient-to-b from-kid-red/10 to-kid-red/5',
      }[this.status] || 'theme-border bg-kid-surface';
    },
    titleColor() {
      return { mastery: 'text-kid-green', pass: 'text-amber-500', retry: 'text-kid-red' }[this.status] || 'text-kid-text';
    },
    gradeColor() {
      if (this.gradePercent >= 90) return 'text-kid-green';
      if (this.gradePercent >= 70) return 'text-amber-500';
      return 'text-kid-red';
    },
  },
  methods: {
    starClass(n) {
      if (n <= this.starCount) return 'text-5xl star-glow text-kid-gold transition-all';
      return 'text-4xl theme-star-empty transition-all';
    },
    starStyle(n) {
      if (n > this.starCount) return { opacity: 0.3 };
      return { animationDelay: `${(n - 1) * 0.2}s`, animation: 'star-pop 0.6s ease-out forwards' };
    },
    confettiStyle(i) {
      const left = ((i * 37) % 100);
      const delay = i < 6 ? i * 0.04 : 0.3 + (i - 6) * 0.06;
      const size = 16 + (i % 4) * 8;
      const duration = 1.2 + (i % 5) * 0.25;
      return { left: `${left}%`, top: '-20px', animationDelay: `${delay}s`, animationDuration: `${duration}s`, fontSize: `${size}px` };
    },
    confettiEmoji(i) {
      return ['🎉', '⭐', '🌟', '✨', '🎊', '💫'][i % 6];
    },
  },
};
</script>
