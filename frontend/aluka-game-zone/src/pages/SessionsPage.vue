<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Sessions de jeu</div>
    <q-card class="modern-card q-mb-md">
      <q-card-section class="row q-col-gutter-sm">
        <div class="col-12 col-md-3">
          <q-input dense v-model.number="form.posteId" type="number" label="Poste ID" />
        </div>
        <div class="col-12 col-md-3">
          <q-input dense v-model.number="form.jeuId" type="number" label="Jeu ID (optionnel)" />
        </div>
        <div class="col-12 col-md-3">
          <q-input
            dense
            v-model.number="form.totalMinutesPaid"
            type="number"
            label="Minutes payees"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-btn class="bg-primary" label="Demarrer session" @click="startSession" />
        </div>
      </q-card-section>
    </q-card>

    <q-table dense :rows="rows" :columns="columns" row-key="id">
      <template #body-cell-actions="props">
        <q-td>
          <q-btn dense flat icon="pause" @click="pause(props.row.id)" />
          <q-btn dense flat icon="play_arrow" @click="resume(props.row.id)" />
          <q-btn dense flat icon="stop" color="negative" @click="stop(props.row.id, false)" />
          <q-btn dense flat icon="power_off" color="warning" @click="stop(props.row.id, true)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/services/api'

const $q = useQuasar()
const rows = ref([])
const form = ref({ posteId: null, jeuId: null, totalMinutesPaid: 10 })
const columns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'poste', label: 'Poste', field: 'nom_poste' },
  { name: 'jeu', label: 'Jeu', field: 'jeu_nom' },
  { name: 'statut', label: 'Statut', field: 'statut' },
  { name: 'montant_total', label: 'Montant', field: 'montant_total' },
  { name: 'montant_a_rendre', label: 'A rendre', field: 'montant_a_rendre' },
  { name: 'actions', label: 'Actions', field: 'actions' },
]

async function refresh() {
  rows.value = await api.get('/sessions')
}

async function startSession() {
  try {
    await api.post('/sessions/start', form.value)
    await refresh()
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
  await api.post(`/sessions/${id}/stop`, { coupureElectricite })
  await refresh()
}

onMounted(async () => {
  try {
    await refresh()
  } catch (err) {
    console.error('Sessions load failed', err)
    $q.notify({ type: 'negative', message: err.message || 'Impossible de charger les sessions' })
  }
})
</script>
