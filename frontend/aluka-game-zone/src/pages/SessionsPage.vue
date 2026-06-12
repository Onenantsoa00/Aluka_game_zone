<template>
  <q-page class="app-page">
    <div class="page-header">
      <div class="title">Sessions de jeu</div>
      <div class="subtitle">Démarrer, mettre en pause ou arrêter une session — coupure électricité avec remboursement</div>
    </div>

    <div class="dc-card dc-form">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-3">
          <q-select
            v-model="form.posteId"
            :options="posteOptions"
            label="Poste"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="form.jeuId"
            :options="jeuOptions"
            label="Jeu (optionnel)"
            outlined
            dense
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-12 col-md-2">
          <q-input
            v-model.number="form.totalMinutesPaid"
            type="number"
            label="Minutes payées"
            outlined
            dense
          />
        </div>
        <div class="col-12 col-md-4">
          <q-btn class="btn-dc-primary" label="Démarrer session" icon="play_arrow" @click="startSession" />
        </div>
      </div>
    </div>

    <q-table
      class="dc-table dc-card"
      flat
      :rows="rows"
      :columns="columns"
      row-key="id"
      :pagination="{ rowsPerPage: 15 }"
    >
      <template #body-cell-statut="props">
        <q-td>
          <span :class="statusClass(props.row.statut)">{{ props.row.statut }}</span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td>
          <q-btn
            v-if="props.row.statut === 'en_cours'"
            dense
            flat
            icon="pause"
            color="cyan"
            @click="pause(props.row.id)"
          />
          <q-btn
            v-if="props.row.statut === 'pause'"
            dense
            flat
            icon="play_arrow"
            color="positive"
            @click="resume(props.row.id)"
          />
          <q-btn
            v-if="['en_cours', 'pause'].includes(props.row.statut)"
            dense
            flat
            icon="stop"
            color="negative"
            @click="stop(props.row.id, false)"
          />
          <q-btn
            v-if="['en_cours', 'pause'].includes(props.row.statut)"
            dense
            flat
            icon="power_off"
            color="warning"
            title="Coupure électricité"
            @click="stop(props.row.id, true)"
          />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/services/api'
import { formatAriary } from 'src/utils/mappers'

const $q = useQuasar()
const rows = ref([])
const postes = ref([])
const jeux = ref([])
const form = ref({ posteId: null, jeuId: null, totalMinutesPaid: 10 })

const posteOptions = computed(() =>
  postes.value.map((p) => ({
    label: `${p.nom_poste} — ${p.console_nom} (${p.statut})`,
    value: p.id,
  })),
)
const jeuOptions = computed(() => jeux.value.map((j) => ({ label: j.nom, value: j.id })))

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'poste', label: 'Poste', field: 'nom_poste', align: 'left' },
  { name: 'jeu', label: 'Jeu', field: 'jeu_nom', align: 'left' },
  { name: 'statut', label: 'Statut', field: 'statut', align: 'left' },
  {
    name: 'montant_total',
    label: 'Montant',
    field: 'montant_total',
    align: 'right',
    format: (v) => formatAriary(v),
  },
  {
    name: 'montant_a_rendre',
    label: 'À rendre',
    field: 'montant_a_rendre',
    align: 'right',
    format: (v) => formatAriary(v),
  },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

function statusClass(statut) {
  if (statut === 'en_cours') return 'badge-ok'
  if (statut === 'pause') return 'badge-low-stock'
  return ''
}

async function refresh() {
  rows.value = await api.get('/sessions')
}

async function startSession() {
  try {
    await api.post('/sessions/start', form.value)
    await refresh()
    $q.notify({ type: 'positive', message: 'Session démarrée' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

async function pause(id) {
  await api.post(`/sessions/${id}/pause`, {})
  await refresh()
}
async function resume(id) {
  await api.post(`/sessions/${id}/resume`, {})
  await refresh()
}
async function stop(id, coupureElectricite) {
  const msg = coupureElectricite
    ? 'Arrêter avec coupure électricité (remboursement proportionnel) ?'
    : 'Terminer cette session ?'
  $q.dialog({
    title: 'Confirmation',
    message: msg,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const result = await api.post(`/sessions/${id}/stop`, { coupureElectricite })
    await refresh()
    if (coupureElectricite && result.montant_a_rendre > 0) {
      $q.notify({
        type: 'info',
        message: `À rendre au client : ${formatAriary(result.montant_a_rendre)}`,
      })
    }
  })
}

onMounted(async () => {
  try {
    const [p, j] = await Promise.all([api.get('/postes'), api.get('/jeux')])
    postes.value = p || []
    jeux.value = j || []
    await refresh()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message || 'Impossible de charger les sessions' })
  }
})
</script>
