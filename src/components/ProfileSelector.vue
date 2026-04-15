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

        div(v-else class="space-y-3 animate-slide-up")
          input(
            v-model="newName"
            :placeholder="$t('enterName') || 'Enter name...'"
            class="w-full rounded-2xl border-4 border-kid-blue/30 bg-kid-surface px-4 py-3.5 text-xl font-bold text-kid-text placeholder:text-kid-muted/40 focus:outline-none focus:border-kid-blue focus:shadow-lg focus:blue-glow transition-all"
            @keydown.enter.prevent="createProfile"
            ref="nameInput"
            autofocus
          )
          div(class="flex gap-3")
            button(@click="showNewForm = false; newName = ''" class="flex-1 rounded-2xl border-2 theme-border-strong py-3 font-bold text-kid-muted hover:border-kid-red/40 hover:text-kid-red transition-all active:scale-95") {{ $t('cancel') }}
            button(@click="createProfile" :disabled="!newName.trim()" class="flex-1 rounded-2xl bg-kid-blue py-3 font-bold text-white disabled:opacity-30 hover:shadow-lg hover:bg-kid-blue/90 transition-all active:scale-95") {{ $t('create') }}
</template>

<script>
import { ProfileStorage } from '../services/ProfileStorage.js';

export default {
  name: 'ProfileSelector',
  emits: ['profile-selected'],
  data() {
    return { profiles: ProfileStorage.getProfiles(), showNewForm: false, newName: '' };
  },
  mounted() {
    if (this.profiles.length === 0) this.showNewForm = true;
  },
  methods: {
    selectProfile(profile) {
      ProfileStorage.setActiveProfileId(profile.id);
      this.$emit('profile-selected', profile);
    },
    createProfile() {
      if (!this.newName.trim()) return;
      const profile = ProfileStorage.createProfile(this.newName);
      this.profiles = ProfileStorage.getProfiles();
      this.showNewForm = false;
      this.newName = '';
      this.selectProfile(profile);
    },
  },
};
</script>
