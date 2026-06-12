<template>
  <q-page class="app-page">
    <div class="page-header">
      <div class="title">Paiements jeton</div>
      <div class="subtitle">
        Modèles de rémunération : fraction, pourcentage, salaire fixe, % après seuil
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <div class="dc-card dc-form">
          <div class="text-subtitle2 q-mb-md" style="color: var(--dc-text)">Nouveau modèle</div>
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-4">
              <q-input v-model="modeleForm.nomModele" label="Nom" outlined dense />
            </div>
            <div class="col-12 col-md-4">
              <q-select
                v-model="modeleForm.typeModele"
                :options="typeOptions"
                label="Type"
                outlined
                dense
                emit-value
                map-options
              />
            </div>
            <div class="col-12 col-md-2">
              <q-input
                v-model.number="modeleForm.valeur"
                type="number"
                label="Valeur"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-md-2">
              <q-input
                v-if="modeleForm.typeModele === 'pourcentage_seuil'"
                v-model.number="modeleForm.seuil"
                type="number"
                label="Seuil (Ar)"
                outlined
                dense
              />
            </div>
          </div>
          <q-btn class="btn-dc-primary q-mt-sm" label="Créer modèle" @click="addModele" />
        </div>

        <q-table
          class="dc-table dc-card"
          flat
          :rows="modeles"
          :columns="modeleColumns"
          row-key="id"
        >
          <template #body-cell-description="props">
            <q-td>{{ describeModele(props.row) }}</q-td>
          </template>
        </q-table>
      </div>

      <div class="col-12 col-md-6">
        <div class="dc-card dc-form">
          <div class="text-subtitle2 q-mb-md" style="color: var(--dc-text)">
            Affecter à un jeton
          </div>
          <div class="row q-col-gutter-sm items-end">
            <div class="col-12 col-md-5">
              <q-select
                v-model="affectForm.jetonId"
                :options="jetonOptions"
                label="Jeton"
                outlined
                dense
                emit-value
                map-options
              />
            </div>
            <div class="col-12 col-md-5">
              <q-select
                v-model="affectForm.modeleId"
                :options="modeleOptions"
                label="Modèle"
                outlined
                dense
                emit-value
                map-options
              />
            </div>
            <div class="col-12 col-md-2">
              <q-btn class="btn-dc-primary full-width" label="OK" @click="addAffectation" />
            </div>
          </div>
        </div>

        <q-table
          class="dc-table dc-card"
          flat
          :rows="affectations"
          :columns="affectColumns"
          row-key="id"
        >
          <template #body-cell-regle="props">
            <q-td>{{ describeModele(props.row) }}</q-td>
          </template>
        </q-table>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/services/api'
import { TYPE_MODELE_OPTIONS, describeModele } from 'src/utils/mappers'

const modeles = ref([])
const affectations = ref([])
const comptes = ref([])
const modeleForm = ref({
  nomModele: '',
  typeModele: 'pourcentage',
  valeur: 20,
  seuil: 50000,
})
const affectForm = ref({ jetonId: null, modeleId: null })

const typeOptions = TYPE_MODELE_OPTIONS

const jetonOptions = computed(() =>
  comptes.value.filter((c) => c.role === 'jeton').map((c) => ({ label: c.nom, value: c.id })),
)
const modeleOptions = computed(() =>
  modeles.value.map((m) => ({ label: m.nom_modele, value: m.id })),
)

const modeleColumns = [
  { name: 'nom_modele', label: 'Modèle', field: 'nom_modele' },
  { name: 'type_modele', label: 'Type', field: 'type_modele' },
  { name: 'description', label: 'Règle', field: 'description' },
]

const affectColumns = [
  { name: 'jeton_nom', label: 'Jeton', field: 'jeton_nom' },
  { name: 'nom_modele', label: 'Modèle', field: 'nom_modele' },
  { name: 'regle', label: 'Règle', field: 'regle' },
  { name: 'date_debut', label: 'Depuis', field: 'date_debut' },
]

async function refresh() {
  const [m, a] = await Promise.all([
    api.get('/paiements/modeles'),
    api.get('/paiements/affectations'),
  ])
  modeles.value = m || []
  affectations.value = a || []
}

async function addModele() {
  try {
    await api.post('/paiements/modeles', modeleForm.value)
    modeleForm.value = { nomModele: '', typeModele: 'pourcentage', valeur: 20, seuil: 50000 }
    await refresh()
    Notify.create({ type: 'positive', message: 'Modèle créé' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

async function addAffectation() {
  try {
    await api.post('/paiements/affectations', affectForm.value)
    await refresh()
    Notify.create({ type: 'positive', message: 'Affectation enregistrée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

onMounted(async () => {
  comptes.value = await api.get('/comptes')
  await refresh()
})
</script>
