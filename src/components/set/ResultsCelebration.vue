<template lang="pug">
  div(data-testid="results" class="relative rounded-3xl border-2 p-6 text-center space-y-4 overflow-hidden" :class="containerClass")
    //- Confetti burst for mastery
    div(v-if="status === 'mastery'" class="absolute inset-0 pointer-events-none overflow-hidden")
      span(
        v-for="i in 18" :key="'c'+i"
        class="absolute text-2xl animate-confetti"
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
        class="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 animate-slide-up"
        :class="status === 'mastery' ? 'bg-kid-green green-glow' : 'bg-kid-blue'"
        style="animation-delay:0.35s"
      )
        span 🚀
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
      const base = 'text-6xl animate-bounce-in';
      return this.status === 'mastery' ? `${base} animate-wiggle` : base;
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
      const delay = (i * 0.08);
      const size = 14 + (i % 3) * 6;
      return { left: `${left}%`, top: '-10px', animationDelay: `${delay}s`, fontSize: `${size}px` };
    },
    confettiEmoji(i) {
      return ['🎉', '⭐', '🌟', '✨', '🎊', '💫'][i % 6];
    },
  },
};
</script>
