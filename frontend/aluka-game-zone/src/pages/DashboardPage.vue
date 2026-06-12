<template>
  <q-page class="dashboard-root">
    <main class="main">
      <RevenueChart :data="chartData" class="q-mb-md" />

      <section>
        <div class="muted q-mb-sm">Postes en salle — {{ postes.length }} poste(s)</div>
        <GameGrid :postes="postes" @select="onPosteSelect" />
      </section>
    </main>

    <RightPanel :stats="soldes" :top-postes="topPostes" :top-jeux="topJeux" />

    <q-dialog v-model="showSessionDialog" persistent>
      <q-card class="dc-card" style="min-width: 360px">
        <q-card-section>
          <div class="text-h6" style="color: var(--dc-text)">Nouvelle session</div>
        </q-card-section>
        <q-card-section class="dc-form q-gutter-md">
          <q-select
            v-model="sessionForm.posteId"
            :options="posteOptions"
            label="Poste"
            outlined
            dense
            emit-value
            map-options
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
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            class="btn-dc-primary"
            label="Démarrer"
            :loading="starting"
            @click="startSession"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Notify } from 'quasar'
import { useRouter } from 'vue-router'
import { useUiStore } from 'src/stores/ui-store'
import GameGrid from 'src/components/Dashboard/GameGrid.vue'
import RightPanel from 'src/components/Dashboard/RightPanel.vue'
import RevenueChart from 'src/components/Dashboard/RevenueChart.vue'
import { api } from 'src/services/api'
import { mapPosteForCard } from 'src/utils/mappers'

const router = useRouter()

const ui = useUiStore()

watch(
  () => ui.requestNewSession,
  (val) => {
    if (val) {
      showSessionDialog.value = true
      ui.clearNewSessionRequest()
    }
  },
)

const postes = ref([])
const rawPostes = ref([])
const sessions = ref([])
const dashboard = ref(null)
const showSessionDialog = ref(false)
const starting = ref(false)
const jeux = ref([])
const sessionForm = ref({ posteId: null, jeuId: null, totalMinutesPaid: 10 })
let refreshTimer = null

const soldes = computed(() => ({
  jour: dashboard.value?.soldes?.jour ?? 0,
  mois: dashboard.value?.soldes?.mois ?? 0,
  annee: dashboard.value?.soldes?.annee ?? 0,
  postesActifs: dashboard.value?.postesActifs ?? 0,
}))

const chartData = computed(() => dashboard.value?.argentParSalle ?? [])
const topPostes = computed(() => dashboard.value?.postesPlusUtilises ?? [])
const topJeux = computed(() => dashboard.value?.jeuxPlusUtilises ?? [])

const posteOptions = computed(() =>
  rawPostes.value
    .filter((p) => p.statut === 'libre' && p.actif !== false)
    .map((p) => ({
      label: `${p.nom_poste} (${p.console_nom})`,
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

async function loadAll() {
  const [postesRes, sessionsRes, dashRes, jeuxRes] = await Promise.all([
    api.get('/postes'),
    api.get('/sessions'),
    api.get('/dashboard'),
    api.get('/jeux'),
  ])
  rawPostes.value = postesRes || []
  sessions.value = (sessionsRes || []).filter((s) => ['en_cours', 'pause'].includes(s.statut))
  dashboard.value = dashRes
  jeux.value = jeuxRes || []
  rebuildPostes()
}

async function startSession() {
  if (!sessionForm.value.posteId) {
    Notify.create({ type: 'warning', message: 'Sélectionnez un poste' })
    return
  }
  starting.value = true
  try {
    await api.post('/sessions/start', sessionForm.value)
    showSessionDialog.value = false
    sessionForm.value = { posteId: null, jeuId: null, totalMinutesPaid: 10 }
    await loadAll()
    Notify.create({ type: 'positive', message: 'Session démarrée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    starting.value = false
  }
}

function onPosteSelect(poste) {
  if (poste.sessionId) {
    router.push('/sessions')
  } else if (poste.status === 'available') {
    sessionForm.value.posteId = poste.id
    showSessionDialog.value = true
  }
}

onMounted(async () => {
  try {
    await loadAll()
    refreshTimer = setInterval(loadAll, 30000)
  } catch (e) {
    console.error(e)
    Notify.create({ type: 'negative', message: 'Impossible de charger le tableau de bord' })
  }
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.muted {
  color: var(--dc-text-muted);
}
.dashboard-root {
  min-height: 100vh;
}
</style>
