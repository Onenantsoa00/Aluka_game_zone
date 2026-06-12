<template>
  <q-page class="app-page">
    <div class="page-header">
      <div class="title">Tournois — élimination directe</div>
      <div class="subtitle">Mise, récompense et inscription des participants</div>
    </div>

    <div v-if="canManage" class="dc-card dc-form">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-2">
          <q-select v-model="form.salleId" :options="salleOptions" label="Salle" outlined dense emit-value map-options />
        </div>
        <div class="col-12 col-md-2">
          <q-select v-model="form.jeuId" :options="jeuOptions" label="Jeu" outlined dense emit-value map-options clearable />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.nom" label="Nom du tournoi" outlined dense />
        </div>
        <div class="col-12 col-md-1">
          <q-input v-model.number="form.mise" type="number" label="Mise (Ar)" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.recompense" label="Trophée / récompense" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.dateTournoi" type="datetime-local" label="Date" outlined dense />
        </div>
        <div class="col-12 col-md-1">
          <q-btn class="btn-dc-primary" label="Créer" @click="createTournoi" />
        </div>
      </div>
    </div>

    <q-table class="dc-table dc-card" flat :rows="rows" :columns="columns" row-key="id">
      <template #body-cell-actions="props">
        <q-td>
          <q-btn dense flat icon="person_add" color="cyan" @click="addParticipant(props.row)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/services/api'
import { useAuthStore } from 'src/stores/auth-store'
import { formatAriary } from 'src/utils/mappers'

const $q = useQuasar()
const auth = useAuthStore()
const rows = ref([])
const salles = ref([])
const jeux = ref([])
const form = ref({
  salleId: null,
  jeuId: null,
  nom: '',
  mise: 0,
  recompense: '',
  dateTournoi: '',
})

const canManage = computed(() => ['admin', 'boss'].includes(auth.user?.role))
const salleOptions = computed(() => salles.value.map((s) => ({ label: s.nom, value: s.id })))
const jeuOptions = computed(() => jeux.value.map((j) => ({ label: j.nom, value: j.id })))

const columns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'nom', label: 'Nom', field: 'nom' },
  { name: 'mise', label: 'Mise', field: 'mise', format: (v) => formatAriary(v) },
  { name: 'recompense', label: 'Récompense', field: 'recompense' },
  { name: 'date_tournoi', label: 'Date', field: 'date_tournoi' },
  { name: 'actions', label: 'Participants', field: 'actions' },
]

async function refresh() {
  rows.value = await api.get('/tournois')
}

async function createTournoi() {
  try {
    await api.post('/tournois', form.value)
    form.value = { ...form.value, nom: '', mise: 0, recompense: '' }
    await refresh()
    $q.notify({ type: 'positive', message: 'Tournoi créé' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

function addParticipant(tournoi) {
  $q.dialog({
    title: `Inscrire un joueur — ${tournoi.nom}`,
    prompt: { model: '', label: 'Nom du joueur' },
    cancel: true,
  }).onOk(async (nom) => {
    await api.post(`/tournois/${tournoi.id}/participants`, { nomJoueur: nom })
    $q.notify({ type: 'positive', message: 'Participant inscrit' })
  })
}

onMounted(async () => {
  const [s, j] = await Promise.all([api.get('/salles'), api.get('/jeux')])
  salles.value = s || []
  jeux.value = j || []
  if (salles.value.length) form.value.salleId = salles.value[0].id
  await refresh()
})
</script>
