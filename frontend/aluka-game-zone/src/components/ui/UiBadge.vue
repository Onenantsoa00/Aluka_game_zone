<template>
  <span class="ui-badge" :class="`ui-badge--${tone}`">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  tone: {
    type: String,
    default: 'neutral',
    validator: (v) => ['neutral', 'ok', 'warn', 'danger', 'info', 'brand'].includes(v),
  },
})
</script>
