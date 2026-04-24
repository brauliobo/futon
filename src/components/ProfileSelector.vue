<template lang="pug">
  div(data-testid="profile-selector" class="min-h-screen bg-gradient-to-b from-kid-bg to-kid-blue/5 flex flex-col items-center justify-center p-6")
    //- Floating decorative emojis
    div(class="fixed inset-0 pointer-events-none overflow-hidden")
      span(class="absolute top-[10%] left-[8%] text-5xl opacity-20 animate-wiggle") 📚
      span(class="absolute top-[18%] right-[12%] text-5xl opacity-20 animate-wiggle" style="animation-delay:0.3s") ⭐
      span(class="absolute bottom-[14%] left-[15%] text-5xl opacity-20 animate-wiggle" style="animation-delay:0.6s") 🎯
      span(class="absolute bottom-[10%] right-[10%] text-5xl opacity-20 animate-wiggle" style="animation-delay:0.9s") 🚀

    div(class="w-full max-w-md space-y-6 animate-bounce-in relative")
      div(class="text-center space-y-3")
        div(class="text-6xl") ✏️
        h1(class="text-5xl font-black text-kid-blue") Futon
        p(class="text-lg font-semibold text-kid-muted") {{ $t('whoIsLearning') }}

      div(class="space-y-3")
        button(
          v-for="(profile, i) in profiles"
          :key="profile.id"
          @click="selectProfile(profile)"
          class="w-full flex items-center gap-4 rounded-2xl border-2 theme-border-strong bg-kid-surface p-5 shadow-sm transition-all duration-200 hover:border-kid-blue/40 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01] active:scale-95 animate-slide-up"
          :style="{ animationDelay: (i * 0.08) + 's' }"
        )
          span(class="text-5xl") {{ profile.avatar }}
          span(class="text-xl font-black text-kid-text") {{ profile.name }}
          span(class="ml-auto text-kid-blue text-2xl font-bold") →

      div(class="border-t theme-border-strong pt-4")
        div(v-if="!showNewForm" class="text-center")
          button(@click="showNewForm = true" class="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-kid-blue/30 px-6 py-3.5 text-base font-bold text-kid-blue/70 hover:border-kid-blue hover:text-kid-blue hover:bg-kid-blue/5 transition-all duration-200")
            span(class="text-xl") ＋
            span {{ $t('addLearner') }}

        div(v-else class="space-y-4 animate-slide-up")
          input(
            v-model="newName"
            :placeholder="$t('enterName') || 'Enter name...'"
            class="w-full rounded-2xl border-4 border-kid-blue/30 bg-kid-surface px-4 py-3.5 text-xl font-bold text-kid-text placeholder:text-kid-muted/40 focus:outline-none focus:border-kid-blue focus:shadow-lg focus:blue-glow transition-all"
            @keydown.enter.prevent="createProfile"
            ref="nameInput"
            autofocus
          )
          div(class="space-y-2")
            p(class="text-sm font-bold text-kid-muted text-center") {{ $t('pickAvatar') || 'Pick your avatar' }}
            div(class="grid grid-cols-6 gap-2")
              button(
                v-for="a in avatars"
                :key="a"
                @click="selectedAvatar = a"
                :class="['avatar-btn', { 'avatar-btn--selected': a === selectedAvatar }]"
                type="button"
                :aria-pressed="selectedAvatar === a"
              ) {{ a }}
          div(class="flex gap-3")
            button(v-if="profiles.length > 0" @click="cancelForm" class="flex-1 rounded-2xl border-2 theme-border-strong py-3 font-bold text-kid-muted hover:border-kid-red/40 hover:text-kid-red transition-all active:scale-95") {{ $t('cancel') }}
            button(@click="createProfile" :disabled="!newName.trim()" class="flex-1 rounded-2xl bg-kid-blue py-3 font-bold text-white shadow-sm disabled:bg-kid-muted/20 disabled:text-kid-muted disabled:shadow-none disabled:cursor-not-allowed hover:shadow-lg hover:bg-kid-blue/90 transition-all active:scale-95") {{ $t('create') }}
</template>

<script>
import { AVATARS } from '../services/ProfileStorage.js';
import { useProfileStore } from '../stores/profileStore.js';

export default {
  name: 'ProfileSelector',
  emits: ['profile-selected'],
  data() {
    const profileStore = useProfileStore();
    return {
      profileStore,
      showNewForm: false,
      newName: '',
      avatars: AVATARS,
      selectedAvatar: AVATARS[profileStore.profiles.length % AVATARS.length],
    };
  },
  computed: {
    profiles() { return this.profileStore.profiles; },
  },
  mounted() {
    if (this.profiles.length === 0) this.showNewForm = true;
    this.$nextTick(() => this.$refs.nameInput?.focus());
  },
  watch: {
    showNewForm(v) { if (v) this.$nextTick(() => this.$refs.nameInput?.focus()); },
  },
  methods: {
    selectProfile(profile) {
      this.$emit('profile-selected', profile);
    },
    createProfile() {
      if (!this.newName.trim()) return;
      const profile = this.profileStore.createProfile(this.newName, this.selectedAvatar);
      this.cancelForm();
      this.selectProfile(profile);
    },
    cancelForm() {
      this.showNewForm = false;
      this.newName = '';
      this.selectedAvatar = this.avatars[this.profiles.length % this.avatars.length];
    },
  },
};
</script>
