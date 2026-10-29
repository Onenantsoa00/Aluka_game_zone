<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Salles & Postes"
      subtitle="Organisez vos salles et leurs postes de jeu, suivez leur disponibilité en direct."
    >
      <template #actions>
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="refresh" />
      </template>
    </UiPageHeader>

    <div class="ui-grid ui-grid--split q-mb-lg">
      <UiCard title="Nouvelle salle" hint="Une salle regroupe des postes et un stock.">
        <div class="stack" style="--stack-gap: 12px">
          <q-input v-model="salleForm.nom" label="Nom de la salle" outlined dense />
          <q-input v-model="salleForm.adresse" label="Adresse" outlined dense />
          <q-select
            v-if="isAdmin"
            v-model="salleForm.bossId"
            :options="bossOptions"
            label="Boss propriétaire"
            outlined
            dense
            emit-value
            map-options
          />
          <UiButton icon="add_business" label="Créer la salle" :loading="savingSalle" @click="addSalle" />
        </div>
      </UiCard>

      <UiCard title="Nouveau poste" hint="Le tarif appliqué est celui de la console du poste.">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
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
          <div class="col-12 col-sm-6">
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
          <div class="col-12 col-sm-6">
            <q-input v-model="posteForm.nomPoste" label="Nom du poste" outlined dense />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="posteForm.numeroPoste" label="Numéro" outlined dense />
          </div>
          <div class="col-12">
            <UiButton icon="add" label="Ajouter le poste" :loading="savingPoste" @click="addPoste" />
          </div>
        </div>
      </UiCard>
    </div>

    <section class="ui-grid ui-grid--stats q-mb-lg">
      <UiStatCard label="Salles" :value="salles.length" icon="meeting_room" tone="brand" />
      <UiStatCard label="Postes" :value="postes.length" icon="desktop_windows" tone="info" :delay="0.06" />
      <UiStatCard label="Postes occupés" :value="postesOccupe" icon="sports_esports" tone="warn" :delay="0.12" />
      <UiStatCard label="Postes libres" :value="postesLibre" icon="check_circle" tone="ok" :delay="0.18" />
    </section>

    <UiTable
      :rows="salles"
      :columns="salleColumns"
      row-key="id"
      :loading="loading"
      empty-icon="meeting_room"
      empty-title="Aucune salle"
      empty-text="Créez une salle avant d'ajouter des postes."
      class="q-mb-lg"
    >
      <template #body-cell-actions="props">
        <q-td>
          <div class="row-tight" style="justify-content: center">
            <UiButton variant="icon" icon="edit" tooltip="Modifier la salle" @click="openSalleEdit(props.row)" />
            <UiButton variant="icon" icon="delete" tooltip="Supprimer la salle" @click="removeSalle(props.row)" />
          </div>
        </q-td>
      </template>
    </UiTable>

    <UiTable
      :rows="postes"
      :columns="posteColumns"
      row-key="id"
      :loading="loading"
      empty-icon="desktop_windows"
      empty-title="Aucun poste"
      empty-text="Créez une salle puis ajoutez-y des postes pour commencer."
    >
      <template #body-cell-statut="props">
        <q-td>
          <UiBadge
            :tone="props.row.statut === 'libre' ? 'ok' : 'warn'"
            :label="props.row.statut === 'libre' ? 'Disponible' : 'Occupé'"
          />
        </q-td>
      </template>
      <template #body-cell-actif="props">
        <q-td>
          <UiBadge
            :tone="props.row.actif === false ? 'danger' : 'neutral'"
            :label="props.row.actif === false ? 'Désactivé' : 'Actif'"
          />
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td>
          <div class="row-tight" style="justify-content: center">
            <UiButton variant="icon" icon="edit" tooltip="Modifier le poste" @click="openPosteEdit(props.row)" />
            <UiButton variant="icon" icon="delete" tooltip="Supprimer le poste" @click="removePoste(props.row)" />
          </div>
        </q-td>
      </template>
    </UiTable>

    <UiModal v-model="showSalleModal" title="Modifier la salle">
      <div class="stack" style="--stack-gap: 12px">
        <q-input v-model="salleEdit.nom" label="Nom" outlined dense />
        <q-input v-model="salleEdit.adresse" label="Adresse" outlined dense />
        <q-toggle v-model="salleEdit.actif" label="Salle active" />
      </div>
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showSalleModal = false" />
        <UiButton label="Enregistrer" :loading="savingSalle" @click="saveSalle" />
      </template>
    </UiModal>

    <UiModal v-model="showPosteModal" title="Modifier le poste">
      <div class="stack" style="--stack-gap: 12px">
        <q-input v-model="posteEdit.nomPoste" label="Nom du poste" outlined dense />
        <q-input v-model="posteEdit.numeroPoste" label="Numéro" outlined dense />
        <q-select
          v-model="posteEdit.consoleId"
          :options="consoleOptions"
          label="Console"
          outlined
          dense
          emit-value
          map-options
        />
        <q-toggle v-model="posteEdit.actif" label="Poste actif" />
        <q-toggle v-model="posteEdit.disponible" label="Disponible à la réservation" />
      </div>
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showPosteModal = false" />
        <UiButton label="Enregistrer" :loading="savingPoste" @click="savePoste" />
      </template>
    </UiModal>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { api } from 'src/services/api'
import { useAuthStore } from 'src/stores/auth-store'
import { UiBadge, UiButton, UiCard, UiModal, UiPageHeader, UiStatCard, UiTable } from 'src/components/ui'

const auth = useAuthStore()
const salles = ref([])
const postes = ref([])
const consoles = ref([])
const comptes = ref([])
const loading = ref(false)
const savingSalle = ref(false)
const savingPoste = ref(false)
const salleForm = ref({ nom: '', adresse: '', bossId: null })
const posteForm = ref({ salleId: null, consoleId: null, nomPoste: '', numeroPoste: '' })
const showSalleModal = ref(false)
const showPosteModal = ref(false)
const salleEdit = ref({ id: null, nom: '', adresse: '', actif: true })
const posteEdit = ref({
  id: null,
  nomPoste: '',
  numeroPoste: '',
  consoleId: null,
  actif: true,
  disponible: true,
})

const isAdmin = computed(() => auth.user?.role === 'admin')
const salleOptions = computed(() => salles.value.map((s) => ({ label: s.nom, value: s.id })))
const consoleOptions = computed(() => consoles.value.map((c) => ({ label: c.nom, value: c.id })))
const bossOptions = computed(() =>
  comptes.value.filter((c) => c.role === 'boss').map((c) => ({ label: c.nom, value: c.id })),
)
const postesOccupe = computed(() => postes.value.filter((p) => p.statut === 'occupe').length)
const postesLibre = computed(() => postes.value.filter((p) => p.statut === 'libre').length)

const salleColumns = [
  { name: 'nom', label: 'Salle', field: 'nom', align: 'left' },
  { name: 'adresse', label: 'Adresse', field: 'adresse', align: 'left' },
  { name: 'boss_nom', label: 'Boss', field: 'boss_nom', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const posteColumns = [
  { name: 'nom_poste', label: 'Poste', field: 'nom_poste', align: 'left' },
  { name: 'numero_poste', label: 'N°', field: 'numero_poste', align: 'left' },
  { name: 'salle_nom', label: 'Salle', field: 'salle_nom', align: 'left' },
  { name: 'console_nom', label: 'Console', field: 'console_nom', align: 'left' },
  { name: 'statut', label: 'Statut', field: 'statut', align: 'left' },
  { name: 'actif', label: 'État', field: 'actif', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

async function refresh() {
  loading.value = true
  try {
    const [s, p, c] = await Promise.all([
      api.get('/salles'),
      api.get('/postes'),
      api.get('/consoles'),
    ])
    salles.value = Array.isArray(s) ? s : []
    postes.value = Array.isArray(p) ? p : []
    consoles.value = Array.isArray(c) ? c : []
    if (isAdmin.value) {
      const comptesRes = await api.get('/comptes')
      comptes.value = Array.isArray(comptesRes) ? comptesRes : []
    }
    if (salles.value.length && !posteForm.value.salleId) {
      posteForm.value.salleId = salles.value[0].id
    }
    if (consoles.value.length && !posteForm.value.consoleId) {
      posteForm.value.consoleId = consoles.value[0].id
    }
    if (isAdmin.value && bossOptions.value.length && !salleForm.value.bossId) {
      salleForm.value.bossId = bossOptions.value[0].value
    }
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}

async function addSalle() {
  if (!salleForm.value.nom.trim()) {
    Notify.create({ type: 'warning', message: 'Le nom de la salle est requis' })
    return
  }
  if (isAdmin.value && !salleForm.value.bossId) {
    Notify.create({ type: 'warning', message: 'Sélectionnez un boss propriétaire' })
    return
  }
  savingSalle.value = true
  try {
    await api.post('/salles', salleForm.value)
    salleForm.value = { nom: '', adresse: '', bossId: salleForm.value.bossId }
    await refresh()
    Notify.create({ type: 'positive', message: 'Salle créée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    savingSalle.value = false
  }
}

async function addPoste() {
  if (!posteForm.value.nomPoste.trim() || !posteForm.value.salleId) {
    Notify.create({ type: 'warning', message: 'Salle et nom du poste sont requis' })
    return
  }
  savingPoste.value = true
  try {
    await api.post('/postes', posteForm.value)
    posteForm.value = { ...posteForm.value, nomPoste: '', numeroPoste: '' }
    await refresh()
    Notify.create({ type: 'positive', message: 'Poste ajouté' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    savingPoste.value = false
  }
}

function openSalleEdit(salle) {
  salleEdit.value = {
    id: salle.id,
    nom: salle.nom,
    adresse: salle.adresse || '',
    actif: salle.actif !== false,
  }
  showSalleModal.value = true
}

async function saveSalle() {
  savingSalle.value = true
  try {
    await api.put(`/salles/${salleEdit.value.id}`, {
      nom: salleEdit.value.nom,
      adresse: salleEdit.value.adresse,
      actif: salleEdit.value.actif,
    })
    showSalleModal.value = false
    await refresh()
    Notify.create({ type: 'positive', message: 'Salle mise à jour' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    savingSalle.value = false
  }
}

function removeSalle(salle) {
  Dialog.create({
    title: 'Supprimer la salle',
    message: `Désactiver « ${salle.nom} » ? Les postes et sessions restent en historique.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/salles/${salle.id}`)
      await refresh()
      Notify.create({ type: 'warning', message: 'Salle désactivée' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

function openPosteEdit(poste) {
  posteEdit.value = {
    id: poste.id,
    nomPoste: poste.nom_poste || '',
    numeroPoste: poste.numero_poste || '',
    consoleId: poste.console_id,
    actif: poste.actif !== false,
    disponible: poste.disponible !== false,
  }
  showPosteModal.value = true
}

async function savePoste() {
  savingPoste.value = true
  try {
    await api.put(`/postes/${posteEdit.value.id}`, {
      nomPoste: posteEdit.value.nomPoste,
      numeroPoste: posteEdit.value.numeroPoste,
      consoleId: posteEdit.value.consoleId,
      actif: posteEdit.value.actif,
      disponible: posteEdit.value.disponible,
    })
    showPosteModal.value = false
    await refresh()
    Notify.create({ type: 'positive', message: 'Poste mis à jour' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    savingPoste.value = false
  }
}

function removePoste(poste) {
  Dialog.create({
    title: 'Supprimer le poste',
    message: `Désactiver « ${poste.nom_poste} » ? Impossible si une session est active.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/postes/${poste.id}`)
      await refresh()
      Notify.create({ type: 'warning', message: 'Poste désactivé' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

onMounted(refresh)
</script>
