<template>
  <motion.div
    class="ui-stat"
    :style="{ '--stat-color': toneColor, '--stat-glow': toneGlow }"
    :initial="{ opacity: 0, y: 14 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.4, delay, ease: [0.32, 0.72, 0, 1] }"
  >
    <div class="ui-stat__head">
      <span class="ui-stat__label">{{ label }}</span>
      <span v-if="icon" class="ui-stat__icon">
        <q-icon :name="icon" size="16px" />
      </span>
    </div>
    <div class="ui-stat__value">
      <UiCountUp v-if="typeof value === 'number'" :value="value" :money="money" :suffix="suffix" />
      <template v-else>{{ value }}</template>
    </div>
    <div v-if="hint || delta" class="ui-stat__foot">
      <span v-if="delta" class="ui-stat__delta" :class="delta >= 0 ? 'up' : 'down'">
        <q-icon :name="delta >= 0 ? 'trending_up' : 'trending_down'" size="14px" />
        {{ Math.abs(delta) }}%
      </span>
      <span>{{ hint }}</span>
    </div>
  </motion.div>
</template>

<script setup>
import { computed } from 'vue'
import { motion } from 'motion-v'
import UiCountUp from './UiCountUp.vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  icon: { type: String, default: '' },
  tone: { type: String, default: 'brand' },
  hint: { type: String, default: '' },
  delta: { type: Number, default: null },
  money: { type: Boolean, default: false },
  suffix: { type: String, default: '' },
  delay: { type: Number, default: 0 },
})

const colors = {
  brand: 'var(--brand)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--info)',
}
const glows = {
  brand: 'rgba(45, 212, 232, 0.22)',
  ok: 'rgba(61, 220, 151, 0.2)',
  warn: 'rgba(245, 181, 68, 0.2)',
  danger: 'rgba(255, 107, 107, 0.2)',
  info: 'rgba(90, 169, 255, 0.2)',
}

const toneColor = computed(() => colors[props.tone] || colors.brand)
const toneGlow = computed(() => glows[props.tone] || glows.brand)
</script>
