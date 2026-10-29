<template>
  <q-page class="app-page">
    <UiPageHeader
      eyebrow="Design system"
      title="Banque de composants"
      subtitle="Tous les primitives premium de l'application, prêtes à réutiliser. Voir DESIGN.md pour les règles d'usage."
    >
      <template #actions>
        <UiBadge tone="brand" label="v1 — Pro Premium" />
      </template>
    </UiPageHeader>

    <div class="stack" style="--stack-gap: 20px">
      <UiCard title="Couleurs" hint="Tokens CSS exposés sur :root — jamais de couleur codée en dur dans un composant.">
        <div class="swatches">
          <div v-for="c in swatches" :key="c.token" class="swatch">
            <span class="chip" :style="{ background: `var(${c.token})` }" />
            <div>
              <div class="swatch-name">{{ c.name }}</div>
              <code class="swatch-token">{{ c.token }}</code>
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard title="Typographie" hint="Sora pour les titres et les chiffres clés, Inter pour le texte.">
        <div class="stack" style="--stack-gap: 8px">
          <div style="font-family: var(--font-display); font-size: 26px; font-weight: 700">
            Tableau de bord
          </div>
          <div style="font-family: var(--font-display); font-size: 18px; font-weight: 600">
            Titre de section
          </div>
          <div style="font-size: 14px; color: var(--text-1)">Corps de texte principal — 14 px</div>
          <div class="muted" style="font-size: 13px">Texte secondaire — 13 px</div>
          <div class="eyebrow">Libellé de section</div>
          <div class="num" style="font-family: var(--font-display); font-size: 22px; font-weight: 700">
            1 250 000 Ar
          </div>
        </div>
      </UiCard>

      <div class="ui-grid ui-grid--split">
        <UiCard title="Boutons">
          <div class="row-tight" style="flex-wrap: wrap; gap: 10px">
            <UiButton label="Action principale" icon="bolt" />
            <UiButton variant="ghost" label="Secondaire" icon="tune" />
            <UiButton variant="danger" label="Supprimer" icon="delete" />
            <UiButton variant="subtle" label="Discret" />
            <UiButton variant="icon" icon="refresh" tooltip="Icône seule" />
            <UiButton label="Chargement…" :loading="true" />
          </div>
        </UiCard>

        <UiCard title="Badges d'état">
          <div class="row-tight" style="flex-wrap: wrap; gap: 8px">
            <UiBadge tone="ok" label="Disponible" />
            <UiBadge tone="brand" label="En session" />
            <UiBadge tone="warn" label="En pause" />
            <UiBadge tone="danger" label="Bloqué" />
            <UiBadge tone="info" label="Boss" />
            <UiBadge tone="neutral" label="Neutre" />
          </div>
        </UiCard>
      </div>

      <UiCard title="Cartes de statistique" hint="Le compteur s'anime à l'apparition et respecte prefers-reduced-motion.">
        <div class="ui-grid ui-grid--stats">
          <UiStatCard label="Recette du jour" :value="1250000" money icon="today" tone="brand" />
          <UiStatCard label="Sessions" :value="42" icon="play_circle" tone="info" :delay="0.06" />
          <UiStatCard label="Postes occupés" :value="7" suffix="/ 12" icon="sports_esports" tone="warn" :delay="0.12" />
          <UiStatCard label="Alertes stock" :value="3" icon="warning" tone="danger" :delay="0.18" />
        </div>
      </UiCard>

      <UiCard title="Tableau de données" hint="En-têtes en majuscules, lignes de 52 px, hover discret.">
        <UiTable
          :rows="demoRows"
          :columns="demoColumns"
          row-key="id"
          :pagination="{ rowsPerPage: 5 }"
          empty-title="Aucune ligne"
        >
          <template #body-cell-statut="props">
            <q-td>
              <UiBadge :tone="props.row.statut === 'ok' ? 'ok' : 'warn'" :label="props.row.statut === 'ok' ? 'Actif' : 'En pause'" />
            </q-td>
          </template>
        </UiTable>
      </UiCard>

      <div class="ui-grid ui-grid--split">
        <UiCard title="États vides et chargement">
          <UiEmptyState
            icon="cloud_off"
            title="Aucune donnée"
            text="Un état vide explique toujours ce qui manque et l'action suivante."
          >
            <UiButton variant="ghost" size="sm" icon="refresh" label="Actualiser" />
          </UiEmptyState>
          <div class="q-mt-md stack" style="--stack-gap: 8px">
            <UiSkeleton width="70%" />
            <UiSkeleton width="45%" />
            <UiSkeleton width="90%" height="10px" />
          </div>
        </UiCard>

        <UiCard title="Modale et graphique">
          <div class="row-tight" style="flex-wrap: wrap; gap: 10px">
            <UiButton variant="ghost" icon="open_in_new" label="Ouvrir la modale" @click="showModal = true" />
          </div>
          <div class="q-mt-md">
            <UiBars :data="chartDemo" :limit="4" />
          </div>
        </UiCard>
      </div>
    </div>

    <UiModal v-model="showModal" title="Modale premium" subtitle="En-tête, corps et pied d'action optionnel.">
      <p class="muted" style="margin: 0">
        Utilisez <code>UiModal</code> pour toutes les confirmations riches : le focus, la fermeture
        et les transitions sont gérés.
      </p>
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showModal = false" />
        <UiButton label="Confirmer" @click="showModal = false" />
      </template>
    </UiModal>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import {
  UiBadge,
  UiBars,
  UiButton,
  UiCard,
  UiEmptyState,
  UiModal,
  UiPageHeader,
  UiSkeleton,
  UiStatCard,
  UiTable,
} from 'src/components/ui'

const showModal = ref(false)

const swatches = [
  { name: 'Fond', token: '--ink-950' },
  { name: 'Surface', token: '--surface-1' },
  { name: 'Surface élevée', token: '--surface-3' },
  { name: 'Marque', token: '--brand' },
  { name: 'Accent 2', token: '--brand-2' },
  { name: 'Succès', token: '--ok' },
  { name: 'Alerte', token: '--warn' },
  { name: 'Danger', token: '--danger' },
  { name: 'Info', token: '--info' },
  { name: 'Texte', token: '--text-1' },
  { name: 'Texte 2', token: '--text-2' },
  { name: 'Ligne', token: '--line' },
]

const demoColumns = [
  { name: 'poste', label: 'Poste', field: 'poste', align: 'left' },
  { name: 'jeu', label: 'Jeu', field: 'jeu', align: 'left' },
  { name: 'montant', label: 'Montant', field: 'montant', align: 'right' },
  { name: 'statut', label: 'Statut', field: 'statut', align: 'left' },
]

const demoRows = [
  { id: 1, poste: 'FAT — PS4', jeu: 'PES 2021', montant: '1 200 Ar', statut: 'ok' },
  { id: 2, poste: 'Slim — PS3', jeu: 'Tekken 8', montant: '800 Ar', statut: 'warn' },
  { id: 3, poste: 'Slim 2 — PS3', jeu: 'FIFA 25', montant: '400 Ar', statut: 'ok' },
]

const chartDemo = [
  { nom: 'aluka', montant: 900 },
  { nom: 'centre', montant: 2400 },
  { nom: 'nord', montant: 1500 },
  { nom: 'sud', montant: 600 },
]
</script>

<style scoped>
.swatches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}
.swatch {
  display: flex;
  align-items: center;
  gap: 10px;
}
.swatch .chip {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: 1px solid var(--line);
  flex-shrink: 0;
}
.swatch-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-1);
}
.swatch-token {
  font-size: 11px;
  color: var(--text-3);
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}
code {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12px;
  color: var(--brand);
}
</style>
