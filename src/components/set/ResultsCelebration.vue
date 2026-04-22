<template lang="pug">
  div(data-testid="results" class="relative rounded-3xl border-2 p-6 text-center space-y-4 overflow-hidden" :class="containerClass")
    //- Confetti burst for mastery — staggered over 1.5s for landed celebration
    div(v-if="knownStatus === 'mastery'" class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true")
      span(
        v-for="i in 32" :key="'c'+i"
        class="absolute animate-confetti"
        :style="confettiStyle(i)"
      ) {{ confettiEmoji(i) }}

    div(class="relative")
      div(:class="emojiClass") {{ statusEmoji }}
      h2(v-if="statusTitle" class="text-2xl font-black mt-2 animate-slide-up" :class="titleColor") {{ statusTitle }}
      p(v-if="statusMessage" class="text-base font-semibold text-kid-muted animate-slide-up" style="animation-delay:0.1s") {{ statusMessage }}

      div(class="flex items-center justify-center gap-3 my-3")
        span(
          v-for="n in 3" :key="n"
          :class="starClass(n)"
          :style="starStyle(n)"
        ) ★

      div(class="grid grid-cols-2 gap-3 mt-2")
        div(class="rounded-2xl bg-kid-surface border theme-border p-3 animate-slide-up" style="animation-delay:0.2s")
          p(class="text-sm font-semibold text-kid-muted mb-1")
            span(class="mr-1" aria-hidden="true") ✅
            span {{ $t('finalScore') || 'Correct' }}
          p(class="text-2xl font-black text-kid-text tabular-nums") {{ animScore }}/{{ total }}
        div(class="rounded-2xl bg-kid-surface border theme-border p-3 animate-slide-up" style="animation-delay:0.25s")
          p(class="text-sm font-semibold text-kid-muted mb-1")
            span(class="mr-1" aria-hidden="true") 📊
            span {{ $t('grade') || 'Grade' }}
          p(class="text-2xl font-black tabular-nums" :class="gradeColor") {{ animGrade }}%

      div(class="gate-panel mt-3 animate-slide-up" :class="gatePanelClass" style="animation-delay:0.3s")
        p(class="gate-panel-title")
          span(class="mr-1" aria-hidden="true") 🎯
          span {{ $t('gateTitle') }}
        div(class="gate-row")
          span(class="gate-row-icon" aria-hidden="true") {{ accuracyPass ? '✅' : '❌' }}
          span(class="gate-row-label") {{ $t('gateAccuracy') }}
          span(class="gate-row-actual tabular-nums" :class="accuracyPass ? 'text-kid-green' : 'text-kid-red'") {{ accuracyPct }}%
          span(class="gate-row-req tabular-nums text-kid-muted") ({{ $t('gateNeedMin') }} {{ accuracyMin }}%)
        div(class="gate-row")
          span(class="gate-row-icon" aria-hidden="true") {{ speedPass ? '✅' : '❌' }}
          span(class="gate-row-label") {{ $t('gateSpeed') }}
          span(class="gate-row-actual tabular-nums" :class="speedPass ? 'text-kid-green' : 'text-kid-red'") {{ avgSecondsRounded }}s
          span(class="gate-row-req tabular-nums text-kid-muted") ({{ $t('gateNeedMax') }} {{ speedMax }}s)
        p(class="gate-hint" :class="gateHintClass")
          | {{ gateHint }}

      button(
        v-if="hasNextSet && (knownStatus === 'mastery' || knownStatus === 'pass')"
        @click="$emit('next-set')"
        :class="['mt-3 btn-block animate-slide-up text-lg font-black', knownStatus === 'mastery' ? 'btn-success' : 'btn-primary']"
        style="animation-delay:0.35s"
      )
        span(aria-hidden="true") 🚀
        span {{ $t('nextSet') }}
      button(
        v-if="knownStatus === 'retry'"
        @click="$emit('retry-set')"
        class="mt-3 btn-block btn-primary animate-slide-up text-lg font-black"
        style="animation-delay:0.35s"
        data-testid="retry-set"
      )
        span(aria-hidden="true") 🔁
        span {{ $t('retryAgain') }}
</template>

<script>
export default {
  name: 'ResultsCelebration',
  emits: ['next-set', 'retry-set'],
  data() { return { animScore: 0, animGrade: 0 }; },
  mounted() { this.animateCounters(); },
  props: {
    status: { type: String, default: '' },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    gradePercent: { type: Number, default: 0 },
    hasNextSet: { type: Boolean, default: false },
    avgSeconds: { type: Number, default: 0 },
    passCriteria: { type: Object, default: () => ({ minAccuracyPercent: 85, maxAvgSecondsPerExercise: 6 }) },
  },
  computed: {
    accuracy() { return this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0; },
    knownStatus() {
      if (['mastery', 'pass', 'retry'].includes(this.status)) return this.status;
      if (this.total <= 0) return '';
      if (this.accuracy === 100) return 'mastery';
      if (this.accuracy >= 85) return 'pass';
      return 'retry';
    },
    effectiveGrade() { return this.gradePercent || this.accuracy; },
    starCount() { return { mastery: 3, pass: 2, retry: 1 }[this.knownStatus] || 0; },
    statusEmoji() { return { mastery: '🌟', pass: '🎉', retry: '💪' }[this.knownStatus] || '📝'; },
    statusTitle() {
      if (!this.knownStatus) return '';
      const k = `statusTitle_${this.knownStatus}`;
      const v = this.$t(k);
      return v === k ? '' : v;
    },
    statusMessage() {
      if (!this.knownStatus) return '';
      const k = `statusMsg_${this.knownStatus}`;
      const v = this.$t(k);
      return v === k ? '' : v;
    },
    emojiClass() {
      const base = 'inline-block animate-bounce-in';
      if (this.knownStatus === 'mastery') return `${base} text-8xl animate-wiggle drop-shadow-lg`;
      if (this.knownStatus === 'pass') return `${base} text-7xl`;
      return `${base} text-6xl`;
    },
    containerClass() {
      return {
        mastery: 'border-kid-green/40 bg-gradient-to-b from-kid-green/10 to-kid-green/5',
        pass:    'border-amber-300/40 bg-gradient-to-b from-amber-400/10 to-amber-400/5',
        retry:   'border-kid-red/30 bg-gradient-to-b from-kid-red/10 to-kid-red/5',
      }[this.knownStatus] || 'theme-border bg-kid-surface';
    },
    titleColor() {
      return { mastery: 'text-kid-green', pass: 'text-amber-500', retry: 'text-kid-red' }[this.knownStatus] || 'text-kid-text';
    },
    gradeColor() {
      if (this.effectiveGrade >= 90) return 'text-kid-green';
      if (this.effectiveGrade >= 70) return 'text-amber-500';
      return 'text-kid-red';
    },
    accuracyPct() { return this.accuracy; },
    accuracyMin() { return this.passCriteria?.minAccuracyPercent ?? 85; },
    speedMax() { return this.passCriteria?.maxAvgSecondsPerExercise ?? 6; },
    avgSecondsRounded() { return Math.round((Number(this.avgSeconds) || 0) * 10) / 10; },
    accuracyPass() { return this.accuracyPct >= this.accuracyMin; },
    speedPass() { return this.avgSecondsRounded > 0 && this.avgSecondsRounded <= this.speedMax; },
    gatePanelClass() { return this.knownStatus === 'retry' ? 'gate-panel-retry' : 'gate-panel-ok'; },
    gateHintClass() { return this.knownStatus === 'retry' ? 'text-kid-red' : 'text-kid-green'; },
    gateHint() {
      return this.knownStatus === 'retry' ? this.$t('gateRetryHint') : this.$t('gatePassHint');
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
    animateCounters() {
      const duration = 800;
      const start = performance.now();
      const targetScore = this.correct;
      const targetGrade = this.effectiveGrade;
      const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const p = ease(t);
        this.animScore = Math.round(p * targetScore);
        this.animGrade = Math.round(p * targetGrade);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
  },
};
</script>
