<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Mon abonnement"
      subtitle="30 000 Ar par mois — paiement manuel par Mobile Money, activation par l’administrateur."
    >
      <template #actions>
        <UiBadge
          :tone="statusTone"
          :label="billing.statusLabel + (billing.etat?.actif ? ` · ${billing.daysLeft} j` : '')"
        />
        <UiButton
          variant="ghost"
          icon="refresh"
          label="Actualiser"
          :loading="billing.loading"
          @click="refresh"
        />
      </template>
    </UiPageHeader>

    <section class="billing-hero" :class="`is-${statusTone}`">
      <div class="billing-hero__main">
        <div class="billing-eyebrow">
          <q-icon name="workspace_premium" size="16px" />
          ALUKA GAME ZONE · ABONNEMENT
        </div>
        <h1 class="billing-title">
          {{ heroTitle }}<span v-if="billing.isTrial" class="billing-title__accent"> offert</span>
        </h1>
        <p class="billing-lede">{{ heroSubtitle }}</p>

        <div v-if="billing.etat" class="billing-progress">
          <div class="billing-progress__track">
            <motion.div
              class="billing-progress__fill"
              :initial="{ width: 0 }"
              :animate="{ width: `${progress}%` }"
              :transition="{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }"
            />
          </div>
          <div class="billing-progress__legend">
            <span>{{ formatDate(billing.etat.dateDebut) }}</span>
            <span>{{ formatDate(billing.etat.dateFin) }}</span>
          </div>
        </div>
      </div>

      <div class="billing-price">
        <div class="billing-price__label">Formule mensuelle</div>
        <div class="billing-price__value">30 000 <small>Ar</small></div>
        <div class="billing-price__period">par mois, sans engagement</div>
        <div class="billing-price__sep" />
        <div class="billing-price__row">
          <span>Échéance</span>
          <strong>{{ billing.etat?.dateFin ? formatDate(billing.etat.dateFin) : '—' }}</strong>
        </div>
        <div class="billing-price__row">
          <span>Jours restants</span>
          <strong>{{ billing.isExpired ? 0 : billing.daysLeft }}</strong>
        </div>
        <div v-if="pendingDemande" class="billing-price__pending">
          <q-icon name="hourglass_top" size="15px" />
          En attente de validation
        </div>
      </div>
    </section>

    <q-banner
      v-if="billing.isExpired"
      dense
      rounded
      class="q-mb-md"
      style="background: var(--danger-soft); color: var(--text-1)"
    >
      <template #avatar><q-icon name="lock_clock" style="color: var(--danger)" /></template>
      Votre abonnement a expiré : les opérations de caisse sont bloquées. Déclarez votre paiement
      ci-dessous puis demandez l’activation.
    </q-banner>

    <div class="ui-grid ui-grid--split billing-grid">
      <section class="stack">
        <UiCard title="Payer par Mobile Money" hint="Le paiement est manuel : aucun prélèvement automatique.">
          <ol class="billing-steps">
            <li>
              <span class="step-num">1</span>
              <div>
                <strong>Envoyez 30 000 Ar</strong>
                <p>Sur l’un des deux numéros, au nom du bénéficiaire ci-dessous.</p>
              </div>
            </li>
            <li>
              <span class="step-num">2</span>
              <div>
                <strong>Conservez la référence</strong>
                <p>La référence de transaction (ex. MP251031.1234.A56789) est votre preuve de paiement.</p>
              </div>
            </li>
            <li>
              <span class="step-num">3</span>
              <div>
                <strong>Déclarez-la ici</strong>
                <p>L’administrateur vérifie puis active 30 jours sur votre compte.</p>
              </div>
            </li>
          </ol>

          <div class="billing-beneficiary">
            <div>
              <span class="label">Bénéficiaire</span>
              <strong>{{ billing.infos?.beneficiaire || 'RANAIVO Andry Ny Avo Onenantsoa' }}</strong>
            </div>
            <div>
              <span class="label">Montant</span>
              <strong>{{ formatAriary(billing.infos?.montant || 30000) }}</strong>
            </div>
          </div>

          <div class="billing-numbers">
            <button
              v-for="numero in billing.infos?.numeros || defaultNumeros"
              :key="numero.numero"
              type="button"
              class="billing-number"
              @click="copyNumero(numero.numero)"
            >
              <span class="billing-number__network">{{ numero.reseau }}</span>
              <span class="billing-number__value">{{ numero.numero }}</span>
              <span class="billing-number__copy">
                <q-icon name="content_copy" size="15px" />
                Copier
              </span>
            </button>
          </div>

          <q-separator class="q-my-md" />

          <div v-if="pendingDemande" class="billing-pending">
            <q-icon name="hourglass_top" size="22px" />
            <div>
              <strong>Demande en attente de validation</strong>
              <p>
                Référence <span class="num">{{ pendingDemande.reference }}</span> déclarée le
                {{ formatDate(pendingDemande.date_paiement) }}. L’activation est faite par
                l’administrateur après vérification.
              </p>
            </div>
          </div>

          <q-form v-else class="billing-form" @submit.prevent="submit">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-7">
                <q-input
                  v-model="form.reference"
                  label="Référence du paiement"
                  placeholder="MP251031.1234.A56789"
                  outlined
                  dense
                  :rules="[(v) => (v && v.trim().length >= 4) || 'Référence requise']"
                />
              </div>
              <div class="col-12 col-sm-5">
                <q-input
                  v-model="form.telephonePayeur"
                  label="Numéro payeur"
                  placeholder="034 12 345 67"
                  outlined
                  dense
                />
              </div>
              <div class="col-6 col-sm-5">
                <q-input
                  v-model="form.datePaiement"
                  type="date"
                  label="Date du paiement"
                  outlined
                  stack-label
                  dense
                />
              </div>
              <div class="col-6 col-sm-7">
                <q-input v-model="form.note" label="Note (optionnel)" outlined dense />
              </div>
            </div>
            <div class="row items-center q-mt-sm">
              <span class="billing-form__hint">
                <q-icon name="verified_user" size="14px" />
                Vérification manuelle sous 24 h ouvrées.
              </span>
              <span class="spacer" />
              <UiButton
                type="submit"
                icon="send"
                label="Déclarer le paiement"
                :loading="submitting"
              />
            </div>
          </q-form>
        </UiCard>

        <UiCard
          v-if="billing.notifications.length"
          title="Notifications"
          hint="Relances automatiques d’échéance et confirmations."
        >
          <template #actions>
            <UiButton
              v-if="billing.nonLues"
              variant="ghost"
              size="sm"
              label="Tout marquer lu"
              @click="billing.markAllRead()"
            />
          </template>
          <ul class="billing-notifications">
            <li
              v-for="notification in billing.notifications"
              :key="notification.id"
              :class="{ unread: !notification.lu }"
            >
              <span class="dot" />
              <div>
                <p>{{ notification.message }}</p>
                <span>{{ formatDateTime(notification.created_at) }}</span>
              </div>
            </li>
          </ul>
        </UiCard>
      </section>

      <section class="stack">
        <UiCard title="Historique des paiements" hint="Vos déclarations et leur traitement.">
          <UiTable
            :rows="billing.demandes"
            :columns="demandeColumns"
            row-key="id"
            :pagination="{ rowsPerPage: 6 }"
            empty-icon="receipt_long"
            empty-title="Aucune déclaration"
            empty-text="Déclarez votre premier paiement Mobile Money."
          >
            <template #body-cell-created_at="props">
              <q-td>{{ formatDate(props.row.created_at) }}</q-td>
            </template>
            <template #body-cell-montant="props">
              <q-td><span class="num">{{ formatAriary(props.row.montant) }}</span></q-td>
            </template>
            <template #body-cell-statut="props">
              <q-td>
                <UiBadge :tone="demandeTone(props.row.statut)" :label="demandeLabel(props.row.statut)" />
              </q-td>
            </template>
          </UiTable>
        </UiCard>

        <UiCard title="Périodes d’abonnement" hint="Essai gratuit puis périodes activées.">
          <UiTable
            :rows="billing.historique"
            :columns="historiqueColumns"
            row-key="id"
            :pagination="{ rowsPerPage: 5 }"
            empty-icon="card_membership"
            empty-title="Aucune période"
            empty-text="Votre essai gratuit démarre à la création du compte."
          >
            <template #body-cell-periode="props">
              <q-td>
                <div>{{ formatDate(props.row.date_debut) }}</div>
                <div class="cell-sub">au {{ formatDate(props.row.date_fin) }}</div>
              </q-td>
            </template>
            <template #body-cell-source="props">
              <q-td>
                <UiBadge
                  :tone="props.row.source === 'essai' ? 'info' : 'ok'"
                  :label="sourceLabel(props.row.source)"
                />
              </q-td>
            </template>
            <template #body-cell-montant="props">
              <q-td><span class="num">{{ formatAriary(props.row.montant) }}</span></q-td>
            </template>
          </UiTable>
        </UiCard>

        <UiCard>
          <div class="billing-help">
            <q-icon name="support_agent" size="24px" />
            <div>
              <strong>Un problème de paiement ?</strong>
              <p>
                Contactez l’administrateur avec votre référence de transaction. Aucun accès n’est
                coupé avant la fin de la période payée.
              </p>
            </div>
          </div>
        </UiCard>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { motion } from 'motion-v'
import { useBillingStore } from 'src/stores/billing-store'
import { formatAriary } from 'src/utils/mappers'
import { UiBadge, UiButton, UiCard, UiPageHeader, UiTable } from 'src/components/ui'

const billing = useBillingStore()

const defaultNumeros = [
  { numero: '0389145273', reseau: 'Orange Money' },
  { numero: '0375441549', reseau: 'MVola / Orange Money' },
]

const today = new Date().toISOString().slice(0, 10)
const form = ref({
  reference: '',
  telephonePayeur: '',
  datePaiement: today,
  note: '',
})
const submitting = ref(false)

const pendingDemande = computed(
  () => billing.demandes.find((demande) => demande.statut === 'en_attente') || null,
)

const statusTone = computed(() => {
  if (billing.isExpired) return 'danger'
  if (billing.isTrial) return 'info'
  if (billing.daysLeft <= 3) return 'warn'
  return 'ok'
})

const heroTitle = computed(() => {
  if (billing.isExpired) return 'Abonnement expiré'
  if (billing.isTrial) return 'Essai gratuit'
  return 'Abonnement actif'
})

const heroSubtitle = computed(() => {
  if (billing.isExpired) {
    return 'Vos opérations sont suspendues. Réglez 30 000 Ar puis déclarez votre référence pour rétablir immédiatement l’accès.'
  }
  if (billing.isTrial) {
    return `Profitez de toutes les fonctionnalités jusqu’au ${formatDate(billing.etat?.dateFin)}. Activez ensuite votre abonnement mensuel.`
  }
  return `Votre accès est actif jusqu’au ${formatDate(billing.etat?.dateFin)}. Renouvelez à tout moment, la période s’ajoute automatiquement.`
})

const progress = computed(() => {
  const etat = billing.etat
  if (!etat?.dateDebut || !etat?.dateFin || billing.isExpired) return 0
  const start = new Date(etat.dateDebut).getTime()
  const end = new Date(etat.dateFin).getTime()
  const total = Math.max(1, Math.round((end - start) / 86400000) + 1)
  const remaining = Math.max(0, billing.daysLeft + 1)
  return Math.min(100, Math.round((remaining / total) * 100))
})

const demandeColumns = [
  { name: 'created_at', label: 'Déclarée le', field: 'created_at', align: 'left' },
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' },
  { name: 'montant', label: 'Montant', field: 'montant', align: 'right' },
  { name: 'statut', label: 'Statut', field: 'statut', align: 'left' },
]

const historiqueColumns = [
  { name: 'periode', label: 'Période', field: 'date_debut', align: 'left' },
  { name: 'source', label: 'Type', field: 'source', align: 'left' },
  { name: 'montant', label: 'Montant', field: 'montant', align: 'right' },
]

const demandeTone = (statut) =>
  ({ en_attente: 'warn', validee: 'ok', refusee: 'danger' })[statut] || 'neutral'
const demandeLabel = (statut) =>
  ({ en_attente: 'En attente', validee: 'Validée', refusee: 'Refusée' })[statut] || statut
const sourceLabel = (source) =>
  ({ essai: 'Essai', mobile_money: 'Mobile Money', manuel: 'Manuel', admin: 'Admin' })[source] ||
  source ||
  '—'

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

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function refresh() {
  await billing.load()
}

async function copyNumero(numero) {
  try {
    await navigator.clipboard.writeText(numero)
    Notify.create({ type: 'positive', message: `Numéro ${numero} copié` })
  } catch {
    Notify.create({ type: 'info', message: `Numéro : ${numero}` })
  }
}

async function submit() {
  if (!form.value.reference || form.value.reference.trim().length < 4) {
    Notify.create({ type: 'warning', message: 'Renseignez la référence du paiement' })
    return
  }
  submitting.value = true
  try {
    await billing.submitDemande({ ...form.value })
    form.value = { reference: '', telephonePayeur: '', datePaiement: today, note: '' }
    Notify.create({
      type: 'positive',
      icon: 'send',
      message: 'Paiement déclaré — l’administrateur va le vérifier.',
    })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    submitting.value = false
  }
}

onMounted(() => billing.load())
</script>

<style scoped>
.billing-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: clamp(18px, 3vw, 38px);
  padding: clamp(20px, 3vw, 34px);
  margin-bottom: 20px;
  border-radius: var(--r-xl);
  border: 1px solid var(--line);
  background:
    radial-gradient(120% 160% at 0% 0%, rgba(45, 212, 232, 0.14), transparent 55%),
    radial-gradient(90% 140% at 100% 0%, rgba(124, 107, 255, 0.16), transparent 50%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
  overflow: hidden;
}
.billing-hero::after {
  content: '';
  position: absolute;
  inset: auto -60px -120px auto;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 212, 232, 0.14), transparent 65%);
  pointer-events: none;
}
.billing-hero.is-danger {
  background:
    radial-gradient(120% 160% at 0% 0%, rgba(255, 107, 107, 0.16), transparent 55%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
}
.billing-eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10.5px;
  letter-spacing: 0.14em;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
}
.billing-title {
  margin: 10px 0 6px;
  font-family: var(--font-display);
  font-size: clamp(28px, 3.4vw, 40px);
  line-height: 1.08;
  letter-spacing: -0.03em;
  font-weight: 600;
  color: var(--text-1);
}
.billing-title__accent {
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.billing-lede {
  margin: 0;
  max-width: 62ch;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-2);
}
.billing-progress {
  margin-top: 22px;
  max-width: 520px;
}
.billing-progress__track {
  height: 8px;
  border-radius: var(--r-pill);
  background: rgba(148, 163, 184, 0.16);
  overflow: hidden;
}
.billing-progress__fill {
  height: 100%;
  border-radius: inherit;
  background: var(--brand-gradient);
  box-shadow: 0 0 18px rgba(45, 212, 232, 0.45);
}
.is-danger .billing-progress__fill {
  background: linear-gradient(90deg, var(--danger), #ff9d6b);
  box-shadow: none;
}
.billing-progress__legend {
  display: flex;
  justify-content: space-between;
  margin-top: 7px;
  font-size: 11px;
  color: var(--text-3);
}
.billing-price {
  align-self: center;
  padding: 18px 20px;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: rgba(5, 9, 17, 0.34);
  backdrop-filter: blur(8px);
}
:global(body.theme-light) .billing-price {
  background: rgba(255, 255, 255, 0.72);
}
.billing-price__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-3);
}
.billing-price__value {
  margin-top: 6px;
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--text-1);
}
.billing-price__value small {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
}
.billing-price__period {
  font-size: 11.5px;
  color: var(--text-3);
}
.billing-price__sep {
  height: 1px;
  margin: 14px 0;
  background: var(--line-soft);
}
.billing-price__row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
  font-size: 12.5px;
  color: var(--text-2);
}
.billing-price__row strong {
  color: var(--text-1);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.billing-price__pending {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 7px 9px;
  border-radius: var(--r-sm);
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 11.5px;
  font-weight: 600;
}
.billing-grid {
  align-items: start;
}
.billing-steps {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: grid;
  gap: 12px;
}
.billing-steps li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.step-num {
  flex: none;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11.5px;
  font-weight: 700;
}
.billing-steps strong {
  display: block;
  font-size: 13px;
  color: var(--text-1);
}
.billing-steps p {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}
.billing-beneficiary {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--line-soft);
  background: var(--surface-hover);
}
.billing-beneficiary .label {
  display: block;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-3);
}
.billing-beneficiary strong {
  font-size: 13px;
  color: var(--text-1);
}
.billing-numbers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.billing-number {
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
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}
.billing-number:hover {
  transform: translateY(-2px);
  border-color: var(--brand);
  box-shadow: var(--sh-glow);
}
.billing-number__network {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-3);
}
.billing-number__value {
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.02em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}
.billing-number__copy {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--brand);
}
.billing-form__hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--text-3);
}
.billing-pending {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: var(--r-md);
  background: var(--warn-soft);
  color: var(--text-1);
}
.billing-pending > :deep(.q-icon) {
  color: var(--warn);
}
.billing-pending strong {
  font-size: 13px;
}
.billing-pending p {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-2);
}
.billing-notifications {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}
.billing-notifications li {
  display: flex;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--line-soft);
}
.billing-notifications li:last-child {
  border-bottom: none;
}
.billing-notifications .dot {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--line-strong);
}
.billing-notifications li.unread .dot {
  background: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}
.billing-notifications p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-1);
}
.billing-notifications span {
  font-size: 11px;
  color: var(--text-3);
}
.billing-help {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.billing-help > :deep(.q-icon) {
  color: var(--brand);
}
.billing-help strong {
  font-size: 13px;
}
.billing-help p {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-3);
}
.cell-sub {
  font-size: 11px;
  color: var(--text-3);
}
@media (max-width: 900px) {
  .billing-hero {
    grid-template-columns: 1fr;
  }
  .billing-price {
    align-self: stretch;
  }
}
</style>
