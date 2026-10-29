<template>
  <q-page class="app-page">
    <UiPageHeader
      title="File d'attente & réservations"
      subtitle="Gérez les joueurs qui attendent un poste et les créneaux réservés à l'avance."
    >
      <template #actions>
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="refresh" />
      </template>
    </UiPageHeader>

    <div class="ui-grid ui-grid--split q-mb-lg">
      <UiCard title="Ajouter à la file d'attente" hint="Le joueur est appelé dès qu'un poste se libère.">
        <div class="row q-col-gutter-sm items-end">
          <div class="col-12 col-sm-6">
            <q-input v-model="fileForm.nomJoueur" label="Nom du joueur" outlined dense />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="fileForm.telephone" label="Téléphone" outlined dense />
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="fileForm.salleId"
              :options="salleOptions"
              label="Salle"
              outlined
              dense
              emit-value
              map-options
              clearable
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="fileForm.jeuId"
              :options="jeuOptions"
              label="Jeu souhaité"
              outlined
              dense
              emit-value
              map-options
              clearable
            />
          </div>
          <div class="col-12">
            <UiButton icon="queue" label="Ajouter à la file" :loading="saving" @click="addFile" />
          </div>
        </div>
      </UiCard>

      <UiCard title="Réserver un poste" hint="Un poste ne peut pas être réservé deux fois sur le même créneau.">
        <div class="row q-col-gutter-sm items-end">
          <div class="col-12 col-sm-6">
            <q-input v-model="resForm.nomJoueur" label="Nom du joueur" outlined dense />
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="resForm.posteId"
              :options="posteOptions"
              label="Poste"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="resForm.debut" type="datetime-local" label="Début" outlined stack-label dense />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="resForm.fin" type="datetime-local" label="Fin (optionnel)" outlined stack-label dense />
          </div>
          <div class="col-6 col-sm-4">
            <q-input v-model.number="resForm.montant" type="number" label="Acompte" suffix="Ar" outlined dense />
          </div>
          <div class="col-6 col-sm-8">
            <UiButton icon="event_available" label="Réserver" :loading="saving" @click="addReservation" />
          </div>
        </div>
      </UiCard>
    </div>

    <UiCard title="File d'attente" :hint="`${file.length} joueur(s)`" class="q-mb-lg">
      <UiTable
        :rows="file"
        :columns="fileColumns"
        row-key="id"
        :loading="loading"
        empty-icon="queue"
        empty-title="File vide"
        empty-text="Aucun joueur en attente."
      >
        <template #body-cell-statut="props">
          <q-td><UiBadge :tone="fileTone(props.row.statut)" :label="fileLabel(props.row.statut)" /></q-td>
        </template>
        <template #body-cell-created_at="props">
          <q-td>{{ formatDateTime(props.row.created_at) }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td>
            <div class="row-tight" style="justify-content: center">
              <UiButton
                v-if="props.row.statut === 'en_attente'"
                variant="icon"
                icon="campaign"
                tooltip="Appeler le joueur"
                @click="setFileStatut(props.row.id, 'appele')"
              />
              <UiButton
                v-if="['en_attente', 'appele'].includes(props.row.statut)"
                variant="icon"
                icon="chair"
                tooltip="Installer sur un poste"
                @click="setFileStatut(props.row.id, 'installe')"
              />
              <UiButton
                v-if="!['annule', 'installe'].includes(props.row.statut)"
                variant="icon"
                icon="close"
                tooltip="Annuler"
                @click="setFileStatut(props.row.id, 'annule')"
              />
              <UiButton variant="icon" icon="delete" tooltip="Supprimer" @click="removeFile(props.row)" />
            </div>
          </q-td>
        </template>
      </UiTable>
    </UiCard>

    <UiCard title="Réservations" hint="Créneaux à venir et historique récent.">
      <UiTable
        :rows="reservations"
        :columns="reservationColumns"
        row-key="id"
        :loading="loading"
        empty-icon="event"
        empty-title="Aucune réservation"
        empty-text="Réservez un poste pour un joueur."
      >
        <template #body-cell-debut="props">
          <q-td>{{ formatDateTime(props.row.debut) }}</q-td>
        </template>
        <template #body-cell-fin="props">
          <q-td>{{ props.row.fin ? formatDateTime(props.row.fin) : '—' }}</q-td>
        </template>
        <template #body-cell-statut="props">
          <q-td>
            <UiBadge :tone="reservationTone(props.row.statut)" :label="reservationLabel(props.row.statut)" />
          </q-td>
        </template>
        <template #body-cell-montant="props">
          <q-td><span class="num">{{ formatAriary(props.row.montant) }}</span></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td>
            <div class="row-tight" style="justify-content: center">
              <UiButton
                v-if="props.row.statut === 'reservee'"
                variant="icon"
                icon="check"
                tooltip="Marquer honorée"
                @click="setReservationStatut(props.row.id, 'honoree')"
              />
              <UiButton
                v-if="props.row.statut === 'reservee'"
                variant="icon"
                icon="close"
                tooltip="Annuler la réservation"
                @click="setReservationStatut(props.row.id, 'annulee')"
              />
              <UiButton variant="icon" icon="delete" tooltip="Supprimer" @click="removeReservation(props.row)" />
            </div>
          </q-td>
        </template>
      </UiTable>
    </UiCard>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/services/api'
import { formatAriary } from 'src/utils/mappers'
import { UiBadge, UiButton, UiCard, UiPageHeader, UiTable } from 'src/components/ui'

const file = ref([])
const reservations = ref([])
const postes = ref([])
const salles = ref([])
const jeux = ref([])
const loading = ref(false)
const saving = ref(false)

const nowPlusHour = () => {
  const d = new Date(Date.now() + 3600_000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fileForm = ref({ salleId: null, jeuId: null, nomJoueur: '', telephone: '' })
const resForm = ref({
  posteId: null,
  nomJoueur: '',
  debut: nowPlusHour(),
  fin: '',
  montant: 0,
})

const salleOptions = computed(() => salles.value.map((s) => ({ label: s.nom, value: s.id })))
const jeuOptions = computed(() => jeux.value.map((j) => ({ label: j.nom, value: j.id })))
const posteOptions = computed(() =>
  postes.value
    .filter((p) => p.actif !== false)
    .map((p) => ({ label: `${p.nom_poste} — ${p.salle_nom}`, value: p.id })),
)

const fileColumns = [
  { name: 'nom_joueur', label: 'Joueur', field: 'nom_joueur', align: 'left' },
  { name: 'telephone', label: 'Téléphone', field: 'telephone', align: 'left' },
  { name: 'salle_nom', label: 'Salle', field: 'salle_nom', align: 'left' },
  { name: 'jeu_nom', label: 'Jeu', field: 'jeu_nom', align: 'left' },
  { name: 'statut', label: 'Statut', field: 'statut', align: 'left' },
  { name: 'created_at', label: 'Arrivée', field: 'created_at', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const reservationColumns = [
  { name: 'nom_joueur', label: 'Joueur', field: 'nom_joueur', align: 'left' },
  { name: 'nom_poste', label: 'Poste', field: 'nom_poste', align: 'left' },
  { name: 'salle_nom', label: 'Salle', field: 'salle_nom', align: 'left' },
  { name: 'debut', label: 'Début', field: 'debut', align: 'left' },
  { name: 'fin', label: 'Fin', field: 'fin', align: 'left' },
  { name: 'montant', label: 'Acompte', field: 'montant', align: 'right' },
  { name: 'statut', label: 'Statut', field: 'statut', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  )
}

const fileLabel = (statut) =>
  ({ en_attente: 'En attente', appele: 'Appelé', installe: 'Installé', annule: 'Annulé' })[statut] ||
  statut
const fileTone = (statut) =>
  ({ en_attente: 'warn', appele: 'info', installe: 'ok', annule: 'neutral' })[statut] || 'neutral'
const reservationLabel = (statut) =>
  ({ reservee: 'Réservée', honoree: 'Honorée', annulee: 'Annulée', expiree: 'Expirée' })[statut] ||
  statut
const reservationTone = (statut) =>
  ({ reservee: 'info', honoree: 'ok', annulee: 'danger', expiree: 'neutral' })[statut] || 'neutral'

async function refresh() {
  loading.value = true
  try {
    const [f, r, p, s, j] = await Promise.all([
      api.get('/file-attente'),
      api.get('/reservations'),
      api.get('/postes'),
      api.get('/salles'),
      api.get('/jeux'),
    ])
    file.value = Array.isArray(f) ? f : []
    reservations.value = Array.isArray(r) ? r : []
    postes.value = Array.isArray(p) ? p : []
    salles.value = Array.isArray(s) ? s : []
    jeux.value = Array.isArray(j) ? j : []
    if (posteOptions.value.length && !resForm.value.posteId) {
      resForm.value.posteId = posteOptions.value[0].value
    }
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}

async function addFile() {
  if (!fileForm.value.nomJoueur?.trim()) {
    Notify.create({ type: 'warning', message: 'Le nom du joueur est requis' })
    return
  }
  if (!fileForm.value.salleId) {
    Notify.create({ type: 'warning', message: 'Choisissez une salle' })
    return
  }
  saving.value = true
  try {
    await api.post('/file-attente', fileForm.value)
    fileForm.value = { salleId: null, jeuId: null, nomJoueur: '', telephone: '' }
    await refresh()
    Notify.create({ type: 'positive', message: 'Joueur ajouté à la file' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

async function setFileStatut(id, statut) {
  try {
    await api.patch(`/file-attente/${id}/statut`, { statut })
    await refresh()
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

async function removeFile(row) {
  try {
    await api.delete(`/file-attente/${row.id}`)
    await refresh()
    Notify.create({ type: 'warning', message: 'Entrée supprimée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

async function addReservation() {
  if (!resForm.value.posteId || !resForm.value.nomJoueur?.trim() || !resForm.value.debut) {
    Notify.create({ type: 'warning', message: 'Poste, joueur et début sont requis' })
    return
  }
  saving.value = true
  try {
    await api.post('/reservations', resForm.value)
    resForm.value = {
      posteId: resForm.value.posteId,
      nomJoueur: '',
      debut: nowPlusHour(),
      fin: '',
      montant: 0,
    }
    await refresh()
    Notify.create({ type: 'positive', message: 'Réservation enregistrée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

async function setReservationStatut(id, statut) {
  try {
    await api.patch(`/reservations/${id}/statut`, { statut })
    await refresh()
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

async function removeReservation(row) {
  try {
    await api.delete(`/reservations/${row.id}`)
    await refresh()
    Notify.create({ type: 'warning', message: 'Réservation supprimée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

onMounted(refresh)
</script>
