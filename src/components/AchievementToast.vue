<template lang="pug">
  div(class="achievement-toast")
    div(
      v-for="a in achievements"
      :key="a.id"
      class="achievement-toast__item"
    )
      span(class="achievement-toast__icon") {{ a.icon }}
      span(class="achievement-toast__name") {{ a.name }}
</template>

<script>
export default {
  name: 'AchievementToast',
  emits: ['dismissed'],
  props: {
    achievements: { type: Array, required: true },
  },
  mounted() {
    setTimeout(() => this.$emit('dismissed'), 3000);
  },
};
</script>

<style scoped>
.achievement-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  pointer-events: none;
}

.achievement-toast__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--kid-surface);
  border: 2px solid var(--kid-gold);
  border-radius: 1rem;
  padding: 0.6rem 1.2rem;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--kid-text);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  max-width: 280px;
  animation: achievement-slide-up 0.4s ease-out forwards, achievement-fade-out 0.5s ease-in 2.5s forwards;
}

.achievement-toast__icon { font-size: 1.4rem; }

@keyframes achievement-slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes achievement-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
</style>
