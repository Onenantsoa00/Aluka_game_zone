<template>
  <span class="num">{{ display }}</span>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  money: { type: Boolean, default: false },
  suffix: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  duration: { type: Number, default: 950 },
})

const current = ref(0)
let raf = null

const display = computed(() => {
  const formatted = current.value.toLocaleString('fr-FR', {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  })
  return `${formatted}${props.money ? ' Ar' : ''}${props.suffix ? ` ${props.suffix}` : ''}`
})

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

function run(from, to) {
  if (raf) cancelAnimationFrame(raf)
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    current.value = to
    return
  }
  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / props.duration)
    current.value = from + (to - from) * easeOutCubic(t)
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

watch(
  () => props.value,
  (to, from) => run(from || 0, to || 0),
)

onMounted(() => run(0, props.value || 0))
onBeforeUnmount(() => raf && cancelAnimationFrame(raf))
</script>
