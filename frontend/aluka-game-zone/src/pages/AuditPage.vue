<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Journal d'audit"
      subtitle="Traçabilité des actions sensibles : sessions, comptes, tarifs, réservations et exports."
    >
      <template #actions>
        <UiBadge tone="neutral" :label="`${rows.length} entrée(s)`" />
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="refresh" />
      </template>
    </UiPageHeader>

    <UiCard class="q-mb-lg">
      <div class="row q-col-gutter-sm items-end">
        <div class="col-12 col-sm-4">
          <q-input v-model="filter" label="Filtrer (action, utilisateur, entité)" outlined dense clearable />
        </div>
        <div class="col-12 col-sm-3">
          <q-select
            v-model="action"
            :options="actionOptions"
            label="Action"
            outlined
            dense
            emit-value
            map-options
            clearable
          />
        </div>
      </div>
    </UiCard>

    <UiTable
      :rows="filtered"
      :columns="columns"
      row-key="id"
      :loading="loading"
      :pagination="{ rowsPerPage: 25 }"
      empty-icon="history"
      empty-title="Aucune entrée"
      empty-text="Les actions d'administration apparaîtront ici."
    >
      <template #body-cell-created_at="props">
        <q-td>{{ formatDateTime(props.row.created_at) }}</q-td>
      </template>
      <template #body-cell-acteur="props">
        <q-td>{{ props.row.utilisateur_nom || props.row.username || '—' }}</q-td>
      </template>
      <template #body-cell-details="props">
        <q-td>
          <span style="font-size: 11.5px; color: var(--text-3)">
            {{ formatDetails(props.row.details) }}
          </span>
        </q-td>
      </template>
    </UiTable>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/services/api'
import { UiBadge, UiButton, UiCard, UiPageHeader, UiTable } from 'src/components/ui'

const rows = ref([])
const loading = ref(false)
const filter = ref('')
const action = ref(null)

const actionOptions = [
  'login',
  'logout',
  'session.start',
  'session.stop',
  'session.pause',
  'session.resume',
  'session.extend',
  'session.payment',
  'session.verify',
  'compte.create',
  'compte.update',
  'compte.block',
  'compte.delete',
  'salle.create',
  'salle.update',
  'salle.delete',
  'poste.create',
  'poste.update',
  'poste.delete',
  'jeu.create',
  'jeu.update',
  'jeu.delete',
  'tarif.create',
  'tarif.update',
  'tarif.delete',
  'modele.create',
  'modele.update',
  'modele.delete',
  'reservation.create',
  'reservation.statut',
  'reservation.delete',
  'file.create',
  'file.statut',
  'file.delete',
  'rapport.z.export',
].map((value) => ({ label: value, value }))

const columns = [
  { name: 'created_at', label: 'Date', field: 'created_at', align: 'left' },
  { name: 'acteur', label: 'Utilisateur', field: 'username', align: 'left' },
  { name: 'action', label: 'Action', field: 'action', align: 'left' },
  { name: 'entite', label: 'Entité', field: 'entite', align: 'left' },
  { name: 'entite_id', label: 'ID', field: 'entite_id', align: 'left' },
  { name: 'details', label: 'Détails', field: 'details', align: 'left' },
]

const filtered = computed(() => {
  const term = filter.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    if (action.value && row.action !== action.value) return false
    if (!term) return true
    return [row.action, row.entite, row.username, row.utilisateur_nom, formatDetails(row.details)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
})

function formatDetails(details) {
  if (!details) return ''
  if (typeof details === 'string') return details
  return Object.entries(details)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }).format(
    new Date(value),
  )
}

async function refresh() {
  loading.value = true
  try {
    const query = action.value ? `?limit=300&action=${encodeURIComponent(action.value)}` : '?limit=300'
    const res = await api.get(`/audit${query}`)
    rows.value = Array.isArray(res) ? res : []
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>
