<template>
  <q-page class="app-page">
    <div class="page-header">
      <div class="title">Jeux & Tarifications</div>
      <div class="subtitle">Catalogue de jeux et prix par console (ex: PS3 — 10 min → 400 Ar)</div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <div class="dc-card dc-form">
          <div class="text-subtitle2 q-mb-md" style="color: var(--dc-text)">Nouveau jeu</div>
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-5">
              <q-input v-model="jeuForm.nom" label="Nom du jeu" outlined dense />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="jeuForm.genre" label="Genre" outlined dense />
            </div>
            <div class="col-12 col-md-3">
              <q-btn class="btn-dc-primary full-width" label="Ajouter" @click="addJeu" />
            </div>
          </div>
        </div>
        <q-table class="dc-table dc-card" flat :rows="jeux" :columns="jeuColumns" row-key="id" />
      </div>

      <div class="col-12 col-md-6">
        <div class="dc-card dc-form">
          <div class="text-subtitle2 q-mb-md" style="color: var(--dc-text)">Nouvelle tarification</div>
          <div class="row q-col-gutter-sm items-end">
            <div class="col-12 col-md-4">
              <q-select
                v-model="tarifForm.consoleId"
                :options="consoleOptions"
                label="Console"
                outlined
                dense
                emit-value
                map-options
                @update:model-value="loadTarifs"
              />
            </div>
            <div class="col-12 col-md-3">
              <q-input v-model.number="tarifForm.dureeMinutes" type="number" label="Durée (min)" outlined dense />
            </div>
            <div class="col-12 col-md-3">
              <q-input v-model.number="tarifForm.prix" type="number" label="Prix (Ar)" outlined dense />
            </div>
            <div class="col-12 col-md-2">
              <q-btn class="btn-dc-primary full-width" label="OK" @click="addTarif" />
            </div>
          </div>
        </div>
        <q-table class="dc-table dc-card" flat :rows="tarifs" :columns="tarifColumns" row-key="id" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/services/api'
import { formatAriary } from 'src/utils/mappers'

const $q = useQuasar()
const jeux = ref([])
const consoles = ref([])
const tarifs = ref([])
const jeuForm = ref({ nom: '', genre: '' })
const tarifForm = ref({ consoleId: null, dureeMinutes: 10, prix: 400 })

const consoleOptions = computed(() =>
  consoles.value.map((c) => ({ label: c.nom, value: c.id })),
)

const jeuColumns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'nom', label: 'Jeu', field: 'nom' },
  { name: 'genre', label: 'Genre', field: 'genre' },
]

const tarifColumns = [
  { name: 'duree_minutes', label: 'Durée', field: 'duree_minutes', format: (v) => `${v} min` },
  { name: 'prix', label: 'Prix', field: 'prix', format: (v) => formatAriary(v) },
]

async function loadTarifs() {
  if (!tarifForm.value.consoleId) {
    tarifs.value = []
    return
  }
  tarifs.value = await api.get(`/jeux/tarifications/${tarifForm.value.consoleId}`)
}

async function addJeu() {
  try {
    await api.post('/jeux', jeuForm.value)
    jeuForm.value = { nom: '', genre: '' }
    jeux.value = await api.get('/jeux')
    $q.notify({ type: 'positive', message: 'Jeu ajouté' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

async function addTarif() {
  try {
    await api.post('/jeux/tarifications', tarifForm.value)
    await loadTarifs()
    $q.notify({ type: 'positive', message: 'Tarification ajoutée' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

onMounted(async () => {
  const [j, c] = await Promise.all([api.get('/jeux'), api.get('/consoles')])
  jeux.value = j || []
  consoles.value = c || []
  if (consoles.value.length) {
    tarifForm.value.consoleId = consoles.value[0].id
    await loadTarifs()
  }
})
</script>
