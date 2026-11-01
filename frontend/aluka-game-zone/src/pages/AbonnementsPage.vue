<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Abonnements SaaS"
      subtitle="Essais gratuits, paiements Mobile Money déclarés par les boss et activation manuelle de 30 jours."
    >
      <template #actions>
        <UiBadge v-if="data.stats.enAttente" tone="warn" :label="`${data.stats.enAttente} à valider`" />
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="load" />
      </template>
    </UiPageHeader>

    <section class="ui-grid ui-grid--stats q-mb-lg">
      <UiStatCard
        label="Revenus du mois"
        icon="paid"
        :value="data.stats.revenusMois"
        money
        tone="ok"
        hint="Abonnements encaissés"
      />
      <UiStatCard
        label="Abonnés actifs"
        icon="verified_user"
        :value="data.stats.actifs"
        :suffix="`/ ${data.stats.totalBosses}`"
        tone="brand"
        hint="Tous essais inclus"
        :delay="0.06"
      />
      <UiStatCard
        label="Essais en cours"
        icon="card_giftcard"
        :value="data.stats.essais"
        tone="info"
        hint="7 jours offerts"
        :delay="0.12"
      />
      <UiStatCard
        label="Expirés"
        icon="lock_clock"
        :value="data.stats.expires"
        tone="danger"
        hint="Accès suspendu"
        :delay="0.18"
      />
    </section>

    <UiCard
      title="Paiements à vérifier"
      hint="Le boss a déclaré une référence Mobile Money. Vérifiez l’encaissement puis activez 30 jours."
      class="q-mb-lg pending-card"
    >
      <template #actions>
        <UiBadge tone="warn" :label="`${data.stats.enAttente} en attente`" />
      </template>
      <UiTable
        :rows="demandesEnAttente"
        :columns="demandeColumns"
        row-key="id"
        :loading="loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        empty-icon="task_alt"
        empty-title="Aucun paiement en attente"
        empty-text="Les déclarations des boss apparaîtront ici avec leur référence de transaction."
      >
        <template #body-cell-boss="props">
          <q-td>
            <div>{{ props.row.boss_nom }}</div>
            <div class="cell-sub">{{ props.row.username }}</div>
          </q-td>
        </template>
        <template #body-cell-montant="props">
          <q-td><span class="num">{{ formatAriary(props.row.montant) }}</span></q-td>
        </template>
        <template #body-cell-date_paiement="props">
          <q-td>
            <div>{{ formatDate(props.row.date_paiement) }}</div>
            <div class="cell-sub">{{ props.row.telephone_payeur || '—' }}</div>
          </q-td>
        </template>
        <template #body-cell-reference="props">
          <q-td>
            <button type="button" class="reference-chip" @click="copyReference(props.row.reference)">
              {{ props.row.reference }}
              <q-icon name="content_copy" size="13px" />
            </button>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td>
            <div class="row-tight" style="justify-content: center">
              <UiButton
                icon="check"
                size="sm"
                label="Valider 30 j"
                @click="valider(props.row)"
              />
              <UiButton
                variant="ghost"
                size="sm"
                icon="close"
                label="Refuser"
                @click="refuser(props.row)"
              />
            </div>
          </q-td>
        </template>
      </UiTable>
    </UiCard>

    <div class="ui-grid ui-grid--split q-mb-lg">
      <UiCard title="Encaisser un paiement" hint="Numéros de la plateforme communiqués aux boss.">
        <div class="pay-grid">
          <button
            v-for="numero in data.infos.numeros"
            :key="numero.numero"
            type="button"
            class="pay-number"
            @click="copyReference(numero.numero)"
          >
            <span class="pay-number__network">{{ numero.reseau }}</span>
            <strong>{{ numero.numero }}</strong>
            <span class="pay-number__copy"><q-icon name="content_copy" size="13px" /> Copier</span>
          </button>
        </div>
        <div class="pay-meta">
          <span>Bénéficiaire</span>
          <strong>{{ data.infos.beneficiaire }}</strong>
          <span>Montant</span>
          <strong>{{ formatAriary(data.infos.montant) }} / mois</strong>
          <span>Durée activée</span>
          <strong>30 jours par paiement</strong>
        </div>
      </UiCard>

      <UiCard title="Activation manuelle" hint="Pour un paiement reçu hors application (geste commercial inclus).">
        <div class="stack" style="--stack-gap: 12px">
          <q-select
            v-model="manual.bossId"
            :options="bossOptions"
            label="Propriétaire"
            outlined
            dense
            emit-value
            map-options
          />
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model.number="manual.montant"
                type="number"
                label="Montant"
                suffix="Ar"
                outlined
                dense
              />
            </div>
            <div class="col-6">
              <q-input v-model="manual.commentaire" label="Motif" outlined dense />
            </div>
          </div>
          <UiButton
            icon="workspace_premium"
            label="Activer 30 jours"
            :loading="saving"
            :disable="!manual.bossId"
            @click="activerManuellement"
          />
        </div>
      </UiCard>
    </div>

    <UiCard title="Tous les propriétaires" hint="État de l’abonnement et accès au service.">
      <UiTable
        :rows="data.bosses"
        :columns="bossColumns"
        row-key="boss_id"
        :loading="loading"
        empty-icon="groups"
        empty-title="Aucun propriétaire"
        empty-text="Créez un compte boss pour démarrer son essai gratuit de 7 jours."
      >
        <template #body-cell-boss="props">
          <q-td>
            <div class="row-tight">
              <span class="avatar-xs">{{ initials(props.row.boss_nom) }}</span>
              <div>
                <div>{{ props.row.boss_nom }}</div>
                <div class="cell-sub">{{ props.row.username }}</div>
              </div>
            </div>
          </q-td>
        </template>
        <template #body-cell-statut="props">
          <q-td>
            <UiBadge :tone="statutTone(props.row)" :label="statutLabel(props.row)" />
          </q-td>
        </template>
        <template #body-cell-periode="props">
          <q-td>
            <div v-if="props.row.date_fin">
              jusqu’au {{ formatDate(props.row.date_fin) }}
            </div>
            <div v-else class="cell-sub">Aucune période active</div>
            <div v-if="props.row.reference_paiement" class="cell-sub">
              Réf. {{ props.row.reference_paiement }}
            </div>
          </q-td>
        </template>
        <template #body-cell-jours="props">
          <q-td>
            <span class="num" :style="props.row.jours_restants !== null && props.row.jours_restants <= 3 ? 'color: var(--warn)' : ''">
              {{ joursLabel(props.row) }}
            </span>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td>
            <div class="row-tight" style="justify-content: center">
              <UiButton
                variant="icon"
                icon="workspace_premium"
                tooltip="Activer 30 jours"
                @click="preparerActivation(props.row)"
              />
              <UiButton
                v-if="props.row.actif"
                variant="icon"
                icon="lock"
                tooltip="Bloquer l’accès"
                @click="basculer(props.row, false)"
              />
              <UiButton
                v-else
                variant="icon"
                icon="lock_open"
                tooltip="Débloquer l’accès"
                @click="basculer(props.row, true)"
              />
            </div>
          </q-td>
        </template>
      </UiTable>
    </UiCard>

    <UiModal
      v-model="showActivation"
      title="Activer un abonnement"
      :subtitle="activationTarget ? `${activationTarget.boss_nom} — 30 jours` : ''"
    >
      <div class="stack" style="--stack-gap: 12px">
        <q-input
          v-model.number="activation.montant"
          type="number"
          label="Montant encaissé"
          suffix="Ar"
          outlined
          dense
        />
        <q-input v-model="activation.commentaire" label="Commentaire (optionnel)" outlined dense />
        <div class="muted" style="font-size: 12px">
          La période s’ajoute après la date de fin actuelle si l’abonnement est encore actif.
        </div>
      </div>
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showActivation = false" />
        <UiButton icon="check" label="Activer" :loading="saving" @click="confirmerActivation" />
      </template>
    </UiModal>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { api } from 'src/services/api'
import { formatAriary } from 'src/utils/mappers'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiModal,
  UiPageHeader,
  UiStatCard,
  UiTable,
} from 'src/components/ui'

const loading = ref(false)
const saving = ref(false)
const showActivation = ref(false)
const activationTarget = ref(null)
const manual = ref({ bossId: null, montant: 30000, commentaire: '' })
const activation = ref({ montant: 30000, commentaire: '' })
const data = ref({
  bosses: [],
  demandes: [],
  infos: {
    montant: 30000,
    dureeJours: 30,
    beneficiaire: 'RANAIVO Andry Ny Avo Onenantsoa',
    numeros: [
      { numero: '0389145273', reseau: 'Orange Money' },
      { numero: '0375441549', reseau: 'MVola / Orange Money' },
    ],
  },
  stats: {
    totalBosses: 0,
    actifs: 0,
    essais: 0,
    expires: 0,
    enAttente: 0,
    revenusMois: 0,
    paiementsMois: 0,
  },
})

const demandesEnAttente = computed(() =>
  data.value.demandes.filter((demande) => demande.statut === 'en_attente'),
)
const bossOptions = computed(() =>
  data.value.bosses.map((boss) => ({
    label: `${boss.boss_nom}${boss.jours_restants === null ? ' (expiré)' : ''}`,
    value: boss.boss_id,
  })),
)

const demandeColumns = [
  { name: 'boss', label: 'Propriétaire', field: 'boss_nom', align: 'left' },
  { name: 'reference', label: 'Référence Mobile Money', field: 'reference', align: 'left' },
  { name: 'montant', label: 'Montant', field: 'montant', align: 'right' },
  { name: 'date_paiement', label: 'Paiement', field: 'date_paiement', align: 'left' },
  { name: 'actions', label: 'Décision', field: 'actions', align: 'center' },
]

const bossColumns = [
  { name: 'boss', label: 'Propriétaire', field: 'boss_nom', align: 'left' },
  { name: 'statut', label: 'Statut', field: 'statut', align: 'left' },
  { name: 'periode', label: 'Période', field: 'date_fin', align: 'left' },
  { name: 'jours', label: 'Échéance', field: 'jours_restants', align: 'right' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Indian/Antananarivo',
  }).format(date)
}

const statutLabel = (row) => {
  if (row.jours_restants === null) return 'Expiré'
  if (row.source === 'essai') return 'Essai'
  return 'Actif'
}
const statutTone = (row) => {
  if (row.jours_restants === null) return 'danger'
  if (row.source === 'essai') return 'info'
  if (row.jours_restants <= 3) return 'warn'
  return 'ok'
}
const joursLabel = (row) => {
  if (row.jours_restants === null) return '—'
  if (row.jours_restants === 0) return 'Dernier jour'
  return `${row.jours_restants} j`
}
const initials = (name) =>
  String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

/** `silent` : rechargement apres une action, sans overlay de chargement. */
async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    data.value = await api.get('/abonnements')
    if (!manual.value.bossId && data.value.bosses.length) {
      manual.value.bossId = data.value.bosses[0].boss_id
    }
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    if (!silent) loading.value = false
  }
}

async function copyReference(value) {
  try {
    await navigator.clipboard.writeText(value)
    Notify.create({ type: 'positive', message: 'Copié' })
  } catch {
    Notify.create({ type: 'info', message: value })
  }
}

function valider(demande) {
  Dialog.create({
    title: 'Valider le paiement ?',
    message: `Activer 30 jours pour ${demande.boss_nom} avec la référence ${demande.reference} ? Vérifiez d’abord l’encaissement sur votre compte Mobile Money.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    saving.value = true
    try {
      await api.post(`/abonnements/demandes/${demande.id}/valider`, {})
      await load({ silent: true })
      Notify.create({ type: 'positive', message: 'Abonnement activé pour 30 jours' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    } finally {
      saving.value = false
    }
  })
}

function refuser(demande) {
  Dialog.create({
    title: 'Refuser ce paiement ?',
    message: `Référence ${demande.reference} — ${demande.boss_nom}. Indiquez le motif (visible par le boss).`,
    prompt: { model: '', label: 'Motif du refus', type: 'text' },
    cancel: true,
    persistent: true,
  }).onOk(async (note) => {
    try {
      await api.post(`/abonnements/demandes/${demande.id}/refuser`, { note })
      await load({ silent: true })
      Notify.create({ type: 'warning', message: 'Demande refusée' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

function preparerActivation(boss) {
  activationTarget.value = boss
  activation.value = { montant: 30000, commentaire: '' }
  showActivation.value = true
}

async function confirmerActivation() {
  if (!activationTarget.value) return
  saving.value = true
  try {
    await api.post('/abonnements', {
      bossId: activationTarget.value.boss_id,
      montant: activation.value.montant,
      commentaire: activation.value.commentaire,
    })
    showActivation.value = false
    await load({ silent: true })
    Notify.create({ type: 'positive', message: 'Abonnement activé' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

async function activerManuellement() {
  if (!manual.value.bossId) return
  saving.value = true
  try {
    await api.post('/abonnements', manual.value)
    await load({ silent: true })
    manual.value.commentaire = ''
    Notify.create({ type: 'positive', message: 'Abonnement activé pour 30 jours' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

function basculer(boss, actif) {
  Dialog.create({
    title: actif ? 'Débloquer ce compte ?' : 'Bloquer ce compte ?',
    message: actif
      ? `${boss.boss_nom} pourra à nouveau se connecter.`
      : `${boss.boss_nom} sera déconnecté immédiatement (tokens révoqués).`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.patch(`/abonnements/boss/${boss.boss_id}/blocage`, { actif })
      await load({ silent: true })
      Notify.create({
        type: actif ? 'positive' : 'warning',
        message: actif ? 'Compte débloqué' : 'Compte bloqué',
      })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

onMounted(load)
</script>

<style scoped>
.pending-card {
  border-color: rgba(245, 181, 68, 0.22);
}
.cell-sub {
  font-size: 11px;
  color: var(--text-3);
}
.avatar-xs {
  flex: none;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 10.5px;
  font-weight: 700;
}
.reference-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: var(--r-pill);
  border: 1px dashed var(--line-strong);
  background: transparent;
  color: var(--text-1);
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 11.5px;
  cursor: pointer;
}
.reference-chip:hover {
  border-color: var(--brand);
  color: var(--brand);
}
.pay-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}
.pay-number {
  display: grid;
  gap: 2px;
  padding: 12px 14px;
  text-align: left;
  border-radius: var(--r-md);
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(45, 212, 232, 0.08), rgba(255, 255, 255, 0.01));
  color: inherit;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}
.pay-number:hover {
  transform: translateY(-2px);
  border-color: var(--brand);
}
.pay-number__network {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-3);
}
.pay-number strong {
  font-family: var(--font-display);
  font-size: 17px;
  letter-spacing: 0.02em;
}
.pay-number__copy {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font-size: 10.5px;
  color: var(--brand);
}
.pay-meta {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line-soft);
  font-size: 12px;
}
.pay-meta span {
  color: var(--text-3);
}
.pay-meta strong {
  text-align: right;
  font-weight: 600;
  color: var(--text-1);
}
</style>
