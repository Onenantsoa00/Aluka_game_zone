<template>
  <q-page class="app-page">
    <div class="page-header">
      <div class="title">Salles & Postes</div>
      <div class="subtitle">Gestion des salles de jeux et de leurs postes (disponible / occupé)</div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-6">
        <div class="dc-card dc-form">
          <div class="text-subtitle2 q-mb-md" style="color: var(--dc-text)">Nouvelle salle</div>
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-5">
              <q-input v-model="salleForm.nom" label="Nom de la salle" outlined dense />
            </div>
            <div class="col-12 col-md-5">
              <q-input v-model="salleForm.adresse" label="Adresse" outlined dense />
            </div>
            <div class="col-12 col-md-2">
              <q-btn class="btn-dc-primary full-width" label="Créer" @click="addSalle" />
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-6">
        <div class="dc-card dc-form">
          <div class="text-subtitle2 q-mb-md" style="color: var(--dc-text)">Nouveau poste</div>
          <div class="row q-col-gutter-sm items-end">
            <div class="col-12 col-md-3">
              <q-select
                v-model="posteForm.salleId"
                :options="salleOptions"
                label="Salle"
                outlined
                dense
                emit-value
                map-options
              />
            </div>
            <div class="col-12 col-md-3">
              <q-select
                v-model="posteForm.consoleId"
                :options="consoleOptions"
                label="Console"
                outlined
                dense
                emit-value
                map-options
              />
            </div>
            <div class="col-12 col-md-2">
              <q-input v-model="posteForm.nomPoste" label="Nom" outlined dense />
            </div>
            <div class="col-12 col-md-2">
              <q-input v-model="posteForm.numeroPoste" label="N°" outlined dense />
            </div>
            <div class="col-12 col-md-2">
              <q-btn class="btn-dc-primary full-width" label="Ajouter" @click="addPoste" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-box">
        <div class="label">Salles actives</div>
        <div class="value">{{ salles.length }}</div>
      </div>
      <div class="stat-box">
        <div class="label">Postes total</div>
        <div class="value">{{ postes.length }}</div>
      </div>
      <div class="stat-box">
        <div class="label">Postes occupés</div>
        <div class="value">{{ postesOccupe }}</div>
      </div>
      <div class="stat-box">
        <div class="label">Postes libres</div>
        <div class="value">{{ postesLibre }}</div>
      </div>
    </div>

    <q-table class="dc-table dc-card" flat :rows="postes" :columns="posteColumns" row-key="id">
      <template #body-cell-statut="props">
        <q-td>
          <span :class="props.row.statut === 'libre' ? 'badge-ok' : 'badge-low-stock'">
            {{ props.row.statut === 'libre' ? 'Disponible' : 'Occupé' }}
          </span>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/services/api'

const $q = useQuasar()
const salles = ref([])
const postes = ref([])
const consoles = ref([])
const salleForm = ref({ nom: '', adresse: '' })
const posteForm = ref({ salleId: null, consoleId: null, nomPoste: '', numeroPoste: '' })

const salleOptions = computed(() => salles.value.map((s) => ({ label: s.nom, value: s.id })))
const consoleOptions = computed(() => consoles.value.map((c) => ({ label: c.nom, value: c.id })))
const postesOccupe = computed(() => postes.value.filter((p) => p.statut === 'occupe').length)
const postesLibre = computed(() => postes.value.filter((p) => p.statut === 'libre').length)

const posteColumns = [
  { name: 'nom_poste', label: 'Poste', field: 'nom_poste' },
  { name: 'numero_poste', label: 'N°', field: 'numero_poste' },
  { name: 'salle_nom', label: 'Salle', field: 'salle_nom' },
  { name: 'console_nom', label: 'Console', field: 'console_nom' },
  { name: 'statut', label: 'Statut', field: 'statut' },
]

async function refresh() {
  const [s, p, c] = await Promise.all([
    api.get('/salles'),
    api.get('/postes'),
    api.get('/consoles'),
  ])
  salles.value = s || []
  postes.value = p || []
  consoles.value = c || []
  if (salles.value.length && !posteForm.value.salleId) {
    posteForm.value.salleId = salles.value[0].id
  }
  if (consoles.value.length && !posteForm.value.consoleId) {
    posteForm.value.consoleId = consoles.value[0].id
  }
}

async function addSalle() {
  try {
    await api.post('/salles', salleForm.value)
    salleForm.value = { nom: '', adresse: '' }
    await refresh()
    $q.notify({ type: 'positive', message: 'Salle créée' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

async function addPoste() {
  try {
    await api.post('/postes', posteForm.value)
    posteForm.value = { ...posteForm.value, nomPoste: '', numeroPoste: '' }
    await refresh()
    $q.notify({ type: 'positive', message: 'Poste ajouté' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

onMounted(refresh)
</script>
