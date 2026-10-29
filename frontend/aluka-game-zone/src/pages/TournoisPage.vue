<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Tournois"
      subtitle="Élimination directe : mise, récompense et inscription des participants."
    >
      <template #actions>
        <UiBadge tone="neutral" :label="`${rows.length} tournoi(s)`" />
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="refresh" />
      </template>
    </UiPageHeader>

    <UiCard
      v-if="canManage"
      title="Créer un tournoi"
      hint="La mise est encaissée à l'inscription des joueurs."
      class="q-mb-lg"
    >
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-2">
          <q-select
            v-model="form.salleId"
            :options="salleOptions"
            label="Salle"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="col-12 col-sm-2">
          <q-select
            v-model="form.jeuId"
            :options="jeuOptions"
            label="Jeu"
            outlined
            dense
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input v-model="form.nom" label="Nom du tournoi" outlined dense />
        </div>
        <div class="col-6 col-sm-2">
          <q-input v-model.number="form.mise" type="number" label="Mise" suffix="Ar" outlined dense />
        </div>
        <div class="col-6 col-sm-2">
          <q-input v-model="form.recompense" label="Récompense" outlined dense />
        </div>
        <div class="col-12 col-sm-3">
          <q-input
            v-model="form.dateTournoi"
            type="datetime-local"
            label="Date"
            outlined
            dense
            stack-label
          />
        </div>
        <div class="col-12 col-sm-2">
          <UiButton
            icon="emoji_events"
            label="Créer"
            :loading="saving"
            class="full-width"
            @click="createTournoi"
          />
        </div>
      </div>
    </UiCard>

    <UiTable
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      empty-icon="emoji_events"
      empty-title="Aucun tournoi"
      empty-text="Créez un tournoi puis inscrivez les joueurs depuis la colonne Participants."
    >
      <template #body-cell-mise="props">
        <q-td>
          <span class="num">{{ formatAriary(props.row.mise) }}</span>
        </q-td>
      </template>
      <template #body-cell-date_tournoi="props">
        <q-td>{{ formatDate(props.row.date_tournoi) }}</q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td>
          <UiButton
            variant="ghost"
            size="sm"
            icon="person_add"
            label="Inscrire"
            @click="addParticipant(props.row)"
          />
        </q-td>
      </template>
    </UiTable>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { api } from 'src/services/api'
import { useAuthStore } from 'src/stores/auth-store'
import { formatAriary } from 'src/utils/mappers'
import { UiBadge, UiButton, UiCard, UiPageHeader, UiTable } from 'src/components/ui'

const auth = useAuthStore()
const rows = ref([])
const salles = ref([])
const jeux = ref([])
const loading = ref(false)
const saving = ref(false)
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
  { name: 'nom', label: 'Tournoi', field: 'nom', align: 'left' },
  { name: 'mise', label: 'Mise', field: 'mise', align: 'right' },
  { name: 'recompense', label: 'Récompense', field: 'recompense', align: 'left' },
  { name: 'date_tournoi', label: 'Date', field: 'date_tournoi', align: 'left' },
  { name: 'actions', label: 'Participants', field: 'actions', align: 'right' },
]

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function refresh() {
  loading.value = true
  try {
    const [t, s, j] = await Promise.all([
      api.get('/tournois'),
      api.get('/salles'),
      api.get('/jeux'),
    ])
    rows.value = Array.isArray(t) ? t : []
    salles.value = Array.isArray(s) ? s : []
    jeux.value = Array.isArray(j) ? j : []
    if (salles.value.length && !form.value.salleId) form.value.salleId = salles.value[0].id
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}

async function createTournoi() {
  if (!form.value.nom.trim() || !form.value.salleId) {
    Notify.create({ type: 'warning', message: 'Nom et salle sont requis' })
    return
  }
  saving.value = true
  try {
    await api.post('/tournois', form.value)
    form.value = { ...form.value, nom: '', mise: 0, recompense: '' }
    await refresh()
    Notify.create({ type: 'positive', message: 'Tournoi créé' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

function addParticipant(tournoi) {
  Dialog.create({
    title: `Inscrire un joueur — ${tournoi.nom}`,
    message: `Mise : ${formatAriary(tournoi.mise)}`,
    prompt: { model: '', label: 'Nom du joueur' },
    cancel: true,
    persistent: true,
  }).onOk(async (nom) => {
    if (!nom?.trim()) {
      Notify.create({ type: 'warning', message: 'Nom du joueur requis' })
      return
    }
    try {
      await api.post(`/tournois/${tournoi.id}/participants`, { nomJoueur: nom })
      Notify.create({ type: 'positive', message: 'Participant inscrit' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

onMounted(refresh)
</script>
