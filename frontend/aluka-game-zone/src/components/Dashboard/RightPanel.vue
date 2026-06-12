<template>
  <aside class="right-panel fade-in">
    <div class="stats">
      <div class="stat-card">
        <div class="muted">Solde du jour</div>
        <div class="text-h6">{{ formatAriary(stats.jour) }}</div>
      </div>
      <div class="stat-card">
        <div class="muted">Solde du mois</div>
        <div class="text-h6">{{ formatAriary(stats.mois) }}</div>
      </div>
      <div class="stat-card">
        <div class="muted">Solde de l'année</div>
        <div class="text-h6">{{ formatAriary(stats.annee) }}</div>
      </div>
      <div class="stat-card">
        <div class="muted">Postes occupés</div>
        <div class="text-h6">{{ stats.postesActifs }}</div>
      </div>
    </div>

    <div class="q-mt-md">
      <div class="muted q-mb-xs">Postes les plus utilisés</div>
      <div v-for="p in topPostes" :key="p.nom_poste" class="event">
        {{ p.nom_poste }} — {{ p.utilisations }} sessions
      </div>
      <div v-if="!topPostes.length" class="event">Aucune donnée</div>
    </div>

    <div class="events q-mt-md">
      <div class="muted">Jeux populaires</div>
      <div v-for="j in topJeux" :key="j.nom" class="event">{{ j.nom }} — {{ j.utilisations }}×</div>
      <div v-if="!topJeux.length" class="event">Aucune donnée</div>
    </div>
  </aside>
</template>

<script setup>
import { formatAriary } from 'src/utils/mappers'

defineProps({
  stats: {
    type: Object,
    default: () => ({ jour: 0, mois: 0, annee: 0, postesActifs: 0 }),
  },
  topPostes: { type: Array, default: () => [] },
  topJeux: { type: Array, default: () => [] },
})
</script>

<style scoped>
.muted {
  color: var(--dc-text-muted);
}
.text-h6 {
  font-weight: 700;
  color: var(--dc-text);
  font-size: 1rem;
}
</style>
