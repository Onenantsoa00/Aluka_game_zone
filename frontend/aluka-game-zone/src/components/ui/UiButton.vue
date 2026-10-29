<template>
  <q-btn
    :unelevated="variant === 'primary'"
    :flat="['ghost', 'subtle', 'danger', 'icon'].includes(variant)"
    :class="btnClass"
    :label="label"
    :icon="icon"
    :loading="loading"
    :dense="size === 'sm'"
    :to="to"
    :type="type"
    :disable="disable"
    :aria-label="tooltip || label || icon || undefined"
    no-caps
    @click="$emit('click', $event)"
  >
    <slot />
    <q-tooltip v-if="tooltip" :delay="400">{{ tooltip }}</q-tooltip>
  </q-btn>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  icon: { type: String, default: '' },
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'ghost', 'subtle', 'danger', 'icon'].includes(v),
  },
  size: { type: String, default: 'md' },
  loading: { type: Boolean, default: false },
  disable: { type: Boolean, default: false },
  to: { type: [String, Object], default: undefined },
  type: { type: String, default: 'button' },
  tooltip: { type: String, default: '' },
})

defineEmits(['click'])

const btnClass = computed(() => ({
  'btn-primary': props.variant === 'primary',
  'btn-ghost': props.variant === 'ghost',
  'btn-subtle': props.variant === 'subtle',
  'btn-danger': props.variant === 'danger',
  'btn-icon': props.variant === 'icon' && !props.label,
  'btn-sm': props.size === 'sm',
}))
</script>
