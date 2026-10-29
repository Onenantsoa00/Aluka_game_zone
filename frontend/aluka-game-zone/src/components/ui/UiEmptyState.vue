<template>
  <div class="ui-empty">
    <div v-if="icon" class="ui-empty__icon">
      <q-icon :name="icon" size="22px" />
    </div>
    <div class="ui-empty__title">{{ title }}</div>
    <p v-if="text" class="ui-empty__text">{{ text }}</p>
    <div v-if="$slots.default" class="q-mt-sm">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'inbox' },
  title: { type: String, default: 'Aucune donnée' },
  text: { type: String, default: '' },
})
</script>
