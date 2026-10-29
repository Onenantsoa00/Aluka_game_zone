<template>
  <UiCard title="Recettes par salle" hint="Encaissements − remboursements, par salle">
    <template #actions>
      <UiBadge tone="brand" :label="`${data.length} salle(s)`" />
    </template>
    <UiBars :data="data" />
  </UiCard>
</template>

<script setup>
import { UiBadge, UiBars, UiCard } from 'src/components/ui'

defineProps({
  data: { type: Array, default: () => [] },
})
</script>
