<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Tournois"
      subtitle="Élimination directe : inscriptions, tableau généré automatiquement, scores et champion."
    >
      <template #actions>
        <UiBadge tone="neutral" :label="`${rows.length} tournoi(s)`" />
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="refresh" />
      </template>
    </UiPageHeader>

    <UiCard
      v-if="canManage"
      title="Créer un tournoi"
      hint="Les inscriptions s’ouvrent immédiatement. Le tableau est généré au démarrage."
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
      :pagination="{ rowsPerPage: 12 }"
      empty-icon="emoji_events"
      empty-title="Aucun tournoi"
      empty-text="Créez un tournoi, inscrivez les joueurs puis lancez le tableau."
    >
      <template #body-cell-nom="props">
        <q-td>
          <button type="button" class="tournoi-link" @click="open(props.row)">
            <span class="tournoi-icon"><q-icon name="emoji_events" size="15px" /></span>
            <span>
              <strong>{{ props.row.nom }}</strong>
              <small>
                {{ props.row.salle_nom }}<template v-if="props.row.jeu_nom"> · {{ props.row.jeu_nom }}</template>
              </small>
            </span>
          </button>
        </q-td>
      </template>
      <template #body-cell-statut="props">
        <q-td>
          <UiBadge :tone="statutTone(props.row.statut)" :label="statutLabel(props.row.statut)" />
        </q-td>
      </template>
      <template #body-cell-participants="props">
        <q-td>
          <span class="num">{{ props.row.participants_count }}</span>
          <span class="cell-sub"> joueur(s)</span>
        </q-td>
      </template>
      <template #body-cell-date_tournoi="props">
        <q-td>{{ formatDate(props.row.date_tournoi) }}</q-td>
      </template>
      <template #body-cell-mise="props">
        <q-td><span class="num">{{ formatAriary(props.row.mise) }}</span></q-td>
      </template>
      <template #body-cell-champion="props">
        <q-td>
          <span v-if="props.row.champion_nom" class="champion">
            <q-icon name="military_tech" size="15px" />
            {{ props.row.champion_nom }}
          </span>
          <span v-else class="cell-sub">—</span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td>
          <UiButton
            variant="ghost"
            size="sm"
            icon="account_tree"
            label="Tableau"
            @click="open(props.row)"
          />
        </q-td>
      </template>
    </UiTable>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from 'src/services/api'
import { useAuthStore } from 'src/stores/auth-store'
import { formatAriary } from 'src/utils/mappers'
import { UiBadge, UiButton, UiCard, UiPageHeader, UiTable } from 'src/components/ui'

const auth = useAuthStore()
const router = useRouter()
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
  { name: 'statut', label: 'Statut', field: 'statut', align: 'left' },
  { name: 'participants', label: 'Inscrits', field: 'participants_count', align: 'left' },
  { name: 'date_tournoi', label: 'Date', field: 'date_tournoi', align: 'left' },
  { name: 'mise', label: 'Mise', field: 'mise', align: 'right' },
  { name: 'champion', label: 'Champion', field: 'champion_nom', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const statutLabel = (statut) =>
  ({ inscriptions: 'Inscriptions', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' })[
    statut
  ] || statut
const statutTone = (statut) =>
  ({ inscriptions: 'info', en_cours: 'brand', termine: 'ok', annule: 'danger' })[statut] ||
  'neutral'

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

/** `silent` : rechargement apres une action, sans overlay de chargement. */
async function refresh({ silent = false } = {}) {
  if (!silent) loading.value = true
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
    if (!silent) loading.value = false
  }
}

async function createTournoi() {
  if (!form.value.nom.trim() || !form.value.salleId) {
    Notify.create({ type: 'warning', message: 'Nom et salle sont requis' })
    return
  }
  saving.value = true
  try {
    const detail = await api.post('/tournois', form.value)
    form.value = { ...form.value, nom: '', mise: 0, recompense: '' }
    Notify.create({ type: 'positive', message: 'Tournoi créé — inscrivez les joueurs' })
    if (detail?.tournoi?.id) router.push(`/tournois/${detail.tournoi.id}`)
    else await refresh({ silent: true })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

function open(row) {
  router.push(`/tournois/${row.id}`)
}

onMounted(refresh)
</script>

<style scoped>
.cell-sub {
  font-size: 11px;
  color: var(--text-3);
}
.tournoi-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.tournoi-link strong {
  display: block;
  font-weight: 600;
  color: var(--text-1);
}
.tournoi-link small {
  display: block;
  font-size: 11px;
  color: var(--text-3);
}
.tournoi-link:hover strong {
  color: var(--brand);
}
.tournoi-icon {
  flex: none;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--brand);
  background: var(--brand-soft);
}
.champion {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--warn);
  font-weight: 600;
  font-size: 12.5px;
}
</style>
