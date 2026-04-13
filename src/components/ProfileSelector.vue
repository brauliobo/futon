<template lang="pug">
  div(data-testid="profile-selector" class="min-h-screen bg-kid-bg flex flex-col items-center justify-center p-6")
    div(class="w-full max-w-md space-y-6")
      div(class="text-center space-y-1")
        h1(class="text-4xl font-black text-kid-blue") ✏️ Futon
        p(class="text-base font-semibold text-kid-muted") {{ $t('whoIsLearning') }}

      div(class="space-y-3")
        button(
          v-for="profile in profiles"
          :key="profile.id"
          @click="selectProfile(profile)"
          class="w-full flex items-center gap-4 rounded-2xl border-2 border-black/8 bg-white p-4 shadow-sm hover:border-kid-blue/40 hover:shadow-md transition"
        )
          span(class="text-4xl") {{ profile.avatar }}
          span(class="text-xl font-black text-kid-text") {{ profile.name }}
          span(class="ml-auto text-kid-muted text-xl") →

      div(class="border-t border-black/8 pt-4")
        div(v-if="!showNewForm" class="text-center")
          button(@click="showNewForm = true" class="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-black/15 px-6 py-3 text-base font-bold text-kid-muted hover:border-kid-blue/40 hover:text-kid-blue transition")
            span(class="text-xl") ＋
            span {{ $t('addLearner') }}

        div(v-else class="space-y-3")
          input(
            v-model="newName"
            :placeholder="$t('enterName') || 'Enter name...'"
            class="w-full rounded-2xl border-4 border-kid-blue/30 bg-white px-4 py-3 text-xl font-bold text-kid-text placeholder:text-slate-300 focus:outline-none focus:border-kid-blue"
            @keydown.enter.prevent="createProfile"
            ref="nameInput"
            autofocus
          )
          div(class="flex gap-3")
            button(@click="showNewForm = false; newName = ''" class="flex-1 rounded-2xl border-2 border-black/10 py-3 font-bold text-kid-muted hover:border-kid-red/40 hover:text-kid-red transition") {{ $t('cancel') }}
            button(@click="createProfile" :disabled="!newName.trim()" class="flex-1 rounded-2xl bg-kid-blue py-3 font-bold text-white disabled:opacity-40 hover:opacity-90 transition") {{ $t('create') }}
</template>

<script>
import { ProfileStorage } from '../services/ProfileStorage.js';

export default {
  name: 'ProfileSelector',
  emits: ['profile-selected'],
  data() {
    return {
      profiles: ProfileStorage.getProfiles(),
      showNewForm: false,
      newName: '',
    };
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
