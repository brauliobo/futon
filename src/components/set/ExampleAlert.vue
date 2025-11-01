<!-- src/components/set/ExampleAlert.vue -->
<template lang="pug">
  Alert(variant="info")
    strong {{ $t('example') }}:
    |  {{ example }}
</template>

<script>
import Alert from "../ui/Alert.vue";

export default {
  name: "ExampleAlert",
  components: {
    Alert,
  },
  props: {
    example: {
      type: String,
      required: true,
    },
  },
};
</script>

