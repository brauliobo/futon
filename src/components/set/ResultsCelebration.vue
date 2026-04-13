<template lang="pug">
  div(data-testid="results" class="rounded-3xl border-2 p-6 text-center space-y-4" :class="containerClass")
    div(class="text-5xl animate-bounce-in") {{ statusEmoji }}
    h2(class="text-2xl font-black" :class="titleColor") {{ statusTitle }}
    p(class="text-base font-semibold text-kid-muted") {{ statusMessage }}
    div(class="flex items-center justify-center gap-2 my-2")
      span(v-for="n in 3" :key="n" :class="starClass(n)" class="text-4xl transition-all" :style="starStyle(n)") ★
    div(class="grid grid-cols-2 gap-3 mt-2")
      div(class="rounded-2xl bg-white border border-black/5 p-3")
        p(class="text-xs font-semibold text-kid-muted mb-1") {{ $t('finalScore') || 'Score' }}
        p(class="text-2xl font-black text-kid-text") {{ correct }}/{{ total }}
      div(class="rounded-2xl bg-white border border-black/5 p-3")
        p(class="text-xs font-semibold text-kid-muted mb-1") {{ $t('grade') || 'Grade' }}
        p(class="text-2xl font-black" :class="gradeColor") {{ gradePercent }}%
    button(v-if="hasNextSet && (status === 'mastery' || status === 'pass')" @click="$emit('next-set')" class="w-full mt-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black text-white shadow-md transition hover:opacity-90 bg-kid-green animate-bounce-in")
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
    statusTitle() {
      const key = `statusTitle_${this.status}`;
      return this.$t(key) || '';
    },
    statusMessage() {
      const key = `statusMsg_${this.status}`;
      return this.$t(key) || '';
    },
    containerClass() {
      return {
        mastery: 'border-kid-green/40 bg-kid-green/5',
        pass:    'border-amber-300/40 bg-amber-50',
        retry:   'border-kid-red/20 bg-red-50',
      }[this.status] || 'border-black/5 bg-white';
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
    starClass(n) { return n <= this.starCount ? 'text-kid-gold' : 'text-slate-200'; },
    starStyle(n) {
      if (n > this.starCount) return {};
      return { animationDelay: `${(n - 1) * 0.15}s`, animation: 'star-pop 0.5s ease-out forwards' };
    },
  },
};
</script>
