<template>
  <section class="grid-postes">
    <template v-if="loading && !postes.length">
      <div v-for="n in 6" :key="n" class="poste-card" style="cursor: default">
        <div class="poste-card__top">
          <UiSkeleton width="40px" height="40px" radius="11px" />
          <div style="flex: 1">
            <UiSkeleton width="60%" height="12px" />
            <div style="height: 6px" />
            <UiSkeleton width="40%" height="10px" />
          </div>
        </div>
        <UiSkeleton height="10px" width="70%" />
      </div>
    </template>

    <template v-else>
      <GameCard
        v-for="(p, index) in postes"
        :key="p.id || p.name"
        :index="index"
        :name="p.name"
        :icon-text="p.icon"
        :game="p.game"
        :time-remaining="p.time"
        :overtime="p.overtime"
        :status="p.status"
        :salle="p.salle"
        :console-name="p.console"
        @select="$emit('select', p)"
      />
    </template>

    <div v-if="!loading && !postes.length" style="grid-column: 1 / -1">
      <UiCard flush>
        <UiEmptyState
          icon="desktop_windows"
          title="Aucun poste dans cette salle"
          text="Créez une salle et ses postes pour commencer à encaisser des sessions."
        >
          <UiButton variant="ghost" icon="meeting_room" label="Gérer les salles" to="/salles" />
        </UiEmptyState>
      </UiCard>
    </div>
  </section>
</template>

<script setup>
import GameCard from './GameCard.vue'
import { UiButton, UiCard, UiEmptyState, UiSkeleton } from 'src/components/ui'

defineProps({
  postes: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

defineEmits(['select'])
</script>
