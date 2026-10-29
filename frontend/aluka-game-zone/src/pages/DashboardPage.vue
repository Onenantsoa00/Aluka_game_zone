<template>
  <q-page class="dashboard-root">
    <main class="main">
      <UiPageHeader
        eyebrow="Vue temps réel"
        title="Tableau de bord"
        subtitle="Recettes, occupation des postes et activité des salles en direct."
      >
        <template #actions>
          <UiButton
            variant="ghost"
            icon="refresh"
            label="Actualiser"
            :loading="refreshing"
            @click="manualRefresh"
          />
          <UiButton icon="add" label="Nouvelle session" @click="openSessionDialog()" />
        </template>
      </UiPageHeader>

      <q-banner
        v-if="dashboard?.sessionsAVerifierCount"
        dense
        rounded
        class="q-mb-md"
        style="background: var(--warn-soft); color: var(--text-1)"
      >
        <template #avatar>
          <q-icon name="fact_check" style="color: var(--warn)" />
        </template>
        {{ dashboard.sessionsAVerifierCount }} session(s) clôturée(s) automatiquement à l'heure de
        fermeture — le temps réellement joué doit être confirmé.
        <template #action>
          <UiButton variant="ghost" label="Vérifier" to="/sessions" />
        </template>
      </q-banner>

      <section class="ui-grid ui-grid--stats" style="margin-bottom: 20px">
        <UiStatCard
          label="Recette du jour"
          icon="today"
          :value="soldes.jour"
          money
          hint="Net du jour, remboursements déduits"
          tone="brand"
        />
        <UiStatCard
          label="Recette du mois"
          icon="calendar_month"
          :value="soldes.mois"
          money
          hint="Net du mois en cours"
          tone="info"
          :delay="0.06"
        />
        <UiStatCard
          label="Recette annuelle"
          icon="trending_up"
          :value="soldes.annee"
          money
          hint="Net cumulé de l'année"
          tone="ok"
          :delay="0.12"
        />
        <UiStatCard
          label="Postes en session"
          icon="sports_esports"
          :value="occupancy.occupied"
          :suffix="`/ ${occupancy.total}`"
          hint="Occupation actuelle"
          tone="warn"
          :delay="0.18"
        />
      </section>

      <RevenueChart :data="chartData" class="q-mb-md" />

      <div class="row items-center q-mb-sm">
        <div class="eyebrow">Postes en salle</div>
        <span class="spacer" />
        <UiBadge tone="neutral" :label="`${postes.length} poste(s)`" />
      </div>

      <GameGrid :postes="postes" :loading="loading" @select="onPosteSelect" />
    </main>

    <RightPanel :occupancy="occupancy" :top-postes="topPostes" :top-jeux="topJeux" />

    <UiModal
      v-model="showSessionDialog"
      title="Nouvelle session"
      subtitle="Le montant est encaissé d'avance sur la base du tarif de la console."
    >
      <div class="stack" style="--stack-gap: 14px">
        <q-select
          v-model="sessionForm.posteId"
          :options="posteOptions"
          label="Poste"
          outlined
          dense
          emit-value
          map-options
          :rules="[(v) => !!v || 'Sélectionnez un poste']"
        />
        <q-select
          v-model="sessionForm.jeuId"
          :options="jeuOptions"
          label="Jeu (optionnel)"
          outlined
          dense
          emit-value
          map-options
          clearable
        />
        <q-input
          v-model.number="sessionForm.totalMinutesPaid"
          type="number"
          label="Minutes payées"
          outlined
          dense
          suffix="min"
          :rules="[(v) => (v > 0 && v <= 1440) || 'Entre 1 et 1440 minutes']"
        />
        <div v-if="!posteOptions.length" class="muted" style="font-size: 12.5px">
          Aucun poste libre : terminez ou libérez une session avant d'en démarrer une nouvelle.
        </div>
      </div>

      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showSessionDialog = false" />
        <UiButton
          icon="play_arrow"
          label="Démarrer"
          :loading="starting"
          :disable="!posteOptions.length"
          @click="startSession"
        />
      </template>
    </UiModal>
  </q-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Notify } from 'quasar'
import { useRouter } from 'vue-router'
import { useUiStore } from 'src/stores/ui-store'
import { useAuthStore } from 'src/stores/auth-store'
import { getRealtimeSocket } from 'src/services/realtime'
import GameGrid from 'src/components/Dashboard/GameGrid.vue'
import RightPanel from 'src/components/Dashboard/RightPanel.vue'
import RevenueChart from 'src/components/Dashboard/RevenueChart.vue'
import { UiBadge, UiButton, UiModal, UiPageHeader, UiStatCard } from 'src/components/ui'
import { api } from 'src/services/api'
import { mapPosteForCard } from 'src/utils/mappers'

const router = useRouter()
const ui = useUiStore()
const auth = useAuthStore()

const postes = ref([])
const rawPostes = ref([])
const sessions = ref([])
const dashboard = ref(null)
const showSessionDialog = ref(false)
const starting = ref(false)
const loading = ref(true)
const refreshing = ref(false)
const jeux = ref([])
const sessionForm = ref({ posteId: null, jeuId: null, totalMinutesPaid: 10 })

let refreshTimer = null
let tickTimer = null
let socket = null
const overtimesNotified = new Set()

const soldes = computed(() => ({
  jour: Number(dashboard.value?.soldes?.jour) || 0,
  mois: Number(dashboard.value?.soldes?.mois) || 0,
  annee: Number(dashboard.value?.soldes?.annee) || 0,
}))

const occupancy = computed(() => ({
  occupied: postes.value.filter((p) => ['occupied', 'reserved'].includes(p.status)).length,
  total: postes.value.length,
}))

const chartData = computed(() => dashboard.value?.argentParSalle ?? [])
const topPostes = computed(() => (dashboard.value?.postesPlusUtilises ?? []).slice(0, 5))
const topJeux = computed(() => (dashboard.value?.jeuxPlusUtilises ?? []).slice(0, 5))

const posteOptions = computed(() =>
  rawPostes.value
    .filter((p) => p.statut === 'libre' && p.actif !== false && p.disponible !== false)
    .map((p) => ({
      label: `${p.nom_poste} — ${p.console_nom}`,
      value: p.id,
    })),
)

const jeuOptions = computed(() => jeux.value.map((j) => ({ label: j.nom, value: j.id })))

function activeSessionForPoste(posteId) {
  return sessions.value.find(
    (s) => s.poste_id === posteId && ['en_cours', 'pause'].includes(s.statut),
  )
}

function rebuildPostes() {
  postes.value = rawPostes.value.map((p) => mapPosteForCard(p, activeSessionForPoste(p.id)))
}

async function loadAll({ silent = false } = {}) {
  try {
    const [postesRes, sessionsRes, dashRes, jeuxRes] = await Promise.all([
      api.get('/postes'),
      api.get('/sessions'),
      api.get('/dashboard'),
      api.get('/jeux'),
    ])
    rawPostes.value = Array.isArray(postesRes) ? postesRes : []
    sessions.value = (Array.isArray(sessionsRes) ? sessionsRes : []).filter((s) =>
      ['en_cours', 'pause'].includes(s.statut),
    )
    dashboard.value = dashRes || null
    jeux.value = Array.isArray(jeuxRes) ? jeuxRes : []
    rebuildPostes()
    notifyOvertime()
  } catch (error) {
    if (!silent) Notify.create({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}

async function manualRefresh() {
  refreshing.value = true
  await loadAll({ silent: true })
  refreshing.value = false
}

async function startSession() {
  if (!sessionForm.value.posteId) {
    Notify.create({ type: 'warning', message: 'Sélectionnez un poste' })
    return
  }
  if (!(sessionForm.value.totalMinutesPaid > 0)) {
    Notify.create({ type: 'warning', message: 'Indiquez une durée payée supérieure à 0' })
    return
  }
  starting.value = true
  try {
    await api.post('/sessions/start', sessionForm.value)
    showSessionDialog.value = false
    sessionForm.value = { posteId: null, jeuId: null, totalMinutesPaid: 10 }
    await loadAll({ silent: true })
    Notify.create({ type: 'positive', message: 'Session démarrée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    starting.value = false
  }
}

/** Alerte locale quand une session depasse le temps paye (P1.8). */
function notifyOvertime() {
  for (const session of sessions.value) {
    if (session.depassement && !overtimesNotified.has(session.id)) {
      overtimesNotified.add(session.id)
      Notify.create({
        type: 'warning',
        icon: 'notification_important',
        message: `Session #${session.id} (${session.nom_poste}) : temps payé dépassé`,
        timeout: 8000,
      })
    }
    if (!session.depassement) overtimesNotified.delete(session.id)
  }
}

function openSessionDialog() {
  sessionForm.value = { posteId: null, jeuId: null, totalMinutesPaid: 10 }
  showSessionDialog.value = true
}

function onPosteSelect(poste) {
  if (poste.sessionId) {
    router.push('/sessions')
  } else if (poste.status === 'available') {
    sessionForm.value.posteId = poste.id
    showSessionDialog.value = true
  }
}

watch(
  () => ui.requestNewSession,
  (val) => {
    if (val) {
      openSessionDialog()
      ui.clearNewSessionRequest()
    }
  },
  { immediate: true },
)

function onRealtimeChange() {
  loadAll({ silent: true })
}

onMounted(async () => {
  await loadAll()
  refreshTimer = setInterval(() => loadAll({ silent: true }), 30000)
  tickTimer = setInterval(rebuildPostes, 1000)

  socket = getRealtimeSocket(auth.token)
  if (socket) {
    socket.on('session:changed', onRealtimeChange)
    socket.on('postes:changed', onRealtimeChange)
    socket.on('sessions:refresh', onRealtimeChange)
  }
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (tickTimer) clearInterval(tickTimer)
  if (socket) {
    socket.off('session:changed', onRealtimeChange)
    socket.off('postes:changed', onRealtimeChange)
    socket.off('sessions:refresh', onRealtimeChange)
  }
})
</script>
