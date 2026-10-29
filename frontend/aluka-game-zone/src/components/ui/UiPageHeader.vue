<template>
  <motion.header
    class="ui-page-header"
    :initial="{ opacity: 0, y: 10 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }"
  >
    <div>
      <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>
      <div class="title">{{ title }}</div>
      <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
    </div>
    <div v-if="$slots.actions" class="actions">
      <slot name="actions" />
    </div>
  </motion.header>
</template>

<script setup>
import { motion } from 'motion-v'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
})
</script>
