<template>
  <component :is="tag" class="ui-card" :class="{ 'ui-card--hover': hover, 'ui-card--flush': flush }">
    <header v-if="title || hint || $slots.header || $slots.actions" class="ui-card__head">
      <div>
        <slot name="header">
          <div class="ui-card__title">{{ title }}</div>
          <div v-if="hint" class="ui-card__hint">{{ hint }}</div>
        </slot>
      </div>
      <div v-if="$slots.actions" class="row-tight">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </component>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  hint: { type: String, default: '' },
  hover: { type: Boolean, default: false },
  flush: { type: Boolean, default: false },
  tag: { type: String, default: 'section' },
})
</script>
