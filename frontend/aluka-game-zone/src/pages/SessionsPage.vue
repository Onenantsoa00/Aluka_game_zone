<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Sessions de jeu"
      subtitle="Démarrer, mettre en pause ou arrêter une session — avec gestion de la coupure d'électricité et du remboursement."
    >
      <template #actions>
        <UiBadge tone="brand" :label="`${activeCount} session(s) en cours`" />
        <UiBadge
          v-if="sessionsAVerifier.length"
          tone="warn"
          :label="`${sessionsAVerifier.length} à vérifier`"
        />
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="bootstrap" />
      </template>
    </UiPageHeader>

    <UiCard
      v-if="sessionsAVerifier.length"
      title="Sessions à vérifier"
      hint="Ces sessions ont été clôturées automatiquement à l'heure de fermeture. Confirmez le temps réellement joué."
      class="q-mb-lg"
    >
      <q-list separator>
        <q-item v-for="s in sessionsAVerifier" :key="s.id">
          <q-item-section>
            <q-item-label>
              #{{ s.id }} · {{ s.nom_poste }} · {{ s.salle_nom }}
            </q-item-label>
            <q-item-label caption>
              Clôturée le {{ formatDateTime(s.heure_fin) }} — durée enregistrée :
              {{ formatMinutes(s.elapsed_minutes) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <UiButton
              variant="ghost"
              icon="check"
              label="Marquer vérifiée"
              @click="verifier(s.id)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </UiCard>

    <UiCard title="Démarrer une session" hint="Seuls les postes libres sont proposés." class="q-mb-lg">
      <div class="row q-col-gutter-md items-start">
        <div class="col-12 col-md-4">
          <q-select
            v-model="form.posteId"
            :options="posteOptions"
            label="Poste"
            outlined
            dense
            emit-value
            map-options
            :disable="!posteOptions.length"
          />
          <div v-if="!posteOptions.length" class="q-mt-xs" style="font-size: 11.5px; color: var(--warn)">
            Aucun poste libre pour le moment.
          </div>
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="form.jeuId"
            :options="jeuOptions"
            label="Jeu (optionnel)"
            outlined
            dense
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-6 col-md-2">
          <q-input
            v-model.number="form.totalMinutesPaid"
            type="number"
            label="Minutes payées"
            outlined
            dense
            suffix="min"
          />
        </div>
        <div class="col-12 col-md-3">
          <UiButton
            icon="play_arrow"
            label="Démarrer la session"
            :loading="starting"
            :disable="!posteOptions.length"
            class="full-width"
            @click="startSession"
          />
        </div>
      </div>
    </UiCard>

    <UiTable
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      :pagination="{ rowsPerPage: 0 }"
      hide-pagination
      empty-icon="play_circle"
      empty-title="Aucune session"
      empty-text="Démarrez une session depuis un poste libre du tableau de bord."
    >
      <template #body-cell-poste="props">
        <q-td>
          <div>{{ props.row.nom_poste }}</div>
          <div style="font-size: 11.5px; color: var(--text-3)">{{ props.row.salle_nom }}</div>
        </q-td>
      </template>
      <template #body-cell-statut="props">
        <q-td>
          <UiBadge :tone="statutTone(props.row.statut)" :label="statutLabel(props.row.statut)" />
          <UiBadge v-if="props.row.a_verifier" tone="warn" label="À vérifier" class="q-ml-xs" />
        </q-td>
      </template>
      <template #body-cell-temps="props">
        <q-td>
          <span
            class="num"
            :style="props.row.depassement ? { color: 'var(--danger)' } : null"
            :title="`Payé : ${formatMinutes(props.row.duree_payee_minutes)}`"
          >
            {{ formatMinutes(props.row.elapsed_minutes) }}
          </span>
          <q-icon
            v-if="props.row.depassement"
            name="notification_important"
            size="14px"
            style="color: var(--danger)"
          />
        </q-td>
      </template>
      <template #body-cell-paye="props">
        <q-td>
          <span class="num" style="color: var(--text-3)">
            {{ formatMinutes(props.row.duree_payee_minutes) }}
          </span>
        </q-td>
      </template>
      <template #body-cell-montant_total="props">
        <q-td>
          <span class="num">{{ formatAriary(props.row.montant_total) }}</span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td>
          <div class="row-tight" style="justify-content: center">
            <UiButton
              v-if="props.row.statut === 'en_cours'"
              variant="icon"
              icon="pause"
              tooltip="Mettre en pause"
              @click="pause(props.row.id)"
            />
            <UiButton
              v-if="props.row.statut === 'pause'"
              variant="icon"
              icon="play_arrow"
              tooltip="Reprendre"
              @click="resume(props.row.id)"
            />
            <template v-if="isActive(props.row)">
              <UiButton
                variant="icon"
                icon="more_time"
                tooltip="Prolonger la session"
                @click="openProlongation(props.row)"
              />
              <UiButton
                variant="icon"
                icon="savings"
                tooltip="Encaisser un paiement complémentaire"
                @click="openPaiement(props.row)"
              />
              <UiButton
                variant="icon"
                icon="stop"
                tooltip="Terminer la session"
                @click="stop(props.row.id, false)"
              />
              <UiButton
                variant="icon"
                icon="power_off"
                tooltip="Arrêt sur coupure d'électricité"
                @click="stop(props.row.id, true)"
              />
            </template>
          </div>
        </q-td>
      </template>
    </UiTable>

    <div class="row items-center q-mt-md">
      <span style="font-size: 12.5px; color: var(--text-3)">
        {{ total }} session(s) · page {{ page }} / {{ pageCount }}
      </span>
      <span class="spacer" />
      <UiButton
        variant="ghost"
        icon="chevron_left"
        label="Précédent"
        :disable="page <= 1"
        @click="goToPage(page - 1)"
      />
      <UiButton
        variant="ghost"
        icon="chevron_right"
        label="Suivant"
        :disable="page >= pageCount"
        @click="goToPage(page + 1)"
      />
    </div>

    <UiModal
      v-model="showProlongation"
      title="Prolonger la session"
      subtitle="Le montant est encaissé immédiatement selon le tarif du poste."
    >
      <q-input
        v-model.number="prolongation.minutes"
        type="number"
        label="Minutes supplémentaires"
        outlined
        dense
        suffix="min"
      />
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showProlongation = false" />
        <UiButton
          icon="more_time"
          label="Prolonger"
          :loading="saving"
          @click="submitProlongation"
        />
      </template>
    </UiModal>

    <UiModal
      v-model="showPaiement"
      title="Paiement complémentaire"
      subtitle="Encaissement partiel ajouté au montant de la session."
    >
      <q-input
        v-model.number="paiement.montant"
        type="number"
        label="Montant encaissé"
        outlined
        dense
        suffix="Ar"
      />
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showPaiement = false" />
        <UiButton icon="savings" label="Encaisser" :loading="saving" @click="submitPaiement" />
      </template>
    </UiModal>
  </q-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { api } from 'src/services/api'
import { getRealtimeSocket } from 'src/services/realtime'
import { useAuthStore } from 'src/stores/auth-store'
import { formatAriary, formatMinutes } from 'src/utils/mappers'
import { UiBadge, UiButton, UiCard, UiModal, UiPageHeader, UiTable } from 'src/components/ui'

const auth = useAuthStore()

const rows = ref([])
const postes = ref([])
const jeux = ref([])
const sessionsAVerifier = ref([])
const loading = ref(false)
const starting = ref(false)
const saving = ref(false)
const page = ref(1)
const pageSize = 25
const total = ref(0)
const activeTotal = ref(0)
const form = ref({ posteId: null, jeuId: null, totalMinutesPaid: 10 })
const showProlongation = ref(false)
const showPaiement = ref(false)
const prolongation = ref({ sessionId: null, minutes: 10 })
const paiement = ref({ sessionId: null, montant: 0 })

let socket = null
let refreshTimer = null
const notified = new Set()

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const busySessionIds = computed(() =>
  new Set(
    rows.value
      .filter((row) => ['en_cours', 'pause'].includes(row.statut))
      .map((row) => row.poste_id),
  ),
)

const posteOptions = computed(() =>
  postes.value
    .filter(
      (p) =>
        p.statut === 'libre' &&
        p.actif !== false &&
        p.disponible !== false &&
        !busySessionIds.value.has(p.id),
    )
    .map((p) => ({ label: `${p.nom_poste} — ${p.console_nom}`, value: p.id })),
)
const jeuOptions = computed(() => jeux.value.map((j) => ({ label: j.nom, value: j.id })))
const activeCount = computed(() => activeTotal.value)

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'poste', label: 'Poste', field: 'nom_poste', align: 'left' },
  { name: 'jeu', label: 'Jeu', field: 'jeu_nom', align: 'left' },
  { name: 'statut', label: 'Statut', field: 'statut', align: 'left' },
  { name: 'temps', label: 'Temps joué', field: 'elapsed_minutes', align: 'right' },
  { name: 'paye', label: 'Temps payé', field: 'duree_payee_minutes', align: 'right' },
  {
    name: 'montant_total',
    label: 'Montant',
    field: 'montant_total',
    align: 'right',
  },
  {
    name: 'montant_a_rendre',
    label: 'À rendre',
    field: 'montant_a_rendre',
    align: 'right',
    format: (v) => formatAriary(v),
  },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const statutTone = (statut) =>
  ({ en_cours: 'brand', pause: 'warn', terminee: 'ok', annulee: 'danger' })[statut] || 'neutral'
const statutLabel = (statut) =>
  ({ en_cours: 'En cours', pause: 'En pause', terminee: 'Terminée', annulee: 'Annulée' })[
    statut
  ] || statut

const isActive = (row) => ['en_cours', 'pause'].includes(row.statut)

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function refresh() {
  loading.value = true
  try {
    const [sessionsRes, countRes, enCoursRes, pauseRes, postesRes, jeuxRes, aVerifierRes] =
      await Promise.all([
        api.get(`/sessions?limit=${pageSize}&offset=${(page.value - 1) * pageSize}`),
        api.get('/sessions/count'),
        api.get('/sessions/count?statut=en_cours'),
        api.get('/sessions/count?statut=pause'),
        api.get('/postes'),
        api.get('/jeux'),
        api.get('/sessions/a-verifier'),
      ])
    rows.value = Array.isArray(sessionsRes) ? sessionsRes : []
    total.value = Number(countRes?.total) || rows.value.length
    activeTotal.value = (Number(enCoursRes?.total) || 0) + (Number(pauseRes?.total) || 0)
    postes.value = Array.isArray(postesRes) ? postesRes : []
    jeux.value = Array.isArray(jeuxRes) ? jeuxRes : []
    sessionsAVerifier.value = Array.isArray(aVerifierRes) ? aVerifierRes : []
    notifyOvertime()
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message || 'Chargement impossible' })
  } finally {
    loading.value = false
  }
}

/** Alerte une seule fois par session quand le temps paye est dépassé (P1.8). */
function notifyOvertime() {
  for (const row of rows.value) {
    if (row.depassement && !notified.has(row.id)) {
      notified.add(row.id)
      Notify.create({
        type: 'warning',
        icon: 'notification_important',
        message: `Session #${row.id} (${row.nom_poste}) : temps payé dépassé`,
        timeout: 8000,
      })
    }
    if (!row.depassement) notified.delete(row.id)
  }
}

function scheduleRefresh() {
  if (refreshTimer) return
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    refresh()
  }, 500)
}

function bootstrap() {
  return refresh()
}

function goToPage(target) {
  page.value = Math.min(Math.max(1, target), pageCount.value)
  refresh()
}

async function startSession() {
  if (!form.value.posteId) {
    Notify.create({ type: 'warning', message: 'Sélectionnez un poste libre' })
    return
  }
  starting.value = true
  try {
    await api.post('/sessions/start', form.value)
    form.value = { posteId: null, jeuId: null, totalMinutesPaid: 10 }
    await refresh()
    Notify.create({ type: 'positive', message: 'Session démarrée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
    await refresh()
  } finally {
    starting.value = false
  }
}

async function pause(id) {
  try {
    await api.post(`/sessions/${id}/pause`, {})
    await refresh()
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

async function resume(id) {
  try {
    await api.post(`/sessions/${id}/resume`, {})
    await refresh()
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

function stop(id, coupureElectricite) {
  const msg = coupureElectricite
    ? 'Arrêter avec coupure électricité ? Le remboursement du temps non consommé sera calculé.'
    : 'Terminer cette session ?'
  Dialog.create({ title: 'Confirmation', message: msg, cancel: true, persistent: true }).onOk(
    async () => {
      try {
        const result = await api.post(`/sessions/${id}/stop`, { coupureElectricite })
        await refresh()
        if (coupureElectricite && Number(result?.montant_a_rendre) > 0) {
          Notify.create({
            type: 'info',
            message: `À rendre au client : ${formatAriary(result.montant_a_rendre)}`,
          })
        } else {
          Notify.create({ type: 'positive', message: 'Session terminée' })
        }
      } catch (error) {
        Notify.create({ type: 'negative', message: error.message })
        await refresh()
      }
    },
  )
}

function openProlongation(row) {
  prolongation.value = { sessionId: row.id, minutes: 10 }
  showProlongation.value = true
}

async function submitProlongation() {
  saving.value = true
  try {
    const result = await api.post(`/sessions/${prolongation.value.sessionId}/prolongation`, {
      minutes: prolongation.value.minutes,
    })
    showProlongation.value = false
    await refresh()
    Notify.create({
      type: 'positive',
      message: `Session prolongée — ${formatAriary(result.montant_ajoute)} encaissés`,
    })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

function openPaiement(row) {
  paiement.value = { sessionId: row.id, montant: 0 }
  showPaiement.value = true
}

async function submitPaiement() {
  saving.value = true
  try {
    await api.post(`/sessions/${paiement.value.sessionId}/paiements`, {
      montant: paiement.value.montant,
    })
    showPaiement.value = false
    await refresh()
    Notify.create({ type: 'positive', message: 'Paiement enregistré' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

async function verifier(id) {
  try {
    await api.patch(`/sessions/${id}/verifier`, {})
    await refresh()
    Notify.create({ type: 'positive', message: 'Session vérifiée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

onMounted(async () => {
  await refresh()
  socket = getRealtimeSocket(auth.token)
  if (socket) {
    socket.on('session:changed', scheduleRefresh)
    socket.on('postes:changed', scheduleRefresh)
    socket.on('sessions:refresh', scheduleRefresh)
  }
})

onUnmounted(() => {
  if (socket) {
    socket.off('session:changed', scheduleRefresh)
    socket.off('postes:changed', scheduleRefresh)
    socket.off('sessions:refresh', scheduleRefresh)
  }
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>
