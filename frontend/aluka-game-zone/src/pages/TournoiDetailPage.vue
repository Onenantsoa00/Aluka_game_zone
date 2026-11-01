<template>
  <q-page class="app-page">
    <UiPageHeader
      :eyebrow="detail.tournoi ? `${detail.tournoi.salle_nom} · Élimination directe` : 'Tournoi'"
      :title="detail.tournoi?.nom || 'Tableau du tournoi'"
      :subtitle="subtitle"
    >
      <template #actions>
        <UiButton variant="ghost" icon="arrow_back" label="Tournois" to="/tournois" />
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="load" />
        <UiButton
          v-if="detail.tournoi && canManage && isInscriptions"
          icon="play_arrow"
          label="Démarrer le tournoi"
          :disable="detail.participants.length < 2"
          :loading="saving"
          @click="demarrer"
        />
        <UiButton
          v-if="detail.tournoi && canManage && !isInscriptions"
          variant="ghost"
          icon="restart_alt"
          label="Réinitialiser"
          :loading="saving"
          @click="reinitialiser"
        />
      </template>
    </UiPageHeader>

    <div v-if="detail.tournoi" class="tournoi-meta q-mb-lg">
      <span class="meta-item">
        <q-icon name="event" size="15px" />{{ formatDate(detail.tournoi.date_tournoi) }}
      </span>
      <span class="meta-item">
        <q-icon name="gamepad" size="15px" />{{ detail.tournoi.jeu_nom || 'Jeu libre' }}
      </span>
      <span class="meta-item">
        <q-icon name="payments" size="15px" />Mise {{ formatAriary(detail.tournoi.mise) }}
      </span>
      <span class="meta-item">
        <q-icon name="military_tech" size="15px" />{{ detail.tournoi.recompense || 'Récompense à définir' }}
      </span>
      <UiBadge :tone="statutTone" :label="statutLabel" />
      <span class="spacer" />
      <span class="meta-item">
        <q-icon name="groups" size="15px" />{{ detail.participants.length }} inscrit(s)
      </span>
    </div>

    <motion.section
      v-if="champion"
      class="champion-banner"
      :initial="{ opacity: 0, scale: 0.97 }"
      :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }"
    >
      <div class="champion-trophy">
        <q-icon name="emoji_events" size="30px" />
      </div>
      <div>
        <div class="champion-eyebrow">CHAMPION DU TOURNOI</div>
        <div class="champion-name">{{ champion }}</div>
        <div class="champion-sub">
          {{ detail.tournoi.nom }} · {{ detail.participants.length }} joueurs · élimination directe
        </div>
      </div>
      <span class="spacer" />
      <UiBadge v-if="detail.tournoi.finished_at" tone="ok" :label="formatDate(detail.tournoi.finished_at)" />
    </motion.section>

    <div class="tournoi-layout">
      <section class="stack tournoi-side">
        <UiCard
          title="Joueurs inscrits"
          :hint="isInscriptions ? 'Inscriptions ouvertes — ajoutez les joueurs.' : 'Inscriptions closes.'"
        >
          <template v-if="canManage && isInscriptions" #actions>
            <UiButton size="sm" icon="person_add" label="Inscrire" @click="openAdd" />
          </template>

          <ul v-if="detail.participants.length" class="player-list">
            <li
              v-for="player in detail.participants"
              :key="player.id"
              :class="{ eliminated: player.elimine, champion: player.id === detail.tournoi?.champion_id }"
            >
              <span class="seed">{{ player.seed || '—' }}</span>
              <span class="player-name">{{ player.nom_joueur }}</span>
              <span v-if="player.id === detail.tournoi?.champion_id" class="player-flag is-gold">
                <q-icon name="military_tech" size="14px" />
              </span>
              <span v-else-if="player.elimine" class="player-flag">Éliminé</span>
              <span v-else-if="!isInscriptions" class="player-flag is-ok">En lice</span>
              <UiButton
                v-if="canManage && isInscriptions"
                variant="icon"
                icon="person_remove"
                tooltip="Retirer ce joueur"
                @click="retirer(player)"
              />
            </li>
          </ul>
          <div v-else class="empty-players">
            <q-icon name="groups" size="26px" />
            <p>Aucun joueur inscrit.</p>
            <UiButton
              v-if="canManage && isInscriptions"
              size="sm"
              icon="person_add"
              label="Inscrire le premier"
              @click="openAdd"
            />
          </div>

          <div v-if="isInscriptions" class="bracket-note">
            <q-icon name="account_tree" size="15px" />
            Le tableau sera généré au démarrage (exempts automatiques si le nombre de joueurs
            n’est pas une puissance de 2).
          </div>
        </UiCard>

        <UiCard v-if="isInscriptions" title="Format" hint="Règles appliquées par le moteur.">
          <ul class="rules">
            <li><q-icon name="check" size="14px" /> Élimination directe, un seul vainqueur par match.</li>
            <li><q-icon name="check" size="14px" /> Aucun match nul : un score différent est requis.</li>
            <li><q-icon name="check" size="14px" /> Le vainqueur monte automatiquement au tour suivant.</li>
            <li><q-icon name="check" size="14px" /> 2 à 64 joueurs, exempts gérés automatiquement.</li>
          </ul>
        </UiCard>
      </section>

      <section class="tournoi-bracket-wrap">
        <div v-if="!detail.matchs.length" class="bracket-empty">
          <q-icon name="account_tree" size="34px" />
          <h3>Le tableau n’est pas encore généré</h3>
          <p>
            Inscrivez au moins 2 joueurs puis cliquez sur « Démarrer le tournoi ». Les rencontres,
            exempts et tours seront créés automatiquement.
          </p>
          <UiButton
            v-if="canManage && detail.tournoi"
            icon="play_arrow"
            label="Démarrer le tournoi"
            :disable="detail.participants.length < 2"
            :loading="saving"
            @click="demarrer"
          />
        </div>

        <div v-else class="bracket-scroll">
          <div class="bracket">
            <div v-for="round in rounds" :key="round.tour" class="bracket-round">
              <div class="bracket-round__head">
                <span>{{ round.label }}</span>
                <small>{{ round.matchs.length }} match(s)</small>
              </div>
              <div class="bracket-round__body">
                <article
                  v-for="match in round.matchs"
                  :key="match.id"
                  class="bracket-match"
                  :class="{
                    'is-done': match.statut === 'termine',
                    'is-bye': match.statut === 'bye',
                    'is-live': isPlayable(match),
                  }"
                >
                  <div
                    class="bracket-player"
                    :class="{ 'is-winner': match.gagnant_id === match.participant1_id }"
                  >
                    <span class="bracket-seed">{{ seedOf(match.participant1_id) }}</span>
                    <span class="bracket-name">{{ match.joueur1 || 'En attente' }}</span>
                    <span v-if="match.statut === 'termine'" class="bracket-score">
                      {{ match.score1 }}
                    </span>
                  </div>
                  <div
                    v-if="match.statut !== 'bye' || match.participant2_id"
                    class="bracket-player"
                    :class="{ 'is-winner': match.gagnant_id === match.participant2_id }"
                  >
                    <span class="bracket-seed">{{ seedOf(match.participant2_id) }}</span>
                    <span class="bracket-name">{{ match.joueur2 || 'En attente' }}</span>
                    <span v-if="match.statut === 'termine'" class="bracket-score">
                      {{ match.score2 }}
                    </span>
                  </div>

                  <div v-if="match.statut === 'bye'" class="bracket-bye">
                    Exempt — qualifié au tour suivant
                  </div>
                  <form
                    v-else-if="isPlayable(match)"
                    class="bracket-entry"
                    @submit.prevent="valider(match)"
                  >
                    <q-input
                      v-model.number="scores[match.id].score1"
                      type="number"
                      min="0"
                      dense
                      outlined
                      :aria-label="`Score ${match.joueur1 || 'joueur 1'}`"
                    />
                    <span class="bracket-vs">:</span>
                    <q-input
                      v-model.number="scores[match.id].score2"
                      type="number"
                      min="0"
                      dense
                      outlined
                      :aria-label="`Score ${match.joueur2 || 'joueur 2'}`"
                    />
                    <UiButton
                      type="submit"
                      variant="ghost"
                      size="sm"
                      icon="check"
                      tooltip="Valider le résultat"
                    />
                  </form>
                  <div v-else-if="match.gagnant_nom" class="bracket-bye is-winner">
                    <q-icon name="check_circle" size="13px" /> {{ match.gagnant_nom }} qualifié
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <UiModal v-model="showAdd" title="Inscrire un joueur" subtitle="Les inscriptions sont ouvertes.">
      <div class="stack" style="--stack-gap: 12px">
        <q-input v-model="addForm.nomJoueur" label="Nom du joueur" outlined dense autofocus />
        <q-input v-model="addForm.telephone" label="Téléphone (optionnel)" outlined dense />
      </div>
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showAdd = false" />
        <UiButton icon="person_add" label="Inscrire" :loading="saving" @click="ajouter" />
      </template>
    </UiModal>
  </q-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { motion } from 'motion-v'
import { useRoute, useRouter } from 'vue-router'
import { api } from 'src/services/api'
import { getRealtimeSocket } from 'src/services/realtime'
import { useAuthStore } from 'src/stores/auth-store'
import { formatAriary } from 'src/utils/mappers'
import { UiBadge, UiButton, UiCard, UiModal, UiPageHeader } from 'src/components/ui'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const detail = ref({ tournoi: null, participants: [], matchs: [], rounds: 0 })
const loading = ref(false)
const saving = ref(false)
const showAdd = ref(false)
const addForm = ref({ nomJoueur: '', telephone: '' })
const scores = reactive({})

let socket = null
let reloadTimer = null

const canManage = computed(() => ['admin', 'boss'].includes(auth.user?.role))
const isInscriptions = computed(() => detail.value.tournoi?.statut === 'inscriptions')
const champion = computed(() => detail.value.tournoi?.champion_nom || null)
const statutLabel = computed(
  () =>
    ({
      inscriptions: 'Inscriptions',
      en_cours: 'En cours',
      termine: 'Terminé',
      annule: 'Annulé',
    })[detail.value.tournoi?.statut] || '',
)
const statutTone = computed(
  () =>
    ({ inscriptions: 'info', en_cours: 'brand', termine: 'ok', annule: 'danger' })[
      detail.value.tournoi?.statut
    ] || 'neutral',
)

const subtitle = computed(() => {
  if (!detail.value.tournoi) return ''
  if (isInscriptions.value) return 'Inscriptions ouvertes — préparez le tableau.'
  if (detail.value.tournoi.statut === 'termine') return 'Tournoi terminé — retrouvez le parcours complet.'
  return 'Saisissez les scores : le vainqueur monte automatiquement au tour suivant.'
})

const rounds = computed(() => {
  const total = detail.value.rounds || Math.log2(detail.value.tournoi?.taille_tableau || 2)
  const groups = new Map()
  for (const match of detail.value.matchs) {
    if (!groups.has(match.tour)) groups.set(match.tour, [])
    groups.get(match.tour).push(match)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tour, matchs]) => ({
      tour,
      label: roundLabel(tour, total),
      matchs: matchs.sort((a, b) => a.position - b.position),
    }))
})

function roundLabel(tour, total) {
  const remaining = total - tour
  if (remaining === 0) return 'Finale'
  const labels = {
    1: 'Demi-finales',
    2: 'Quarts de finale',
    3: 'Huitièmes de finale',
    4: '16es de finale',
    5: '32es de finale',
  }
  return labels[remaining] || `Tour ${tour}`
}

function seedOf(participantId) {
  if (!participantId) return '·'
  const player = detail.value.participants.find((p) => p.id === participantId)
  return player?.seed ?? '·'
}

function isPlayable(match) {
  return (
    canManage.value &&
    detail.value.tournoi?.statut === 'en_cours' &&
    match.statut === 'a_venir' &&
    match.participant1_id &&
    match.participant2_id
  )
}

function initScores() {
  for (const match of detail.value.matchs) {
    if (match.statut === 'a_venir' && match.participant1_id && match.participant2_id) {
      if (!scores[match.id]) scores[match.id] = { score1: 0, score2: 0 }
    }
  }
}

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

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const data = await api.get(`/tournois/${route.params.id}`)
    detail.value = data
    initScores()
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
    // Un tournoi d'un autre boss (ou supprime) renvoie 404 : on ne laisse pas
    // un tableau vide avec des actions de gestion accessibles.
    if (!silent) router.replace('/tournois')
  } finally {
    loading.value = false
  }
}

function scheduleReload() {
  if (reloadTimer) return
  reloadTimer = setTimeout(() => {
    reloadTimer = null
    load({ silent: true })
  }, 400)
}

function openAdd() {
  addForm.value = { nomJoueur: '', telephone: '' }
  showAdd.value = true
}

async function ajouter() {
  if (!addForm.value.nomJoueur?.trim()) {
    Notify.create({ type: 'warning', message: 'Nom du joueur requis' })
    return
  }
  saving.value = true
  try {
    detail.value = await api.post(`/tournois/${route.params.id}/participants`, addForm.value)
    initScores()
    showAdd.value = false
    Notify.create({ type: 'positive', message: 'Joueur inscrit' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

function retirer(player) {
  Dialog.create({
    title: 'Retirer ce joueur ?',
    message: `${player.nom_joueur} sera retiré des inscriptions.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      detail.value = await api.delete(
        `/tournois/${route.params.id}/participants/${player.id}`,
      )
      initScores()
      Notify.create({ type: 'warning', message: 'Joueur retiré' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

function demarrer() {
  if (detail.value.participants.length < 2) {
    Notify.create({ type: 'warning', message: 'Inscrivez au moins 2 joueurs' })
    return
  }
  Dialog.create({
    title: 'Démarrer le tournoi ?',
    message:
      'Les inscriptions seront closes et le tableau généré. Les exempts sont qualifiés automatiquement.',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    saving.value = true
    try {
      detail.value = await api.post(`/tournois/${route.params.id}/demarrer`, {})
      initScores()
      Notify.create({ type: 'positive', message: 'Tableau généré — que le meilleur gagne !' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    } finally {
      saving.value = false
    }
  })
}

function reinitialiser() {
  Dialog.create({
    title: 'Réinitialiser le tournoi ?',
    message:
      'Tous les scores et le tableau seront effacés. Les joueurs restent inscrits et les inscriptions réouvrent.',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    saving.value = true
    try {
      detail.value = await api.post(`/tournois/${route.params.id}/reinitialiser`, {})
      Object.keys(scores).forEach((key) => delete scores[key])
      initScores()
      Notify.create({ type: 'warning', message: 'Tournoi réinitialisé' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    } finally {
      saving.value = false
    }
  })
}

async function valider(match) {
  const entry = scores[match.id] || { score1: 0, score2: 0 }
  const score1 = Number(entry.score1)
  const score2 = Number(entry.score2)
  if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) {
    Notify.create({ type: 'warning', message: 'Scores invalides (entiers positifs)' })
    return
  }
  if (score1 === score2) {
    Notify.create({ type: 'warning', message: 'Un vainqueur est requis : pas de match nul' })
    return
  }
  saving.value = true
  try {
    const data = await api.post(
      `/tournois/${route.params.id}/matchs/${match.id}/resultat`,
      { score1, score2 },
    )
    detail.value = data
    initScores()
    if (data.championAtteint) {
      Notify.create({
        type: 'positive',
        icon: 'emoji_events',
        message: `Champion : ${data.tournoi.champion_nom} !`,
        timeout: 8000,
      })
    } else {
      Notify.create({ type: 'positive', message: 'Résultat enregistré' })
    }
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await load()
  socket = getRealtimeSocket(auth.token)
  if (socket) socket.on('tournoi:changed', scheduleReload)
})

onUnmounted(() => {
  if (reloadTimer) clearTimeout(reloadTimer)
  if (socket) socket.off('tournoi:changed', scheduleReload)
})
</script>

<style scoped>
.tournoi-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
  padding: 10px 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--line-soft);
  background: var(--surface-hover);
  font-size: 12.5px;
  color: var(--text-2);
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.meta-item :deep(.q-icon) {
  color: var(--text-3);
}
.champion-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  margin-bottom: 20px;
  border-radius: var(--r-xl);
  border: 1px solid rgba(245, 181, 68, 0.3);
  background:
    radial-gradient(100% 160% at 0% 0%, rgba(245, 181, 68, 0.2), transparent 55%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
  box-shadow: 0 18px 44px -30px rgba(245, 181, 68, 0.6);
}
.champion-trophy {
  flex: none;
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #2a1c00;
  background: linear-gradient(150deg, #ffe08a, #f5b544);
  box-shadow: 0 10px 24px -12px rgba(245, 181, 68, 0.8);
}
.champion-eyebrow {
  font-size: 10px;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: var(--warn);
}
.champion-name {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-1);
}
.champion-sub {
  font-size: 12px;
  color: var(--text-3);
}
.tournoi-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.tournoi-side {
  position: sticky;
  top: calc(var(--topbar-h) + 14px);
}
.player-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}
.player-list li {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 6px;
  border-radius: var(--r-sm);
  border-bottom: 1px solid var(--line-soft);
  font-size: 12.5px;
}
.player-list li:last-child {
  border-bottom: none;
}
.player-list li.eliminated {
  opacity: 0.52;
}
.player-list li.champion {
  background: rgba(245, 181, 68, 0.08);
}
.seed {
  flex: none;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: var(--surface-3);
  color: var(--text-3);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.player-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-1);
}
.player-flag {
  flex: none;
  font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.player-flag.is-ok {
  color: var(--ok);
}
.player-flag.is-gold {
  color: var(--warn);
}
.empty-players {
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 20px 8px;
  text-align: center;
  color: var(--text-3);
}
.empty-players p {
  margin: 0;
  font-size: 12.5px;
}
.bracket-note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 12px;
  padding: 9px 11px;
  border-radius: var(--r-sm);
  background: var(--surface-hover);
  color: var(--text-3);
  font-size: 11.5px;
  line-height: 1.5;
}
.rules {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 7px;
  font-size: 12px;
  color: var(--text-2);
}
.rules li {
  display: flex;
  gap: 7px;
  align-items: flex-start;
}
.rules :deep(.q-icon) {
  color: var(--ok);
  margin-top: 2px;
}
.tournoi-bracket-wrap {
  min-width: 0;
}
.bracket-empty {
  display: grid;
  place-items: center;
  gap: 10px;
  padding: clamp(28px, 6vw, 64px) 20px;
  text-align: center;
  border-radius: var(--r-xl);
  border: 1px dashed var(--line);
  background: var(--surface-hover);
  color: var(--text-3);
}
.bracket-empty h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 17px;
  color: var(--text-1);
}
.bracket-empty p {
  margin: 0;
  max-width: 42ch;
  font-size: 12.5px;
  line-height: 1.6;
}
.bracket-scroll {
  overflow-x: auto;
  padding-bottom: 10px;
}
.bracket {
  display: flex;
  gap: 18px;
  min-width: max-content;
}
.bracket-round {
  width: 226px;
  flex: none;
}
.bracket-round__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 0 4px 10px;
  border-bottom: 1px solid var(--line-soft);
  margin-bottom: 12px;
}
.bracket-round__head span {
  font-family: var(--font-display);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-1);
}
.bracket-round__head small {
  font-size: 10.5px;
  color: var(--text-3);
}
.bracket-round__body {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 12px;
  min-height: 100%;
}
.bracket-match {
  position: relative;
  padding: 6px;
  border-radius: var(--r-md);
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01));
  box-shadow: var(--sh-1);
}
.bracket-match.is-live {
  border-color: rgba(45, 212, 232, 0.4);
  box-shadow: var(--sh-glow);
}
.bracket-match.is-done {
  opacity: 0.95;
}
.bracket-match.is-bye {
  opacity: 0.75;
  border-style: dashed;
}
.bracket-player {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 7px;
  border-radius: 7px;
  font-size: 12px;
  color: var(--text-2);
}
.bracket-player.is-winner {
  color: var(--text-1);
  background: rgba(61, 220, 151, 0.07);
  font-weight: 600;
}
.bracket-player + .bracket-player {
  border-top: 1px solid var(--line-soft);
}
.bracket-seed {
  flex: none;
  width: 16px;
  text-align: center;
  font-size: 9.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.bracket-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bracket-score {
  flex: none;
  min-width: 18px;
  text-align: right;
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}
.bracket-entry {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 6px 4px;
  border-top: 1px dashed var(--line);
  margin-top: 4px;
}
.bracket-entry :deep(.q-field) {
  width: 44px;
}
.bracket-entry :deep(.q-field__control) {
  min-height: 30px;
  padding: 0 6px;
}
.bracket-entry :deep(.q-field__native) {
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.bracket-vs {
  color: var(--text-3);
  font-size: 12px;
}
.bracket-bye {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  padding: 4px 6px 2px;
  border-top: 1px dashed var(--line-soft);
  font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.bracket-bye.is-winner {
  color: var(--ok);
}
@media (max-width: 980px) {
  .tournoi-layout {
    grid-template-columns: 1fr;
  }
  .tournoi-side {
    position: static;
  }
}
</style>
