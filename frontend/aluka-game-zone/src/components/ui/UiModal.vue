<template>
  <q-dialog
    :model-value="modelValue"
    :persistent="persistent"
    transition-show="scale"
    transition-hide="scale"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="ui-modal" :style="{ width }">
      <header class="ui-modal__head">
        <div>
          <div class="ui-modal__title">{{ title }}</div>
          <div v-if="subtitle" class="ui-modal__subtitle">{{ subtitle }}</div>
        </div>
        <UiButton variant="icon" icon="close" aria-label="Fermer" @click="close" />
      </header>

      <div class="ui-modal__body">
        <slot />
      </div>

      <footer v-if="$slots.actions" class="ui-modal__foot">
        <slot name="actions" />
      </footer>
    </q-card>
  </q-dialog>
</template>

<script setup>
import UiButton from './UiButton.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  persistent: { type: Boolean, default: false },
  width: { type: String, default: 'min(560px, 94vw)' },
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.ui-modal {
  max-width: 100%;
  border-radius: var(--r-xl);
  overflow: hidden;
}
.ui-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--line-soft);
}
.ui-modal__title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-1);
}
.ui-modal__subtitle {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-3);
}
.ui-modal__body {
  padding: 20px 22px;
}
.ui-modal__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px 18px;
  border-top: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.015);
}
</style>
